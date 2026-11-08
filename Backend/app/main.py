from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from pymongo.errors import PyMongoError
from redis.exceptions import RedisError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.responses import ApiException, api_exception_handler, http_exception_handler, validation_exception_handler
from app.db.session import close_resources, connect_resources
from app.services.queue import close_queue

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("animation-studio-api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_resources(app)
    logger.info("Connected to MongoDB and Redis")
    try:
        yield
    finally:
        await close_queue()
        await close_resources(app)


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="AI Animation Studio account, production workflow, asset, and Blender APIs.",
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)
app.add_exception_handler(ApiException, api_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health/live", tags=["Health"])
async def liveness():
    return {"success": True, "message": "API process is running", "data": {"status": "live"}}


@app.get("/health/ready", tags=["Health"])
async def readiness(request: Request):
    try:
        await request.app.state.mongo_client.admin.command("ping")
        await request.app.state.redis.ping()
    except (PyMongoError, RedisError) as exc:
        logger.warning("Readiness check failed: %s", type(exc).__name__)
        return {"success": False, "message": "A required service is unavailable", "data": {"status": "not_ready"}}
    return {"success": True, "message": "Required services are ready", "data": {"status": "ready"}}
