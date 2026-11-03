from fastapi import Request
from pymongo.asynchronous.database import AsyncDatabase
from redis.asyncio import Redis


def get_db(request: Request) -> AsyncDatabase:
    return request.app.state.db


def get_redis(request: Request) -> Redis:
    return request.app.state.redis
