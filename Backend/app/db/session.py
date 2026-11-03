from pymongo import AsyncMongoClient
from redis.asyncio import Redis

from app.core.config import settings
from app.db.indexes import ensure_indexes


async def connect_resources(app) -> None:
    mongo = AsyncMongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
    await mongo.admin.command("ping")
    db = mongo[settings.mongodb_database]
    await ensure_indexes(db)

    redis = Redis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=3)
    await redis.ping()

    app.state.mongo_client = mongo
    app.state.db = db
    app.state.redis = redis


async def close_resources(app) -> None:
    redis = getattr(app.state, "redis", None)
    mongo = getattr(app.state, "mongo_client", None)
    if redis is not None:
        await redis.aclose()
    if mongo is not None:
        await mongo.close()
