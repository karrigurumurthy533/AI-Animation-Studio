from typing import Annotated

import jwt
from bson import ObjectId
from fastapi import APIRouter, Cookie, Depends, Request, Response
from pymongo.errors import DuplicateKeyError
from pymongo.asynchronous.database import AsyncDatabase
from redis.asyncio import Redis

from app.core.config import settings
from app.core.dependencies import CurrentUser
from app.core.rate_limit import rate_limit
from app.core.responses import ApiException
from app.core.security import hash_password, utc_now, verify_password
from app.db.dependencies import get_db, get_redis
from app.schemas.auth import ForgotPasswordRequest, LoginRequest, RegisterRequest, ResetPasswordRequest
from app.schemas.users import public_user
from app.services.email import send_password_reset
from app.services.tokens import (
    decode_token,
    issue_token,
    refresh_key,
    reset_key,
    rotate_refresh,
    save_refresh,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
REFRESH_COOKIE = "refresh_token"


def _set_refresh_cookie(response: Response, token: str, ttl_seconds: int) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=token,
        max_age=ttl_seconds,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        path=f"{settings.api_v1_prefix}/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        path=f"{settings.api_v1_prefix}/auth",
    )


async def _create_session(user: dict, db: AsyncDatabase, redis: Redis, response: Response) -> dict:
    version = int(user.get("tokenVersion", 0))
    subject = str(user["_id"])
    access, _, _ = issue_token(subject, version, "access")
    refresh, jti, ttl = issue_token(subject, version, "refresh")
    await save_refresh(redis, jti, subject, version, ttl)
    _set_refresh_cookie(response, refresh, ttl)
    return {"access_token": access, "token_type": "bearer", "user": public_user(user)}


@router.post("/register", status_code=201, dependencies=[Depends(rate_limit("register", 5, 3600))])
async def register(
    body: RegisterRequest,
    response: Response,
    db: Annotated[AsyncDatabase, Depends(get_db)],
    redis: Annotated[Redis, Depends(get_redis)],
):
    now = utc_now()
    user = {
        "name": body.name,
        "email": body.email,
        "passwordHash": hash_password(body.password),
        "avatar": None,
        "role": "user",
        "emailVerified": False,
        "accountStatus": "active",
        "tokenVersion": 0,
        "createdAt": now,
        "updatedAt": now,
    }
    try:
        result = await db.users.insert_one(user)
    except DuplicateKeyError as exc:
        raise ApiException(409, "EMAIL_ALREADY_REGISTERED", "An account with this email already exists") from exc
    user["_id"] = result.inserted_id
    data = await _create_session(user, db, redis, response)
    response.status_code = 201
    return {"success": True, "message": "Account created", "data": data}


@router.post("/login", dependencies=[Depends(rate_limit("login", 10, 900))])
async def login(
    body: LoginRequest,
    response: Response,
    db: Annotated[AsyncDatabase, Depends(get_db)],
    redis: Annotated[Redis, Depends(get_redis)],
):
    user = await db.users.find_one({"email": body.email})
    valid = user is not None and verify_password(body.password, user.get("passwordHash", ""))
    if not valid or user.get("accountStatus") != "active":
        raise ApiException(401, "INVALID_CREDENTIALS", "Email or password is incorrect")
    data = await _create_session(user, db, redis, response)
    return {"success": True, "message": "Signed in", "data": data}


@router.post("/refresh", dependencies=[Depends(rate_limit("refresh", 30, 900))])
async def refresh_session(
    response: Response,
    db: Annotated[AsyncDatabase, Depends(get_db)],
    redis: Annotated[Redis, Depends(get_redis)],
    token: Annotated[str | None, Cookie(alias=REFRESH_COOKIE)] = None,
):
    if not token:
        _clear_refresh_cookie(response)
        raise ApiException(401, "REFRESH_REQUIRED", "A refresh session is required")
    try:
        payload = decode_token(token, "refresh")
        if payload.get("typ") != "refresh" or not ObjectId.is_valid(payload.get("sub", "")):
            raise jwt.InvalidTokenError("Invalid refresh token")
        user_id = payload["sub"]
        version = int(payload["ver"])
        user = await db.users.find_one({"_id": ObjectId(user_id), "accountStatus": "active"})
        if user is None or int(user.get("tokenVersion", 0)) != version:
            raise ApiException(401, "INVALID_SESSION", "Your refresh session is no longer valid")
        access, _, _ = issue_token(user_id, version, "access")
        new_refresh, new_jti, ttl = issue_token(user_id, version, "refresh")
        rotated = await rotate_refresh(redis, payload["jti"], new_jti, user_id, version, ttl)
        if not rotated:
            raise ApiException(401, "INVALID_SESSION", "Your refresh session is no longer valid")
        _set_refresh_cookie(response, new_refresh, ttl)
        return {"success": True, "message": "Session refreshed", "data": {"access_token": access, "token_type": "bearer"}}
    except jwt.ExpiredSignatureError as exc:
        _clear_refresh_cookie(response)
        raise ApiException(401, "REFRESH_EXPIRED", "Your refresh session has expired") from exc
    except jwt.InvalidTokenError as exc:
        _clear_refresh_cookie(response)
        raise ApiException(401, "INVALID_REFRESH_TOKEN", "Your refresh session is invalid") from exc


@router.post("/logout")
async def logout(
    response: Response,
    redis: Annotated[Redis, Depends(get_redis)],
    token: Annotated[str | None, Cookie(alias=REFRESH_COOKIE)] = None,
):
    if token:
        try:
            payload = decode_token(token, "refresh")
            if payload.get("typ") == "refresh":
                await redis.delete(refresh_key(payload["jti"]))
        except jwt.InvalidTokenError:
            pass
    _clear_refresh_cookie(response)
    return {"success": True, "message": "Signed out", "data": {}}


@router.post("/forgot-password", status_code=202, dependencies=[Depends(rate_limit("forgot-password", 5, 900))])
async def forgot_password(body: ForgotPasswordRequest, db: Annotated[AsyncDatabase, Depends(get_db)], redis: Annotated[Redis, Depends(get_redis)]):
    # Do not reveal whether an email address is registered.
    user = await db.users.find_one({"email": body.email, "accountStatus": "active"})
    if user:
        import secrets
        from datetime import timedelta

        raw_token = secrets.token_urlsafe(40)
        await redis.set(reset_key(raw_token), str(user["_id"]), ex=settings.password_reset_minutes * 60)
        try:
            await send_password_reset(body.email, raw_token)
        except Exception:
            # Keep the response indistinguishable when mail delivery is unavailable.
            # The reset token is never returned or logged.
            pass
    return {"success": True, "message": "If an account matches that email, a reset link will be sent", "data": {}}


@router.post("/reset-password", dependencies=[Depends(rate_limit("reset-password", 10, 900))])
async def reset_password(body: ResetPasswordRequest, db: Annotated[AsyncDatabase, Depends(get_db)], redis: Annotated[Redis, Depends(get_redis)]):
    key = reset_key(body.token)
    user_id = await redis.get(key)
    if not user_id or not ObjectId.is_valid(user_id):
        raise ApiException(400, "INVALID_RESET_TOKEN", "This password reset link is invalid or expired")
    result = await db.users.update_one(
        {"_id": ObjectId(user_id), "accountStatus": "active"},
        {"$set": {"passwordHash": hash_password(body.new_password), "updatedAt": utc_now()}, "$inc": {"tokenVersion": 1}},
    )
    await redis.delete(key)
    if result.modified_count != 1:
        raise ApiException(400, "INVALID_RESET_TOKEN", "This password reset link is invalid or expired")
    return {"success": True, "message": "Password updated. Please sign in again.", "data": {}}


@router.get("/me")
async def current_user(user: CurrentUser):
    return {"success": True, "message": "Current user", "data": public_user(user)}
