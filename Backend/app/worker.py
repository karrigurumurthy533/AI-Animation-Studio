"""Redis-backed local worker. Run with `python -m app.worker` from Backend."""

import asyncio
import logging
from types import SimpleNamespace

from bson import ObjectId

from app.core.security import utc_now
from app.db.session import close_resources, connect_resources
from app.services.blender import run_blender_job
from app.services.model_generation import run_model_generation

logger = logging.getLogger("animation-studio-worker")
STAGES = {"image_upload", "image_analysis", "model_generation", "mesh_editing", "materials", "rigging", "animation", "lighting", "rendering", "export"}


async def _requeue_orphaned_jobs(db, redis) -> None:
    queued = set(await redis.lrange("studio:jobs", 0, -1))
    processing = set(await redis.lrange("studio:jobs:processing", 0, -1))
    cursor = db.jobs.find({"status": "queued"}, {"_id": 1})
    async for job in cursor:
        job_id = str(job["_id"])
        if job_id not in queued and job_id not in processing:
            await redis.lpush("studio:jobs", job_id)
            logger.warning("Requeued orphaned job %s", job_id)


async def _run_adapter(db, job: dict) -> None:
    now = utc_now()
    await db.jobs.update_one({"_id": job["_id"], "status": "queued"}, {"$set": {"status": "failed", "progress": 100, "error": {"code": "ADAPTER_NOT_CONFIGURED", "message": f"No provider is configured for {job.get('jobType')}. Configure the corresponding AI adapter and retry."}, "completedAt": now, "updatedAt": now}})
    stage_name = job.get("jobType")
    if stage_name in STAGES:
        await db.workflowStages.update_one({"projectId": job["projectId"], "stageName": stage_name}, {"$set": {"status": "failed", "updatedAt": now}})


async def serve() -> None:
    app = SimpleNamespace(state=SimpleNamespace())
    await connect_resources(app)
    logger.info("Worker connected; waiting for queued jobs")
    try:
        # Requeue work left in the processing list by a worker that exited unexpectedly.
        abandoned = await app.state.redis.lrange("studio:jobs:processing", 0, -1)
        for job_id in abandoned:
            await app.state.redis.lrem("studio:jobs:processing", 1, job_id)
            await app.state.redis.lpush("studio:jobs", job_id)
        await _requeue_orphaned_jobs(app.state.db, app.state.redis)
        next_reconcile = asyncio.get_running_loop().time() + 30
        while True:
            job_id = await app.state.redis.brpoplpush("studio:jobs", "studio:jobs:processing", timeout=5)
            if job_id is None:
                if asyncio.get_running_loop().time() >= next_reconcile:
                    await _requeue_orphaned_jobs(app.state.db, app.state.redis)
                    next_reconcile = asyncio.get_running_loop().time() + 30
                continue
            try:
                job = await app.state.db.jobs.find_one({"_id": ObjectId(job_id), "status": "queued"})
                if not job:
                    continue
                if job.get("provider") == "blender":
                    await run_blender_job(app.state.db, job_id)
                elif job.get("jobType") == "model_generation":
                    await run_model_generation(app.state.db, job_id)
                else:
                    await _run_adapter(app.state.db, job)
            except Exception:
                logger.exception("Queued job %s failed in worker", job_id)
            finally:
                await app.state.redis.lrem("studio:jobs:processing", 1, job_id)
    finally:
        await close_resources(app)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(serve())
