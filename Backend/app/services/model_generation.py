"""Image-to-3D generation with ordered provider fallback."""
import asyncio
import base64
import logging
import mimetypes
import os
import re
import time
from pathlib import Path

import httpx
from bson import ObjectId
from pymongo.asynchronous.database import AsyncDatabase

from app.core.config import settings
from app.core.security import utc_now
from app.services.blender import STORAGE_ROOT

logger = logging.getLogger(__name__)
POLL_SECONDS = 6
MAX_WAIT_SECONDS = 1800
TRIPO_DIAGNOSTIC_HEADERS = {"content-type", "date", "server", "request-id", "x-request-id", "tripo-request-id", "retry-after", "cf-ray"}
MAX_DIAGNOSTIC_BODY_CHARS = 32768


class ProviderResponseError(RuntimeError):
    def __init__(self, diagnostics):
        self.diagnostics = diagnostics
        super().__init__(diagnostics["message"])


def _provider_http_error(provider, response, key, extra_secrets=()):
    """Capture a failed HTTP response without recording request credentials or image data."""
    raw_body = response.text
    body = raw_body
    for secret in (key, *extra_secrets):
        if secret:
            body = body.replace(secret, "[REDACTED]")
    body = re.sub(r"(?i)(Bearer\s+)[^\s\"']+", r"\1[REDACTED]", body)
    body = re.sub(r"(?i)(data:image/[^;,]+;base64,)[A-Za-z0-9+/=]+", r"\1[IMAGE DATA REDACTED]", body)
    truncated = len(body) > MAX_DIAGNOSTIC_BODY_CHARS
    if truncated:
        body = body[:MAX_DIAGNOSTIC_BODY_CHARS] + "...[truncated]"

    headers = {name: response.headers[name] for name in TRIPO_DIAGNOSTIC_HEADERS if name in response.headers}
    try:
        payload = response.json()
    except ValueError:
        payload = {}
    provider_code = None
    provider_message = None
    if isinstance(payload, dict):
        provider_code = payload.get("code") or payload.get("error_code")
        provider_message = payload.get("message") or payload.get("error")
        if isinstance(provider_message, dict):
            provider_message = provider_message.get("message") or provider_message.get("detail")
    provider_message = str(provider_message)[:1000] if provider_message is not None else None
    if provider_message:
        for secret in (key, *extra_secrets):
            if secret:
                provider_message = provider_message.replace(secret, "[REDACTED]")
        provider_message = re.sub(r"(?i)(Bearer\s+)[^\s\"']+", r"\1[REDACTED]", provider_message)
    request_id = (payload.get("request_id") or payload.get("requestId")) if isinstance(payload, dict) else None
    request_id = request_id or headers.get("request-id") or headers.get("x-request-id") or headers.get("tripo-request-id")
    message = f"{provider} returned HTTP {response.status_code}"
    if provider_code is not None:
        message += f" (provider code {provider_code})"
    if provider_message:
        message += f": {provider_message}"
    if request_id:
        message += f" (request_id={request_id})"
    diagnostics = {
        "provider": provider,
        "statusCode": response.status_code,
        "requestId": request_id,
        "providerCode": provider_code,
        "providerMessage": provider_message,
        "headers": headers,
        "body": body,
        "bodyTruncated": truncated,
        "message": message,
    }
    logger.error(
        "%s HTTP response status=%s request_id=%s provider_code=%s provider_message=%s headers=%s body=%s",
        provider, response.status_code, request_id or "unavailable", provider_code,
        provider_message or "unavailable", headers, body,
    )
    return ProviderResponseError(diagnostics)


def _http_failure(provider, exc, key):
    if isinstance(exc, ProviderResponseError):
        return exc.diagnostics
    response = getattr(exc, "response", None)
    if response is None:
        return {"provider": provider, "message": f"{type(exc).__name__}: {str(exc)[:1000]}"}
    body = response.text.replace(key, "[REDACTED]") if key else response.text
    headers = {name: response.headers[name] for name in TRIPO_DIAGNOSTIC_HEADERS if name in response.headers}
    try:
        payload = response.json()
    except ValueError:
        payload = {}
    request_id = payload.get("request_id") if isinstance(payload, dict) else None
    request_id = request_id or headers.get("request-id") or headers.get("x-request-id") or headers.get("tripo-request-id")
    return {"provider": provider, "statusCode": response.status_code, "requestId": request_id, "headers": headers, "body": body, "message": f"{provider} returned HTTP {response.status_code}; request_id={request_id or 'unavailable'}; body={body[:4000]}"}


async def _finish(db, job_id, status, output=None, error=None, progress=100):
    now = utc_now()
    changes = {"status": status, "progress": progress, "completedAt": now, "updatedAt": now}
    if output is not None:
        changes["output"] = output
    if error is not None:
        changes["error"] = error
    await db.jobs.update_one({"_id": job_id, "status": {"$ne": "cancelled"}}, {"$set": changes})
    job = await db.jobs.find_one({"_id": job_id})
    if job and job.get("status") != "cancelled":
        await db.workflowStages.update_one({"projectId": job["projectId"], "stageName": "model_generation"}, {"$set": {"status": status, "updatedAt": now}})


async def _cancelled(db, job_id):
    job = await db.jobs.find_one({"_id": job_id}, {"status": 1})
    return not job or job.get("status") == "cancelled"


async def _progress(db, job_id, provider, value, provider_task_id=None):
    changes = {"status": "processing", "progress": min(95, value), "provider": provider, "updatedAt": utc_now()}
    if provider_task_id:
        changes["providerTaskId"] = provider_task_id
    await db.jobs.update_one({"_id": job_id, "status": {"$ne": "cancelled"}}, {"$set": changes})


async def _meshy(client, key, data, mime, tick):
    headers = {"Authorization": f"Bearer {key}"}
    uri = f"data:{mime};base64,{base64.b64encode(data).decode('ascii')}"
    r = await client.post("https://api.meshy.ai/openapi/v1/image-to-3d", headers=headers, json={"image_url": uri, "ai_model": "meshy-7.1", "target_formats": ["glb"]})
    r.raise_for_status()
    task_id = r.json().get("result")
    if not task_id:
        raise RuntimeError("Meshy did not return a task ID")
    deadline = time.monotonic() + MAX_WAIT_SECONDS
    while time.monotonic() < deadline:
        await asyncio.sleep(POLL_SECONDS)
        r = await client.get(f"https://api.meshy.ai/openapi/v1/image-to-3d/{task_id}", headers=headers)
        r.raise_for_status()
        task = r.json()
        await tick("meshy", int(task.get("progress", 0)), task_id)
        state = str(task.get("status", "")).upper()
        if state == "SUCCEEDED":
            url = task.get("model_urls", {}).get("glb")
            if url:
                return url, task_id
            raise RuntimeError("Meshy completed without a GLB")
        if state in {"FAILED", "CANCELED", "CANCELLED"}:
            raise RuntimeError(str(task.get("task_error") or f"Meshy {state.lower()}"))
    raise TimeoutError("Meshy generation timed out")


async def _tripo(client, key, data, filename, mime, tick):
    headers = {"Authorization": f"Bearer {key}"}
    r = await client.post("https://openapi.tripo3d.ai/v3/files", headers=headers, files={"file": (filename, data, mime)})
    if r.is_error:
        raise _provider_http_error("tripo", r, key)
    token = r.json().get("data", {}).get("file_token")
    if not token:
        raise RuntimeError("Tripo did not return a file token")
    r = await client.post("https://openapi.tripo3d.ai/v3/generation/image-to-model", headers=headers, json={"input": token, "model": "v3.1-20260211", "texture": True, "pbr": True, "texture_quality": "standard"})
    if r.is_error:
        raise _provider_http_error("tripo", r, key, (token,))
    task_id = r.json().get("data", {}).get("task_id")
    if not task_id:
        raise RuntimeError("Tripo did not return a task ID")
    deadline = time.monotonic() + MAX_WAIT_SECONDS
    while time.monotonic() < deadline:
        await asyncio.sleep(POLL_SECONDS)
        r = await client.get(f"https://openapi.tripo3d.ai/v3/tasks/{task_id}", headers=headers)
        if r.is_error:
            raise _provider_http_error("tripo", r, key, (token, task_id))
        task = r.json().get("data", {})
        await tick("tripo", int(task.get("progress", 0)), task_id)
        state = str(task.get("status", "")).lower()
        if state == "success":
            url = task.get("output", {}).get("model_url")
            if url:
                return url, task_id
            raise RuntimeError("Tripo completed without a model URL")
        if state in {"failed", "cancelled", "banned", "expired"}:
            raise RuntimeError(str(task.get("error_message") or f"Tripo {state}"))
    raise TimeoutError("Tripo generation timed out")


async def _rodin(client, key, data, filename, mime, tick):
    headers = {"Authorization": f"Bearer {key}"}
    r = await client.post("https://api.hyper3d.com/api/v2/rodin", headers=headers, files={"images": (filename, data, mime)}, data={"tier": settings.rodin_tier, "mesh_mode": "Raw", "quality": "medium", "geometry_file_format": "glb"})
    r.raise_for_status()
    result = r.json()
    task_id = result.get("uuid")
    subscription = result.get("jobs", {}).get("subscription_key")
    if not task_id or not subscription:
        raise RuntimeError("Rodin did not return task identifiers")
    deadline = time.monotonic() + MAX_WAIT_SECONDS
    delay = 5
    while time.monotonic() < deadline:
        await asyncio.sleep(delay)
        r = await client.post("https://api.hyper3d.com/api/v2/status", headers=headers, json={"subscription_key": subscription})
        r.raise_for_status()
        status = r.json()
        jobs = status.get("jobs", [])
        states = [str(x.get("status", "")).lower() for x in jobs]
        await tick("rodin", max([int(x.get("progress", 0)) for x in jobs] or [0]), task_id)
        if "failed" in states:
            raise RuntimeError(str(status))
        if states and all(x == "done" for x in states):
            r = await client.post("https://api.hyper3d.com/api/v2/download", headers=headers, json={"task_uuid": task_id})
            r.raise_for_status()
            files = r.json().get("list", [])
            model = next((x for x in files if str(x.get("name", "")).lower().endswith(".glb")), None)
            if model and model.get("url"):
                return model["url"], task_id
            raise RuntimeError("Rodin completed without a GLB download")
        delay = min(delay + 5, 30)
    raise TimeoutError("Rodin generation timed out")


async def run_model_generation(db: AsyncDatabase, job_id: str):
    job_oid = ObjectId(job_id)
    job = await db.jobs.find_one({"_id": job_oid})
    if not job:
        return
    now = utc_now()
    await db.jobs.update_one({"_id": job_oid, "status": {"$in": ["queued", "pending"]}}, {"$set": {"status": "processing", "progress": 2, "startedAt": now, "updatedAt": now}})
    await db.workflowStages.update_one({"projectId": job["projectId"], "stageName": "model_generation"}, {"$set": {"status": "processing", "updatedAt": now}})
    payload = job.get("input", {})
    ids = payload.get("referenceAssetIds", [])
    if not ids:
        return await _finish(db, job_oid, "failed", error={"code": "REFERENCE_IMAGE_REQUIRED", "message": "Upload a reference image before generating a model."})
    ref = await db.assets.find_one({"_id": ObjectId(str(ids[0])), "projectId": job["projectId"], "userId": job["userId"], "assetType": "image"})
    if not ref:
        return await _finish(db, job_oid, "failed", error={"code": "REFERENCE_IMAGE_NOT_FOUND", "message": "The reference image was not found in this project."})
    source = (STORAGE_ROOT / ref.get("storageKey", "")).resolve()
    if not source.is_relative_to(STORAGE_ROOT) or not source.is_file():
        return await _finish(db, job_oid, "failed", error={"code": "REFERENCE_IMAGE_UNAVAILABLE", "message": "The reference image file is unavailable."})
    data = source.read_bytes()
    filename = ref.get("fileName", source.name)
    mime = ref.get("mimeType") or mimetypes.guess_type(filename)[0] or "image/png"
    if len(data) > 20 * 1024 * 1024:
        return await _finish(db, job_oid, "failed", error={"code": "REFERENCE_IMAGE_TOO_LARGE", "message": "AI providers accept images up to 20 MB."})
    secrets = {"meshy": settings.meshy_api_key, "tripo": settings.tripo_api_key, "rodin": settings.rodin_api_key}
    keys = {name: secret.get_secret_value() for name, secret in secrets.items() if secret and secret.get_secret_value()}
    order = list(dict.fromkeys(x.strip().lower() for x in settings.model_provider_order.split(",") if x.strip().lower() in keys))
    order.extend(x for x in ("meshy", "tripo", "rodin") if x in keys and x not in order)
    if not order:
        return await _finish(db, job_oid, "failed", error={"code": "MODEL_PROVIDERS_NOT_CONFIGURED", "message": "Set one or more of MESHY_API_KEY, TRIPO_API_KEY, or RODIN_API_KEY in Backend/.env."})

    async def tick(provider, value, provider_task_id):
        if await _cancelled(db, job_oid):
            raise asyncio.CancelledError
        await _progress(db, job_oid, provider, min(90, 8 + order.index(provider) * 27 + int(value * .27)), provider_task_id)

    failures = []
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(90, connect=20)) as client:
            for provider in order:
                if await _cancelled(db, job_oid):
                    return
                await _progress(db, job_oid, provider, 8 + order.index(provider) * 27)
                try:
                    if provider == "meshy":
                        url, task_id = await _meshy(client, keys[provider], data, mime, tick)
                    elif provider == "tripo":
                        url, task_id = await _tripo(client, keys[provider], data, filename, mime, tick)
                    else:
                        url, task_id = await _rodin(client, keys[provider], data, filename, mime, tick)
                    response = await client.get(url)
                    response.raise_for_status()
                    if not response.content.startswith(b"glTF"):
                        raise RuntimeError("Provider returned an invalid GLB")
                    output = STORAGE_ROOT / str(job["userId"]) / str(job["projectId"]) / f"{job_id}.glb"
                    output.parent.mkdir(parents=True, exist_ok=True)
                    output.write_bytes(response.content)
                    asset = {"projectId": job["projectId"], "userId": job["userId"], "characterId": ObjectId(str(payload["characterId"])) if payload.get("characterId") else None, "assetType": "model", "fileName": f"{Path(filename).stem}_generated.glb", "storageKey": str(output.relative_to(STORAGE_ROOT)).replace("\\", "/"), "format": "GLB", "mimeType": "model/gltf-binary", "fileSize": len(response.content), "metadata": {"jobId": job_id, "provider": provider, "providerTaskId": task_id, "sourceAssetId": str(ref["_id"])}, "version": 1, "createdAt": utc_now()}
                    inserted = await db.assets.insert_one(asset)
                    return await _finish(db, job_oid, "completed", output={"assetId": str(inserted.inserted_id), "fileName": asset["fileName"], "format": "GLB", "fileSize": asset["fileSize"], "provider": provider}, progress=100)
                except asyncio.CancelledError:
                    return
                except Exception as exc:
                    failure = _http_failure(provider, exc, keys[provider]) if isinstance(exc, (httpx.HTTPStatusError, ProviderResponseError)) else {"provider": provider, "message": f"{type(exc).__name__}: {str(exc)[:1000]}"}
                    logger.warning("Model provider %s failed for job %s (status=%s, request_id=%s)", provider, job_id, failure.get("statusCode", "n/a"), failure.get("requestId", "unavailable"))
                    failures.append(failure)
        message = "All configured providers failed. " + " | ".join(f"{failure['provider']}: {failure['message']}" for failure in failures)
        await _finish(db, job_oid, "failed", error={"code": "MODEL_GENERATION_FAILED", "message": message[:6000], "providerDiagnostics": failures})
    except Exception as exc:
        logger.exception("Model generation job %s failed", job_id)
        await _finish(db, job_oid, "failed", error={"code": "MODEL_GENERATION_FAILED", "message": str(exc)[:1800]})
