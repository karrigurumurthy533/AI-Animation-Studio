import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import jwt
from redis.asyncio import Redis

from app.core.config import settings

TokenType = Literal["access", "refresh"]


def issue_token(user_id: str, token_version: int, token_type: TokenType) -> tuple[str, str, int]:
    now = datetime.now(timezone.utc)
    expires = now + (timedelta(minutes=settings.access_token_minutes) if token_type == "access" else timedelta(days=settings.refresh_token_days))
    jti = secrets.token_urlsafe(24)
    payload: dict[str, Any] = {
        "iss": settings.app_name,
        "sub": user_id,
        "iat": now,
        "exp": expires,
        "jti": jti,
        "typ": token_type,
        "ver": token_version,
    }
    encoded = jwt.encode(payload, settings.jwt_secret_key.get_secret_value(), algorithm=settings.jwt_algorithm)
    return encoded, jti, max(1, int((expires - now).total_seconds()))


def decode_token(token: str, expected_type: TokenType) -> dict[str, Any]:
    payload = jwt.decode(
        token,
        settings.jwt_secret_key.get_secret_value(),
        algorithms=[settings.jwt_algorithm],
        issuer=settings.app_name,
        options={"require": ["exp", "iat", "iss", "sub", "jti", "typ", "ver"]},
    )
    if payload.get("typ") != expected_type:
        raise jwt.InvalidTokenError("Unexpected token type")
    return payload


def refresh_key(jti: str) -> str:
    return f"auth:refresh:{jti}"


def reset_key(raw_token: str) -> str:
    digest = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    return f"auth:password-reset:{digest}"


async def save_refresh(redis: Redis, jti: str, subject: str, version: int, ttl: int) -> None:
    await redis.set(refresh_key(jti), f"{subject}:{version}", ex=ttl)


async def rotate_refresh(redis: Redis, old_jti: str, new_jti: str, subject: str, version: int, ttl: int) -> bool:
    script = """
    local current = redis.call('GET', KEYS[1])
    if current ~= ARGV[1] then return 0 end
    redis.call('DEL', KEYS[1])
    redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[2])
    return 1
    """
    result = await redis.eval(script, 2, refresh_key(old_jti), refresh_key(new_jti), f"{subject}:{version}", ttl)
    return bool(result)
