"""Project production APIs: assets, jobs, workflow, scenes, Blender, and metadata."""

import secrets
import json
from pathlib import Path
from typing import Annotated, Any

from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile
from fastapi.responses import FileResponse
from pymongo.asynchronous.database import AsyncDatabase
from redis.asyncio import Redis

from app.core.dependencies import CurrentUser
from app.core.responses import ApiException
from app.core.security import utc_now
from app.db.dependencies import get_db, get_redis
from app.services.blender import STORAGE_ROOT
from app.services.queue import enqueue_job

router = APIRouter(tags=["Production"])
DB = Annotated[AsyncDatabase, Depends(get_db)]
REDIS = Annotated[Redis, Depends(get_redis)]
STAGES = ["image_upload", "image_analysis", "model_generation", "mesh_editing", "materials", "rigging", "animation", "lighting", "rendering", "export"]
STATUS = {"pending", "queued", "processing", "completed", "failed", "cancelled"}
FORMATS = {"BLEND", "GLB", "GLTF", "FBX", "OBJ", "MP4"}
MAX_UPLOAD = 100 * 1024 * 1024


def oid(value: str, kind: str = "RESOURCE") -> ObjectId:
    if not ObjectId.is_valid(value):
        raise ApiException(404, f"{kind}_NOT_FOUND", f"{kind.title()} was not found")
    return ObjectId(value)


async def owned_project(db: AsyncDatabase, project_id: str, user: dict) -> dict:
    project = await db.projects.find_one({"_id": oid(project_id, "PROJECT"), "userId": user["_id"]})
    if project is None:
        raise ApiException(404, "PROJECT_NOT_FOUND", "Project was not found")
    return project


async def resource(db: AsyncDatabase, collection: str, resource_id: str, user: dict) -> dict:
    doc = await getattr(db, collection).find_one({"_id": oid(resource_id), "userId": user["_id"]})
    if doc is None:
        raise ApiException(404, "RESOURCE_NOT_FOUND", "Resource was not found")
    return doc


def public(doc: dict) -> dict:
    from datetime import datetime
    def clean(value: Any) -> Any:
        if isinstance(value, ObjectId):
            return str(value)
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, dict):
            return {key: clean(item) for key, item in value.items() if key not in {"_id", "storageKey", "userId"}}
        if isinstance(value, list):
            return [clean(item) for item in value]
        return value
    result = clean(doc)
    if "_id" in doc:
        result["id"] = str(doc["_id"])
    return result


async def project_docs(db: AsyncDatabase, collection: str, project_id: str, user: dict, extra: dict | None = None) -> list[dict]:
    await owned_project(db, project_id, user)
    cursor = getattr(db, collection).find({"projectId": oid(project_id, "PROJECT"), "userId": user["_id"], **(extra or {})}).sort("createdAt", -1)
    return [public(item) async for item in cursor]


async def create_job(db: AsyncDatabase, user: dict, project: dict, job_type: str, payload: dict, background: BackgroundTasks, blender: bool = False) -> dict:
    now = utc_now()
    job = {"projectId": project["_id"], "userId": user["_id"], "jobType": job_type, "provider": "blender" if blender else "adapter", "status": "queued", "progress": 0, "input": payload, "output": {}, "error": None, "retryCount": 0, "createdAt": now, "updatedAt": now}
    result = await db.jobs.insert_one(job)
    job["_id"] = result.inserted_id
    stage_name = {"render": "rendering", "mesh_validate": "mesh_editing", "mesh_repair": "mesh_editing", "mesh_retopology": "mesh_editing", "mesh_smooth": "mesh_editing", "mesh_optimize": "mesh_editing", "texture_generation": "materials", "rigging_validate": "rigging", "rigging_weight-paint": "rigging", "motion_generation": "animation", "lighting_preview": "lighting"}.get(job_type, job_type)
    if stage_name in STAGES:
        await db.workflowStages.update_one({"projectId": project["_id"], "stageName": stage_name}, {"$set": {"status": "queued", "updatedAt": now}, "$setOnInsert": {"userId": user["_id"], "stageOrder": STAGES.index(stage_name), "inputAssets": [], "outputAssets": [], "configuration": {}, "createdAt": now}}, upsert=True)
    try:
        await enqueue_job(str(result.inserted_id))
    except Exception as exc:
        await db.jobs.update_one({"_id": result.inserted_id}, {"$set": {"status": "failed", "error": {"code": "QUEUE_UNAVAILABLE", "message": "The processing queue is unavailable. Try again shortly."}, "completedAt": utc_now(), "updatedAt": utc_now()}})
        raise ApiException(503, "QUEUE_UNAVAILABLE", "The processing queue is unavailable. Try again shortly.") from exc
    return {"jobId": str(result.inserted_id), "status": "queued", "progress": 0}


def ok(message: str, data: Any) -> dict:
    return {"success": True, "message": message, "data": data}


@router.post("/projects/{project_id}/uploads", status_code=201)
async def upload_project_file(project_id: str, user: CurrentUser, db: DB, file: UploadFile = File(...), character_id: str | None = Form(None)):
    project = await owned_project(db, project_id, user)
    name = Path(file.filename or "upload").name
    ext = Path(name).suffix.lower()
    allowed = {".png", ".jpg", ".jpeg", ".webp", ".glb", ".gltf", ".fbx", ".obj", ".blend", ".mtl", ".mp4", ".exr", ".hdr"}
    if ext not in allowed:
        raise ApiException(422, "UNSUPPORTED_FILE_TYPE", "This file type is not supported")
    content = await file.read(MAX_UPLOAD + 1)
    if len(content) > MAX_UPLOAD:
        raise ApiException(413, "UPLOAD_TOO_LARGE", "Files must be 100 MB or smaller")
    if character_id and not await db.characters.find_one({"_id": oid(character_id, "CHARACTER"), "projectId": project["_id"], "userId": user["_id"]}):
        raise ApiException(404, "CHARACTER_NOT_FOUND", "Character was not found in this project")
    key = f"{user['_id']}/{project['_id']}/{secrets.token_hex(16)}{ext}"
    destination = (STORAGE_ROOT / key).resolve()
    if not destination.is_relative_to(STORAGE_ROOT):
        raise ApiException(400, "INVALID_FILE_PATH", "Invalid upload path")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(content)
    now = utc_now()
    asset_type = "image" if ext in {".png", ".jpg", ".jpeg", ".webp"} else "video" if ext == ".mp4" else "blender_project" if ext == ".blend" else "model"
    asset = {"projectId": project["_id"], "userId": user["_id"], "characterId": oid(character_id, "CHARACTER") if character_id else None, "assetType": asset_type, "fileName": name, "storageKey": key, "format": ext[1:].upper(), "mimeType": file.content_type or "application/octet-stream", "fileSize": len(content), "metadata": {}, "version": 1, "createdAt": now}
    result = await db.assets.insert_one(asset)
    asset["_id"] = result.inserted_id
    return ok("File uploaded", public(asset))


@router.post("/uploads/presigned-url")
async def presigned_upload(body: dict, user: CurrentUser, db: DB, redis: REDIS):
    project = await owned_project(db, str(body.get("projectId", "")), user)
    try:
        size = int(body.get("fileSize", 0))
    except (ValueError, TypeError) as exc:
        raise ApiException(422, "INVALID_FILE_SIZE", "File size must be a number") from exc
    if size < 1 or size > MAX_UPLOAD:
        raise ApiException(422, "INVALID_FILE_SIZE", "File size must be between 1 byte and 100 MB")
    name = Path(str(body.get("fileName", "upload"))).name
    if Path(name).suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp", ".glb", ".gltf", ".fbx", ".obj", ".blend", ".mtl", ".mp4", ".exr", ".hdr"}:
        raise ApiException(422, "UNSUPPORTED_FILE_TYPE", "This file type is not supported")
    token = secrets.token_urlsafe(32)
    await redis.set(f"upload:{token}", json.dumps({"owner": str(user["_id"]), "projectId": str(project["_id"]), "fileName": name, "fileSize": size, "mimeType": str(body.get("mimeType", "application/octet-stream"))}), ex=900)
    return ok("Local signed upload URL created", {"uploadId": token, "uploadUrl": f"/api/v1/uploads/local/{token}", "expiresIn": 900, "method": "PUT"})


@router.put("/uploads/local/{token}")
async def local_signed_upload(token: str, redis: REDIS, file: UploadFile = File(...)):
    upload = await redis.get(f"upload:{token}")
    if not upload:
        raise ApiException(404, "UPLOAD_URL_EXPIRED", "Upload URL is invalid or expired")
    expected = json.loads(upload)
    if Path(Path(file.filename or "upload").name).suffix.lower() != Path(expected["fileName"]).suffix.lower():
        raise ApiException(422, "UPLOAD_FILE_MISMATCH", "The uploaded file type does not match the signed upload")
    content = await file.read(MAX_UPLOAD + 1)
    if len(content) != expected["fileSize"]:
        raise ApiException(413, "UPLOAD_SIZE_MISMATCH", "The uploaded file size does not match the signed upload")
    key = f"incoming/{token}{Path(expected['fileName']).suffix.lower()}"
    target = (STORAGE_ROOT / key).resolve()
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    return ok("Upload received", {"uploadId": token, "fileName": Path(file.filename or "upload").name, "fileSize": len(content)})


@router.post("/uploads/complete", status_code=201)
async def complete_upload(body: dict, user: CurrentUser, db: DB, redis: REDIS):
    token = str(body.get("uploadId", ""))
    upload = await redis.get(f"upload:{token}")
    details = json.loads(upload) if upload else {}
    if details.get("owner") != str(user["_id"]) or details.get("projectId") != str(body.get("projectId", "")):
        raise ApiException(404, "UPLOAD_NOT_FOUND", "Upload was not found or has expired")
    project = await owned_project(db, str(body["projectId"]), user)
    candidates = list((STORAGE_ROOT / "incoming").glob(f"{token}.*"))
    if not candidates:
        raise ApiException(400, "UPLOAD_INCOMPLETE", "Upload the file before completing the upload")
    path = candidates[0]
    now = utc_now()
    asset_type = "image" if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"} else "video" if path.suffix.lower() == ".mp4" else "blender_project" if path.suffix.lower() == ".blend" else "model"
    asset = {"projectId": project["_id"], "userId": user["_id"], "characterId": None, "assetType": asset_type, "fileName": details["fileName"], "storageKey": str(path.relative_to(STORAGE_ROOT)).replace("\\", "/"), "format": path.suffix[1:].upper(), "mimeType": details["mimeType"], "fileSize": path.stat().st_size, "metadata": {}, "version": 1, "createdAt": now}
    result = await db.assets.insert_one(asset)
    await redis.delete(f"upload:{token}")
    asset["_id"] = result.inserted_id
    return ok("Upload completed", public(asset))


@router.get("/assets/{asset_id}")
async def get_asset(asset_id: str, user: CurrentUser, db: DB):
    return ok("Asset loaded", public(await resource(db, "assets", asset_id, user)))


@router.get("/projects/{project_id}/assets")
async def list_project_assets(project_id: str, user: CurrentUser, db: DB, asset_type: str | None = None):
    return ok("Assets loaded", await project_docs(db, "assets", project_id, user, {"assetType": asset_type} if asset_type else None))


@router.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str, user: CurrentUser, db: DB):
    asset = await resource(db, "assets", asset_id, user)
    path = (STORAGE_ROOT / asset.get("storageKey", "")).resolve()
    if path.is_relative_to(STORAGE_ROOT):
        path.unlink(missing_ok=True)
    await db.assets.delete_one({"_id": asset["_id"]})
    return ok("Asset deleted", {})


@router.get("/assets/{asset_id}/download")
async def download_asset(asset_id: str, user: CurrentUser, db: DB):
    asset = await resource(db, "assets", asset_id, user)
    path = (STORAGE_ROOT / asset["storageKey"]).resolve()
    if not path.is_relative_to(STORAGE_ROOT) or not path.is_file():
        raise ApiException(404, "ASSET_FILE_NOT_FOUND", "Asset file was not found")
    return FileResponse(path, filename=asset["fileName"], media_type=asset.get("mimeType", "application/octet-stream"))


@router.post("/projects/{project_id}/analysis", status_code=202)
async def analyze_project(project_id: str, body: dict, background: BackgroundTasks, user: CurrentUser, db: DB):
    job = await create_job(db, user, await owned_project(db, project_id, user), "image_analysis", body, background)
    return ok("Analysis queued", job)


@router.post("/projects/{project_id}/characters", status_code=201)
async def create_character(project_id: str, body: dict, user: CurrentUser, db: DB):
    project = await owned_project(db, project_id, user)
    doc = {**body, "projectId": project["_id"], "userId": user["_id"], "referenceImages": body.get("referenceImages", []), "appearanceDNA": body.get("appearanceDNA", {}), "createdAt": utc_now(), "updatedAt": utc_now()}
    result = await db.characters.insert_one(doc)
    doc["_id"] = result.inserted_id
    return ok("Character created", public(doc))


@router.get("/projects/{project_id}/characters")
async def list_characters(project_id: str, user: CurrentUser, db: DB):
    return ok("Characters loaded", await project_docs(db, "characters", project_id, user))


@router.get("/characters/{character_id}")
async def get_character(character_id: str, user: CurrentUser, db: DB):
    return ok("Character loaded", public(await resource(db, "characters", character_id, user)))


@router.patch("/characters/{character_id}")
async def update_character(character_id: str, body: dict, user: CurrentUser, db: DB):
    character = await resource(db, "characters", character_id, user)
    changes = {key: value for key, value in body.items() if key in {"name", "characterType", "appearanceDNA", "colorPalette", "proportions", "referenceImages"}}
    if "referenceImages" in changes:
        reference_ids = changes["referenceImages"]
        if not isinstance(reference_ids, list) or any(not ObjectId.is_valid(str(asset_id)) for asset_id in reference_ids):
            raise ApiException(422, "INVALID_REFERENCE_ASSETS", "referenceImages must contain asset IDs")
        asset_oids = [ObjectId(str(asset_id)) for asset_id in reference_ids]
        owned_count = await db.assets.count_documents({"_id": {"$in": asset_oids}, "projectId": character["projectId"], "userId": user["_id"], "assetType": "image"})
        if owned_count != len(set(asset_oids)):
            raise ApiException(422, "INVALID_REFERENCE_ASSETS", "Every reference image must be an image asset in this project")
        changes["referenceImages"] = [str(asset_id) for asset_id in asset_oids]
    if not changes:
        raise ApiException(400, "EMPTY_UPDATE", "Provide character fields to update")
    changes["updatedAt"] = utc_now()
    await db.characters.update_one({"_id": character["_id"]}, {"$set": changes})
    return ok("Character updated", public(await db.characters.find_one({"_id": character["_id"]})))


@router.get("/projects/{project_id}/analysis")
async def get_project_analysis(project_id: str, user: CurrentUser, db: DB):
    rows = await project_docs(db, "jobs", project_id, user, {"jobType": "image_analysis"})
    return ok("Analysis jobs loaded", rows)


@router.post("/projects/{project_id}/models/generate", status_code=202)
async def generate_model(project_id: str, body: dict, background: BackgroundTasks, user: CurrentUser, db: DB):
    project = await owned_project(db, project_id, user)
    payload = dict(body)
    character_id = payload.get("characterId")
    if character_id:
        character = await db.characters.find_one({"_id": oid(str(character_id), "CHARACTER"), "projectId": project["_id"], "userId": user["_id"]})
        if not character:
            raise ApiException(404, "CHARACTER_NOT_FOUND", "Character was not found in this project")
        references = payload.get("referenceAssetIds", character.get("referenceImages", []))
        if not isinstance(references, list) or any(not ObjectId.is_valid(str(asset_id)) for asset_id in references):
            raise ApiException(422, "INVALID_REFERENCE_ASSETS", "referenceAssetIds must contain asset IDs")
        reference_oids = [ObjectId(str(asset_id)) for asset_id in references]
        owned_count = await db.assets.count_documents({"_id": {"$in": reference_oids}, "projectId": project["_id"], "userId": user["_id"], "assetType": "image"})
        if owned_count != len(set(reference_oids)):
            raise ApiException(422, "INVALID_REFERENCE_ASSETS", "Every reference image must be an image asset in this project")
        reference_ids = [str(asset_id) for asset_id in reference_oids]
        await db.characters.update_one({"_id": character["_id"]}, {"$set": {"referenceImages": reference_ids, "updatedAt": utc_now()}})
        payload["referenceAssetIds"] = reference_ids
    job = await create_job(db, user, project, "model_generation", payload, background)
    return ok("Model generation queued", job)


@router.get("/projects/{project_id}/models")
async def list_models(project_id: str, user: CurrentUser, db: DB):
    return ok("Models loaded", await project_docs(db, "assets", project_id, user, {"assetType": "model"}))


@router.get("/models/{model_id}")
async def get_model(model_id: str, user: CurrentUser, db: DB):
    return ok("Model loaded", public(await resource(db, "assets", model_id, user)))


@router.post("/models/{model_id}/regenerate", status_code=202)
async def regenerate_model(model_id: str, body: dict, background: BackgroundTasks, user: CurrentUser, db: DB):
    model = await resource(db, "assets", model_id, user)
    project = await owned_project(db, str(model["projectId"]), user)
    return ok("Model regeneration queued", await create_job(db, user, project, "model_generation", {**body, "sourceAssetId": model_id}, background))


@router.post("/models/{model_id}/approve")
async def approve_model(model_id: str, user: CurrentUser, db: DB):
    model = await resource(db, "assets", model_id, user)
    await db.assets.update_one({"_id": model["_id"]}, {"$set": {"metadata.approved": True, "metadata.approvedAt": utc_now()}})
    return ok("Model approved", {"id": model_id, "approved": True})


async def mesh_job(model_id: str, operation: str, body: dict, background: BackgroundTasks, user: dict, db: AsyncDatabase):
    model = await resource(db, "assets", model_id, user)
    project = await owned_project(db, str(model["projectId"]), user)
    return await create_job(db, user, project, f"mesh_{operation}", {**body, "sourceAssetId": model_id, "action": f"mesh_{operation}", "format": "GLB"}, background, blender=True)


@router.post("/models/{model_id}/mesh/{operation}", status_code=202)
async def mesh_operation(model_id: str, operation: str, body: dict, background: BackgroundTasks, user: CurrentUser, db: DB):
    if operation not in {"validate", "repair", "retopology", "smooth", "optimize"}:
        raise ApiException(404, "OPERATION_NOT_FOUND", "Mesh operation was not found")
    # validate produces a report; mesh edits require Blender and are queued as Blender operations.
    job = await mesh_job(model_id, operation, body, background, user, db)
    return ok("Mesh operation queued", job)


@router.get("/models/{model_id}/mesh/report")
async def mesh_report(model_id: str, user: CurrentUser, db: DB):
    model = await resource(db, "assets", model_id, user)
    return ok("Mesh report loaded", model.get("metadata", {}).get("meshReport", {}))


@router.get("/characters/{character_id}/materials")
async def list_materials(character_id: str, user: CurrentUser, db: DB):
    character = await resource(db, "characters", character_id, user)
    rows = db.materials.find({"characterId": character["_id"], "userId": user["_id"]}).sort("createdAt", -1)
    return ok("Materials loaded", [public(row) async for row in rows])


@router.post("/characters/{character_id}/materials", status_code=201)
async def create_material(character_id: str, body: dict, user: CurrentUser, db: DB):
    character = await resource(db, "characters", character_id, user)
    material = {**body, "projectId": character["projectId"], "characterId": character["_id"], "userId": user["_id"], "createdAt": utc_now(), "updatedAt": utc_now()}
    result = await db.materials.insert_one(material)
    material["_id"] = result.inserted_id
    return ok("Material created", public(material))


@router.patch("/materials/{material_id}")
async def update_material(material_id: str, body: dict, user: CurrentUser, db: DB):
    material = await resource(db, "materials", material_id, user)
    changes = {key: value for key, value in body.items() if key not in {"_id", "userId", "projectId", "characterId", "createdAt"}}
    changes["updatedAt"] = utc_now()
    await db.materials.update_one({"_id": material["_id"]}, {"$set": changes})
    return ok("Material updated", public(await db.materials.find_one({"_id": material["_id"]})))


@router.post("/materials/{material_id}/generate-texture", status_code=202)
async def generate_texture(material_id: str, body: dict, background: BackgroundTasks, user: CurrentUser, db: DB):
    material = await resource(db, "materials", material_id, user)
    return ok("Texture generation queued", await create_job(db, user, await owned_project(db, str(material["projectId"]), user), "texture_generation", {**body, "materialId": material_id}, background))


@router.post("/materials/{material_id}/apply")
async def apply_material(material_id: str, user: CurrentUser, db: DB):
    material = await resource(db, "materials", material_id, user)
    await db.materials.update_one({"_id": material["_id"]}, {"$set": {"applied": True, "updatedAt": utc_now()}})
    return ok("Material applied", {"id": material_id, "applied": True})


@router.post("/characters/{character_id}/rigging/generate", status_code=202)
async def generate_rig(character_id: str, body: dict, background: BackgroundTasks, user: CurrentUser, db: DB):
    character = await resource(db, "characters", character_id, user)
    return ok("Rig generation queued", await create_job(db, user, await owned_project(db, str(character["projectId"]), user), "rigging", {**body, "characterId": character_id}, background))


@router.get("/characters/{character_id}/rigging")
async def get_rigging(character_id: str, user: CurrentUser, db: DB):
    character = await resource(db, "characters", character_id, user)
    return ok("Rigging data loaded", public(character.get("rigging", {"status": "not_started"})))


@router.post("/characters/{character_id}/rigging/{operation}", status_code=202)
async def rigging_operation(character_id: str, operation: str, body: dict, background: BackgroundTasks, user: CurrentUser, db: DB):
    if operation not in {"validate", "weight-paint", "approve"}:
        raise ApiException(404, "OPERATION_NOT_FOUND", "Rigging operation was not found")
    character = await resource(db, "characters", character_id, user)
    if operation == "approve":
        await db.characters.update_one({"_id": character["_id"]}, {"$set": {"rigging.approved": True, "updatedAt": utc_now()}})
        return ok("Rig approved", {"characterId": character_id, "approved": True})
    return ok("Rigging job queued", await create_job(db, user, await owned_project(db, str(character["projectId"]), user), f"rigging_{operation}", {**body, "characterId": character_id}, background))


@router.get("/animations/library")
async def animation_library():
    return ok("Animation library loaded", [])


@router.post("/characters/{character_id}/animations", status_code=201)
async def create_animation(character_id: str, body: dict, user: CurrentUser, db: DB):
    character = await resource(db, "characters", character_id, user)
    animation = {**body, "projectId": character["projectId"], "characterId": character["_id"], "userId": user["_id"], "createdAt": utc_now()}
    result = await db.animations.insert_one(animation)
    animation["_id"] = result.inserted_id
    return ok("Animation created", public(animation))


@router.post("/characters/{character_id}/animations/generate", status_code=202)
async def generate_animation(character_id: str, body: dict, background: BackgroundTasks, user: CurrentUser, db: DB):
    character = await resource(db, "characters", character_id, user)
    return ok("Animation generation queued", await create_job(db, user, await owned_project(db, str(character["projectId"]), user), "motion_generation", {**body, "characterId": character_id}, background))


@router.get("/projects/{project_id}/animations")
async def list_animations(project_id: str, user: CurrentUser, db: DB):
    return ok("Animations loaded", await project_docs(db, "animations", project_id, user))


@router.patch("/animations/{animation_id}")
async def update_animation(animation_id: str, body: dict, user: CurrentUser, db: DB):
    animation = await resource(db, "animations", animation_id, user)
    changes = {k: v for k, v in body.items() if k not in {"_id", "userId", "projectId", "characterId", "createdAt"}}
    changes["updatedAt"] = utc_now()
    await db.animations.update_one({"_id": animation["_id"]}, {"$set": changes})
    return ok("Animation updated", public(await db.animations.find_one({"_id": animation["_id"]})))


@router.delete("/animations/{animation_id}")
async def delete_animation(animation_id: str, user: CurrentUser, db: DB):
    animation = await resource(db, "animations", animation_id, user)
    await db.animations.delete_one({"_id": animation["_id"]})
    return ok("Animation deleted", {})


@router.get("/projects/{project_id}/lighting")
async def list_lighting(project_id: str, user: CurrentUser, db: DB):
    return ok("Lighting settings loaded", await project_docs(db, "lighting", project_id, user))


@router.post("/projects/{project_id}/lighting", status_code=201)
async def create_lighting(project_id: str, body: dict, user: CurrentUser, db: DB):
    project = await owned_project(db, project_id, user)
    doc = {**body, "projectId": project["_id"], "userId": user["_id"], "createdAt": utc_now(), "updatedAt": utc_now()}
    result = await db.lighting.insert_one(doc)
    doc["_id"] = result.inserted_id
    return ok("Lighting settings created", public(doc))


@router.patch("/projects/{project_id}/lighting/{lighting_id}")
async def update_lighting(project_id: str, lighting_id: str, body: dict, user: CurrentUser, db: DB):
    await owned_project(db, project_id, user)
    doc = await db.lighting.find_one({"_id": oid(lighting_id), "projectId": oid(project_id), "userId": user["_id"]})
    if not doc:
        raise ApiException(404, "LIGHTING_NOT_FOUND", "Lighting settings were not found")
    await db.lighting.update_one({"_id": doc["_id"]}, {"$set": {**body, "updatedAt": utc_now()}})
    return ok("Lighting settings updated", public(await db.lighting.find_one({"_id": doc["_id"]})))


@router.post("/projects/{project_id}/lighting/preview", status_code=202)
async def preview_lighting(project_id: str, body: dict, background: BackgroundTasks, user: CurrentUser, db: DB):
    return ok("Lighting preview queued", await create_job(db, user, await owned_project(db, project_id, user), "lighting_preview", body, background))


@router.post("/projects/{project_id}/scenes", status_code=201)
async def create_scene(project_id: str, body: dict, user: CurrentUser, db: DB):
    project = await owned_project(db, project_id, user)
    doc = {**body, "projectId": project["_id"], "userId": user["_id"], "sceneOrder": int(body.get("sceneOrder", await db.scenes.count_documents({"projectId": project["_id"]}))), "createdAt": utc_now(), "updatedAt": utc_now()}
    result = await db.scenes.insert_one(doc)
    doc["_id"] = result.inserted_id
    return ok("Scene created", public(doc))


@router.get("/projects/{project_id}/scenes")
async def list_scenes(project_id: str, user: CurrentUser, db: DB):
    return ok("Scenes loaded", await project_docs(db, "scenes", project_id, user))


@router.get("/scenes/{scene_id}")
async def get_scene(scene_id: str, user: CurrentUser, db: DB):
    return ok("Scene loaded", public(await resource(db, "scenes", scene_id, user)))


@router.patch("/scenes/{scene_id}")
async def update_scene(scene_id: str, body: dict, user: CurrentUser, db: DB):
    scene = await resource(db, "scenes", scene_id, user)
    changes = {k: v for k, v in body.items() if k not in {"_id", "userId", "projectId", "createdAt"}}
    changes["updatedAt"] = utc_now()
    await db.scenes.update_one({"_id": scene["_id"]}, {"$set": changes})
    return ok("Scene updated", public(await db.scenes.find_one({"_id": scene["_id"]})))


@router.delete("/scenes/{scene_id}")
async def delete_scene(scene_id: str, user: CurrentUser, db: DB):
    scene = await resource(db, "scenes", scene_id, user)
    await db.scenes.delete_one({"_id": scene["_id"]})
    return ok("Scene deleted", {})


@router.post("/scenes/{scene_id}/generate", status_code=202)
async def generate_scene(scene_id: str, body: dict, background: BackgroundTasks, user: CurrentUser, db: DB):
    scene = await resource(db, "scenes", scene_id, user)
    project = await owned_project(db, str(scene["projectId"]), user)
    return ok("Scene generation queued", await create_job(db, user, project, "scene_generation", {**body, "sceneId": scene_id}, background))


@router.post("/scenes/{scene_id}/render", status_code=202)
async def render_scene(scene_id: str, body: dict, background: BackgroundTasks, user: CurrentUser, db: DB):
    scene = await resource(db, "scenes", scene_id, user)
    project = await owned_project(db, str(scene["projectId"]), user)
    source_id = body.get("sourceAssetId") or scene.get("sourceAssetId") or scene.get("blenderAssetId")
    job = await create_job(db, user, project, "render", {**body, "sourceAssetId": source_id, "action": "render", "scene": {**scene, **body}}, background, blender=True)
    return ok("Render queued", job)


@router.get("/renders/{render_id}")
async def get_render(render_id: str, user: CurrentUser, db: DB):
    render = await resource(db, "jobs", render_id, user)
    if render.get("jobType") != "render":
        raise ApiException(404, "RENDER_NOT_FOUND", "Render was not found")
    return ok("Render loaded", public(render))


@router.post("/renders/{render_id}/cancel")
async def cancel_render(render_id: str, user: CurrentUser, db: DB):
    return await cancel_job(render_id, user, db)


@router.get("/projects/{project_id}/renders")
async def list_renders(project_id: str, user: CurrentUser, db: DB):
    return ok("Renders loaded", await project_docs(db, "jobs", project_id, user, {"jobType": "render"}))


@router.post("/projects/{project_id}/export", status_code=202)
async def export_project(project_id: str, body: dict, background: BackgroundTasks, user: CurrentUser, db: DB):
    fmt = str(body.get("format", "BLEND")).upper()
    if fmt not in FORMATS:
        raise ApiException(422, "UNSUPPORTED_EXPORT_FORMAT", "Choose BLEND, GLB, GLTF, FBX, OBJ, or MP4")
    job = await create_job(db, user, await owned_project(db, project_id, user), "export", {**body, "action": "render_animation" if fmt == "MP4" else "export", "format": fmt}, background, blender=True)
    return ok("Export queued", job)


@router.get("/exports/{export_id}")
async def get_export(export_id: str, user: CurrentUser, db: DB):
    return ok("Export loaded", public(await resource(db, "jobs", export_id, user)))


@router.get("/projects/{project_id}/exports")
async def list_exports(project_id: str, user: CurrentUser, db: DB):
    return ok("Exports loaded", await project_docs(db, "jobs", project_id, user, {"jobType": "export"}))


@router.get("/projects/{project_id}/workflow")
async def get_workflow(project_id: str, user: CurrentUser, db: DB):
    project = await owned_project(db, project_id, user)
    now = utc_now()
    for i, name in enumerate(STAGES):
        await db.workflowStages.update_one({"projectId": project["_id"], "stageName": name}, {"$setOnInsert": {"projectId": project["_id"], "userId": user["_id"], "stageName": name, "stageOrder": i, "status": "pending", "inputAssets": [], "outputAssets": [], "configuration": {}, "createdAt": now, "updatedAt": now}}, upsert=True)
    rows = db.workflowStages.find({"projectId": project["_id"]}).sort("stageOrder", 1)
    stages = [public(row) async for row in rows]
    return ok("Workflow loaded", stages)


@router.get("/projects/{project_id}/workflow/{stage_name}")
async def get_workflow_stage(project_id: str, stage_name: str, user: CurrentUser, db: DB):
    project = await owned_project(db, project_id, user)
    stage = await db.workflowStages.find_one({"projectId": project["_id"], "stageName": stage_name})
    if not stage:
        raise ApiException(404, "STAGE_NOT_FOUND", "Workflow stage was not found")
    return ok("Workflow stage loaded", public(stage))


async def update_stage(project_id: str, stage_name: str, user: dict, db: AsyncDatabase, changes: dict) -> dict:
    project = await owned_project(db, project_id, user)
    if stage_name not in STAGES:
        raise ApiException(404, "STAGE_NOT_FOUND", "Workflow stage was not found")
    await db.workflowStages.update_one({"projectId": project["_id"], "stageName": stage_name}, {"$set": {**changes, "updatedAt": utc_now()}, "$setOnInsert": {"userId": user["_id"], "stageOrder": STAGES.index(stage_name), "createdAt": utc_now()}}, upsert=True)
    return public(await db.workflowStages.find_one({"projectId": project["_id"], "stageName": stage_name}))


@router.post("/projects/{project_id}/workflow/{stage_name}/approve")
async def approve_stage(project_id: str, stage_name: str, user: CurrentUser, db: DB):
    stage = await update_stage(project_id, stage_name, user, db, {"status": "completed", "approvedAt": utc_now(), "approvedBy": user["_id"]})
    return ok("Workflow stage approved", stage)


@router.post("/projects/{project_id}/workflow/{stage_name}/retry", status_code=202)
async def retry_stage(project_id: str, stage_name: str, body: dict, background: BackgroundTasks, user: CurrentUser, db: DB):
    if stage_name not in STAGES:
        raise ApiException(404, "STAGE_NOT_FOUND", "Workflow stage was not found")
    project = await owned_project(db, project_id, user)
    await update_stage(project_id, stage_name, user, db, {"status": "queued"})
    job = await create_job(db, user, project, stage_name, body, background, blender=stage_name in {"rendering", "export"})
    return ok("Workflow stage retry queued", job)


@router.get("/jobs")
async def list_jobs(user: CurrentUser, db: DB, status: str | None = None, project_id: str | None = None):
    query: dict[str, Any] = {"userId": user["_id"]}
    if status:
        if status not in STATUS:
            raise ApiException(422, "INVALID_JOB_STATUS", "Unknown job status")
        query["status"] = status
    if project_id:
        query["projectId"] = oid(project_id, "PROJECT")
    cursor = db.jobs.find(query).sort("createdAt", -1).limit(100)
    return ok("Jobs loaded", [public(row) async for row in cursor])


@router.get("/jobs/{job_id}")
async def get_job(job_id: str, user: CurrentUser, db: DB):
    return ok("Job loaded", public(await resource(db, "jobs", job_id, user)))


@router.post("/jobs/{job_id}/cancel")
async def cancel_job(job_id: str, user: CurrentUser, db: DB):
    job = await resource(db, "jobs", job_id, user)
    if job["status"] in {"completed", "failed", "cancelled"}:
        raise ApiException(409, "JOB_NOT_CANCELLABLE", "This job is already finished")
    await db.jobs.update_one({"_id": job["_id"]}, {"$set": {"status": "cancelled", "completedAt": utc_now(), "updatedAt": utc_now()}})
    stage_name = {"render": "rendering", "mesh_validate": "mesh_editing", "mesh_repair": "mesh_editing", "mesh_retopology": "mesh_editing", "mesh_smooth": "mesh_editing", "mesh_optimize": "mesh_editing"}.get(job.get("jobType"), job.get("jobType"))
    if stage_name in STAGES:
        await db.workflowStages.update_one({"projectId": job["projectId"], "stageName": stage_name}, {"$set": {"status": "cancelled", "updatedAt": utc_now()}})
    return ok("Job cancelled", {"id": job_id, "status": "cancelled"})


@router.get("/jobs/{job_id}/logs")
async def job_logs(job_id: str, user: CurrentUser, db: DB):
    job = await resource(db, "jobs", job_id, user)
    return ok("Job logs loaded", job.get("output", {}).get("logs", job.get("error", {}).get("message", "")))


@router.post("/projects/{project_id}/versions", status_code=201)
async def create_version(project_id: str, body: dict, user: CurrentUser, db: DB):
    project = await owned_project(db, project_id, user)
    number = await db.projectVersions.count_documents({"projectId": project["_id"]}) + 1
    snapshot = {key: value for key, value in project.items() if key != "_id"}
    doc = {"projectId": project["_id"], "userId": user["_id"], "versionNumber": number, "snapshot": snapshot, "assetIds": [a["_id"] async for a in db.assets.find({"projectId": project["_id"]}, {"_id": 1})], "description": str(body.get("description", ""))[:500], "createdBy": user["_id"], "createdAt": utc_now()}
    result = await db.projectVersions.insert_one(doc)
    doc["_id"] = result.inserted_id
    return ok("Project version saved", public(doc))


@router.get("/projects/{project_id}/versions")
async def list_versions(project_id: str, user: CurrentUser, db: DB):
    return ok("Versions loaded", await project_docs(db, "projectVersions", project_id, user))


@router.get("/versions/{version_id}")
async def get_version(version_id: str, user: CurrentUser, db: DB):
    return ok("Version loaded", public(await resource(db, "projectVersions", version_id, user)))


@router.post("/versions/{version_id}/restore")
async def restore_version(version_id: str, user: CurrentUser, db: DB):
    version = await resource(db, "projectVersions", version_id, user)
    result = await db.projects.update_one({"_id": version["projectId"], "userId": user["_id"]}, {"$set": {**version["snapshot"], "updatedAt": utc_now()}})
    if result.matched_count != 1:
        raise ApiException(404, "PROJECT_NOT_FOUND", "Project was not found")
    return ok("Project version restored", {"projectId": str(version["projectId"]), "versionId": version_id})
