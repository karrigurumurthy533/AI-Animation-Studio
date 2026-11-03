from typing import Annotated

from bson import ObjectId
from fastapi import APIRouter, Depends, Response
from pymongo.asynchronous.database import AsyncDatabase

from app.core.dependencies import CurrentUser
from app.core.responses import ApiException
from app.core.security import hash_password, utc_now, verify_password
from app.db.dependencies import get_db
from app.schemas.auth import ChangePasswordRequest, ProfileUpdateRequest
from app.schemas.users import public_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/profile")
async def get_profile(user: CurrentUser):
    return {"success": True, "message": "Profile loaded", "data": public_user(user)}


@router.patch("/profile")
async def update_profile(
    body: ProfileUpdateRequest,
    user: CurrentUser,
    db: Annotated[AsyncDatabase, Depends(get_db)],
):
    changes = body.model_dump(exclude_unset=True)
    if not changes:
        raise ApiException(400, "EMPTY_UPDATE", "Provide at least one profile field to update")
    if "name" in changes and changes["name"] is None:
        raise ApiException(422, "VALIDATION_ERROR", "Name cannot be null")
    if "avatar" in changes and changes["avatar"] == "":
        changes["avatar"] = None
    changes["updatedAt"] = utc_now()
    await db.users.update_one({"_id": user["_id"]}, {"$set": changes})
    updated = await db.users.find_one({"_id": user["_id"]})
    return {"success": True, "message": "Profile updated", "data": public_user(updated)}


@router.patch("/password")
async def update_password(
    body: ChangePasswordRequest,
    response: Response,
    user: CurrentUser,
    db: Annotated[AsyncDatabase, Depends(get_db)],
):
    if not verify_password(body.current_password, user.get("passwordHash", "")):
        raise ApiException(400, "CURRENT_PASSWORD_INVALID", "Current password is incorrect")
    if body.current_password == body.new_password:
        raise ApiException(400, "PASSWORD_UNCHANGED", "Choose a different new password")
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"passwordHash": hash_password(body.new_password), "updatedAt": utc_now()}, "$inc": {"tokenVersion": 1}},
    )
    return {"success": True, "message": "Password updated. Sign in again on your devices.", "data": {}}


@router.delete("/account")
async def delete_account(
    response: Response,
    user: CurrentUser,
    db: Annotated[AsyncDatabase, Depends(get_db)],
):
    user_id = str(user["_id"])
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"accountStatus": "deleted", "email": f"deleted+{user_id}@invalid.local", "name": "Deleted account", "avatar": None, "updatedAt": utc_now()}, "$inc": {"tokenVersion": 1}},
    )
    response.delete_cookie("refresh_token", path="/api/v1/auth")
    return {"success": True, "message": "Account deactivated", "data": {}}
