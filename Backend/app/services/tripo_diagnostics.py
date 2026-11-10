"""Safe, non-generative Tripo connectivity diagnostics."""
import json
from pathlib import Path
import hmac

import httpx

from app.core.config import settings

TRIPO_BALANCE_URL = "https://openapi.tripo3d.ai/v3/account/balance"
_RESPONSE_HEADERS = {
    "content-type",
    "date",
    "server",
    "request-id",
    "x-request-id",
    "tripo-request-id",
    "retry-after",
    "www-authenticate",
    "cf-ray",
}


def _tripo_key_file_status(key: str | None) -> dict:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    file_value = None
    if env_path.is_file():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            clean = line.strip()
            if clean.startswith("TRIPO_API_KEY="):
                file_value = clean.split("=", 1)[1].strip().strip("\"'")
                break
    return {
        "settingsKeyLoaded": bool(key),
        "backendEnvFilePresent": env_path.is_file(),
        "backendEnvKeyPresent": bool(file_value),
        "loadedValueMatchesBackendEnv": bool(key and file_value and hmac.compare_digest(key, file_value)),
    }


def _classify(status_code: int, body: str) -> str:
    try:
        payload = json.loads(body)
    except (TypeError, ValueError):
        payload = {}
    code = str(payload.get("code", ""))
    message = str(payload.get("message", body)).lower()
    if status_code in {401} or code in {"2", "1002"}:
        return "invalid_or_missing_api_key"
    if status_code == 402 or code == "2010" or "credit" in message or "billing" in message:
        return "billing_or_insufficient_credits"
    if status_code == 403:
        if "ip" in message or "allowlist" in message or "whitelist" in message:
            return "ip_restriction_reported_by_provider"
        if "permission" in message or "access" in message:
            return "account_or_endpoint_permission"
        return "forbidden_unspecified_check_provider_body_and_request_id"
    if status_code in {404, 405}:
        return "endpoint_or_api_version"
    if 200 <= status_code < 300:
        return "authenticated_account_endpoint_reachable_generation_permission_not_probed"
    return "provider_or_network_error"


async def diagnose_tripo() -> dict:
    secret = settings.tripo_api_key
    key = secret.get_secret_value().strip() if secret else ""
    result = {
        "provider": "tripo",
        "apiVersion": "v3",
        "testedEndpoint": TRIPO_BALANCE_URL,
        "generationEndpoint": "https://openapi.tripo3d.ai/v3/generation/image-to-model",
        "authScheme": "Authorization: Bearer <configured key>",
        **_tripo_key_file_status(key or None),
        "generativeRequestMade": False,
        "httpStatus": None,
        "responseBody": "",
        "responseHeaders": {},
        "requestId": None,
        "classification": "api_key_not_configured",
        "transportError": None,
    }
    if not key:
        return result

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(20, connect=10), follow_redirects=False) as client:
            response = await client.get(TRIPO_BALANCE_URL, headers={"Authorization": f"Bearer {key}"})
        body = response.text
        for name in _RESPONSE_HEADERS:
            if name in response.headers:
                result["responseHeaders"][name] = response.headers[name]
        request_id = result["responseHeaders"].get("request-id") or result["responseHeaders"].get("x-request-id") or result["responseHeaders"].get("tripo-request-id")
        try:
            payload = response.json()
        except ValueError:
            payload = None
        if isinstance(payload, dict):
            request_id = request_id or payload.get("request_id")
            if isinstance(payload.get("data"), dict):
                result["accountBalance"] = payload["data"].get("balance")
                result["frozenCredits"] = payload["data"].get("frozen")
        # Never return a provider response that echoes a configured credential.
        result["responseBody"] = body.replace(key, "[REDACTED]")
        result["httpStatus"] = response.status_code
        result["requestId"] = request_id
        result["classification"] = _classify(response.status_code, body)
        if response.status_code == 200 and result.get("accountBalance") == 0:
            result["classification"] = "valid_key_but_zero_credits_generation_likely_rejected"
    except httpx.HTTPError as exc:
        result["transportError"] = f"{type(exc).__name__}: {str(exc)[:500]}"
        result["classification"] = "transport_or_tls_error"
    return result
