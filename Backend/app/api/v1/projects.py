from typing import Annotated, Any

from bson import ObjectId
from fastapi import APIRouter, Depends
from pymongo.asynchronous.database import AsyncDatabase

from app.core.dependencies import CurrentUser
from app.core.responses import ApiException
from app.core.security import utc_now
from app.db.dependencies import get_db
from app.schemas.projects import ProjectCreate, ProjectUpdate, public_project

router = APIRouter(prefix="/projects", tags=["Projects"])


def _project_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise ApiException(404, "PROJECT_NOT_FOUND", "Project was not found")
    return ObjectId(value)


def _owned_project_filter(project_id: str, user: dict[str, Any]) -> dict[str, Any]:
    return {"_id": _project_id(project_id), "userId": user["_id"]}


@router.post("", status_code=201)
async def create_project(body: ProjectCreate, user: CurrentUser, db: Annotated[AsyncDatabase, Depends(get_db)]):
    now = utc_now()
    project = {
        "userId": user["_id"],
        "name": body.name,
        "description": body.description,
        "projectType": body.projectType,
        "status": "active",
        "thumbnail": None,
        "currentStage": "image_upload",
        "settings": {},
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.projects.insert_one(project)
    project["_id"] = result.inserted_id
    return {"success": True, "message": "Project created", "data": public_project(project)}


@router.get("")
async def list_projects(user: CurrentUser, db: Annotated[AsyncDatabase, Depends(get_db)]):
    cursor = db.projects.find({"userId": user["_id"]}).sort("updatedAt", -1)
    return {"success": True, "message": "Projects loaded", "data": [public_project(item) async for item in cursor]}


@router.get("/{project_id}")
async def get_project(project_id: str, user: CurrentUser, db: Annotated[AsyncDatabase, Depends(get_db)]):
    project = await db.projects.find_one(_owned_project_filter(project_id, user))
    if project is None:
        raise ApiException(404, "PROJECT_NOT_FOUND", "Project was not found")
    return {"success": True, "message": "Project loaded", "data": public_project(project)}


@router.patch("/{project_id}")
async def update_project(project_id: str, body: ProjectUpdate, user: CurrentUser, db: Annotated[AsyncDatabase, Depends(get_db)]):
    changes = body.model_dump(exclude_unset=True)
    if not changes:
        raise ApiException(400, "EMPTY_UPDATE", "Provide at least one project field to update")
    if any(value is None for value in changes.values()):
        raise ApiException(422, "VALIDATION_ERROR", "Project fields cannot be null")
    changes["updatedAt"] = utc_now()
    result = await db.projects.update_one(_owned_project_filter(project_id, user), {"$set": changes})
    if result.matched_count != 1:
        raise ApiException(404, "PROJECT_NOT_FOUND", "Project was not found")
    project = await db.projects.find_one(_owned_project_filter(project_id, user))
    return {"success": True, "message": "Project updated", "data": public_project(project)}


@router.delete("/{project_id}")
async def delete_project(project_id: str, user: CurrentUser, db: Annotated[AsyncDatabase, Depends(get_db)]):
    result = await db.projects.delete_one(_owned_project_filter(project_id, user))
    if result.deleted_count != 1:
        raise ApiException(404, "PROJECT_NOT_FOUND", "Project was not found")
    return {"success": True, "message": "Project deleted", "data": {}}


@router.post("/{project_id}/duplicate", status_code=201)
async def duplicate_project(project_id: str, user: CurrentUser, db: Annotated[AsyncDatabase, Depends(get_db)]):
    source = await db.projects.find_one(_owned_project_filter(project_id, user))
    if source is None:
        raise ApiException(404, "PROJECT_NOT_FOUND", "Project was not found")
    now = utc_now()
    clone = {key: value for key, value in source.items() if key not in {"_id", "createdAt", "updatedAt"}}
    clone.update({"name": f"{source['name']} (copy)", "createdAt": now, "updatedAt": now})
    result = await db.projects.insert_one(clone)
    clone["_id"] = result.inserted_id
    return {"success": True, "message": "Project duplicated", "data": public_project(clone)}
