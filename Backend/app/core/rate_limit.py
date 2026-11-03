from fastapi import Depends, Request
from redis.asyncio import Redis

from app.core.responses import ApiException
from app.db.dependencies import get_redis


def rate_limit(bucket: str, limit: int, window_seconds: int):
    async def check(request: Request, redis: Redis = Depends(get_redis)) -> None:
        ip = request.client.host if request.client else "unknown"
        key = f"rate:{bucket}:{ip}"
        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, window_seconds)
        if count > limit:
            ttl = await redis.ttl(key)
            raise ApiException(
                429,
                "RATE_LIMITED",
                "Too many attempts. Please wait before trying again.",
                [{"retryAfterSeconds": max(ttl, 1)}],
            )

    return check
