from typing import Annotated, Any

import jwt
from bson import ObjectId
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pymongo.asynchronous.database import AsyncDatabase
from redis.asyncio import Redis

from app.core.responses import ApiException
from app.db.dependencies import get_db, get_redis
from app.services.tokens import decode_token, refresh_key

bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Annotated[AsyncDatabase, Depends(get_db)],
) -> dict[str, Any]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise ApiException(401, "UNAUTHORIZED", "Authentication is required")
    try:
        payload = decode_token(credentials.credentials, "access")
        if payload.get("typ") != "access" or not ObjectId.is_valid(payload.get("sub", "")):
            raise jwt.InvalidTokenError("Invalid access token")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if (
            user is None
            or user.get("accountStatus") != "active"
            or int(user.get("tokenVersion", 0)) != int(payload.get("ver", -1))
        ):
            raise ApiException(401, "UNAUTHORIZED", "Your session is no longer valid")
        return user
    except jwt.ExpiredSignatureError as exc:
        raise ApiException(401, "TOKEN_EXPIRED", "Your session has expired") from exc
    except jwt.InvalidTokenError as exc:
        raise ApiException(401, "INVALID_TOKEN", "Your access token is invalid") from exc


CurrentUser = Annotated[dict[str, Any], Depends(get_current_user)]
Database = Annotated[AsyncDatabase, Depends(get_db)]
RedisStore = Annotated[Redis, Depends(get_redis)]
