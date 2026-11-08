"""Redis queue producer shared by API processes."""

from redis.asyncio import Redis

from app.core.config import settings

_redis: Redis | None = None


async def enqueue_job(job_id: str) -> None:
    global _redis
    if _redis is None:
        _redis = Redis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=3)
    await _redis.lpush("studio:jobs", job_id)


async def close_queue() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None
