# AI Animation Studio

AI powered 3D character creation, rigging, animation, and film production.

## Local development

1. Install the Python dependencies from `Backend/requirements.txt` and the frontend dependencies from `Frontend/package-lock.json`.
2. Copy `Backend/.env.example` to `Backend/.env` and configure MongoDB, Redis, and `BLENDER_EXECUTABLE`.
3. Start MongoDB and Redis.
4. From `Backend`, run the API with `uvicorn app.main:app --reload`.
5. In development, the API starts a local queue worker automatically. Set `RUN_WORKER_IN_API=false` to disable it and run `python -m app.worker` in a second `Backend` terminal instead.
6. From `Frontend`, run `npm run dev`.

FastAPI docs are available at `/docs`. Production and AI processing require separately configured provider adapters and isolated workers; local Blender exports use the configured Blender executable and local storage directory.

## Project documentation

See [Docs/FULL-WORKFLOW.md](Docs/FULL-WORKFLOW.md) for the end-to-end local workflow. The `Docs/` directory also contains product requirements, architecture, database design, API documentation, UI/UX guidelines, and roadmap.
