# AI Animation Studio: Full Workflow Guide

This guide describes the current local development flow from account setup through image upload, character creation, queued processing, Blender export, and download. The route contract is in [API-DOCUMENTATION.md](API-DOCUMENTATION.md); the system design is in [SYSTEM-ARCHITECTURE.md](SYSTEM-ARCHITECTURE.md).

## 1. Start the local services

The API requires MongoDB and Redis. Blender operations also require Blender 5 to be installed on the machine running the worker.

1. Create and activate a Python environment from `Backend` and install dependencies:

   ```powershell
   cd Backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

2. Copy `Backend/.env.example` to `Backend/.env`. Set `MONGODB_URI`, `MONGODB_DATABASE`, `REDIS_URL`, and `JWT_SECRET_KEY`. Set `BLENDER_EXECUTABLE` to the Blender executable if it is not on `PATH`. `STUDIO_STORAGE_DIR` defaults to `./storage`, relative to the backend working directory.

3. Start MongoDB and Redis.

4. In a `Backend` terminal, start the API:

   ```powershell
   uvicorn app.main:app --reload
   ```

5. In development, the API starts the Redis queue worker automatically. To run it separately, set `RUN_WORKER_IN_API=false` and start this command in a second `Backend` terminal:

   ```powershell
   python -m app.worker
   ```

6. In a `Frontend` terminal, install and start the React app:

   ```powershell
   cd Frontend
   npm ci
   npm run dev
   ```

The frontend defaults to `/api/v1`, and Vite proxies API requests to the local backend. FastAPI's interactive reference is at `http://localhost:8000/docs`.

## 2. Authenticate and create a project

Register and sign in through the frontend. Authenticated API requests use the access token as a bearer token; the refresh token is held in an HTTP-only cookie.

Create a project in **Studio → Projects**. The backend returns the project ID used by upload, character, workflow, and Blender routes. Select the project so it becomes the active project in the studio.

Equivalent API call:

```http
POST /api/v1/projects
Authorization: Bearer <access-token>
Content-Type: application/json

{"name":"My character film","projectType":"Character film"}
```

## 3. Upload and link a character reference

In **Character Lab**, choose **Add reference image**. The frontend uploads the image using `POST /api/v1/projects/{projectId}/uploads`. Local uploads accept PNG, JPG/JPEG, and WebP images; the maximum upload size is 100 MB.

The returned asset has an `id` and `assetType: "image"`. The Character Lab then creates or reuses the project's character and saves the asset ID in `characters.referenceImages` through `PATCH /api/v1/characters/{characterId}`. The backend checks that every reference ID is an image asset owned by the same user and project.

The persisted character response should resemble:

```json
{
  "success": true,
  "message": "Characters loaded",
  "data": [
    {
      "id": "<character-id>",
      "name": "Studio character",
      "characterType": "custom",
      "projectId": "<project-id>",
      "referenceImages": ["<image-asset-id>"],
      "appearanceDNA": {}
    }
  ]
}
```

When the Character Lab is reopened, it loads the project's image assets and the character's saved reference IDs. If an older character has no saved references, uploaded project images are offered as references on the next generation request.

## 4. Queue image analysis and model generation

Choose **Analyze reference** to submit `POST /api/v1/projects/{projectId}/analysis`. Choose **Generate model** to submit `POST /api/v1/projects/{projectId}/models/generate` with `characterId` and `referenceAssetIds`. The model route validates and saves those image IDs to the character before enqueuing the job.

Heavy operations return HTTP `202` with a job ID:

```json
{
  "success": true,
  "message": "Model generation queued",
  "data": {"jobId":"<job-id>","status":"queued","progress":0}
}
```

Poll `GET /api/v1/jobs/{jobId}` for `queued`, `processing`, `completed`, `failed`, or `cancelled`. Use `GET /api/v1/jobs/{jobId}/logs` for worker output. The project analysis history is available at `GET /api/v1/projects/{projectId}/analysis`.

**AI provider status:** The queue and job tracking are implemented, but AI provider adapters are not configured in this repository. Analysis, image-to-3D generation, texture generation, rig generation, and motion generation jobs currently finish with `ADAPTER_NOT_CONFIGURED`. They do not produce generated AI assets until a provider adapter is added and configured.

## 5. Edit and inspect a mesh

Once a model asset exists, open **Mesh Lab**, select it, then request validation, repair, smoothing, optimization, or retopology. These jobs run through the Blender worker. `GET /api/v1/models/{modelId}/mesh/report` returns a saved mesh report after validation has finished.

The current local retopology operation uses Blender's Decimate modifier as a polygon reduction step; it is not an automatic artist-quality retopology system.

## 6. Materials, rigging, and animation

The frontend and API expose the documented material, rigging, and animation operations. Material settings can be saved and applied; texture generation is a queued AI operation. Rig generation, rig validation/weight painting, and motion generation are queued operations and require their corresponding AI adapters to produce results. Animation metadata can be created, updated, and deleted independently of motion generation.

The character is selected from the active project. The API stores materials and animations against the character and project. Use the returned job ID to inspect queued operations.

## 7. Create and render a scene

In **Film Lab**, save a scene to create a project scene record. The scene stores camera, lighting, duration, and description settings. Scene generation is an AI adapter operation.

Choose **Render scene** to submit `POST /api/v1/scenes/{sceneId}/render`. The worker starts Blender in background mode, opens the selected source asset when one is set, configures a camera and light if the scene has none, renders a PNG, and stores the result as a project asset. Animation export through the project export endpoint can produce MP4.

Check render status at `GET /api/v1/renders/{renderId}` or list project renders at `GET /api/v1/projects/{projectId}/renders`. A running render can be cancelled with `POST /api/v1/renders/{renderId}/cancel`.

## 8. Export a Blender project or model

Open **Blender Bridge**, select the project, choose an optional source model or `.blend` asset, then select a format and export. Supported formats are BLEND, GLB, GLTF, FBX, OBJ, and MP4.

The API call is `POST /api/v1/projects/{projectId}/export`, for example:

```json
{"format":"GLB","sourceAssetId":"<asset-id>"}
```

The Redis worker invokes the configured Blender executable with a generated Python script. It imports the source asset, saves the editable `.blend` scene where applicable, exports the requested format, and records an asset and job result. Download the output using `GET /api/v1/assets/{assetId}/download`. The Blender Bridge polls the export job and offers a download button when it completes.

Blender job logs and errors are available from the job endpoints. If Blender is not installed or `BLENDER_EXECUTABLE` is wrong, the job fails with `BLENDER_NOT_CONFIGURED` or `BLENDER_JOB_FAILED`.

## 9. Assets, workflow, and versions

- **Assets:** browse a project's assets with `GET /api/v1/projects/{projectId}/assets`; download with `/assets/{assetId}/download`; delete with `DELETE /api/v1/assets/{assetId}`.
- **Workflow:** `GET /api/v1/projects/{projectId}/workflow` initializes and returns the ten production stages. Approve a stage with `/workflow/{stageName}/approve`; retry with `/workflow/{stageName}/retry`.
- **Versions:** save a snapshot with `POST /api/v1/projects/{projectId}/versions`; list with `GET /api/v1/projects/{projectId}/versions`; restore with `POST /api/v1/versions/{versionId}/restore`.
- **Jobs:** list the current user's jobs with `GET /api/v1/jobs`; cancel a queued or running job with `POST /api/v1/jobs/{jobId}/cancel`.

## 10. Local upload implementation and production storage

The local upload API returns a short-lived token from `POST /api/v1/uploads/presigned-url`. Upload the multipart file with `PUT /api/v1/uploads/local/{uploadId}`, then finalize with `POST /api/v1/uploads/complete`. The token is bound to the user, project, file name, and size, and expires after 15 minutes.

The current implementation writes files under `STUDIO_STORAGE_DIR`. It is intended for local development. Production should replace it with a signed Cloudflare R2 or compatible object-storage integration and run Blender in isolated workers with resource limits.

## Troubleshooting

| Symptom | Check |
|---|---|
| Character returns `referenceImages: []` | Refresh Character Lab so it reloads project images, then generate again. The current frontend and backend save the uploaded asset IDs on generation. |
| Job remains queued | Confirm Redis is running, restart the API after configuration changes, and either leave `RUN_WORKER_IN_API` enabled or start `python -m app.worker` separately. |
| Job says `ADAPTER_NOT_CONFIGURED` | Add and configure an AI provider adapter for that job type. |
| Blender job says `BLENDER_NOT_CONFIGURED` | Set `BLENDER_EXECUTABLE` to Blender 5 or add Blender to `PATH`, then restart the worker. |
| Asset metadata loads but file download fails | Check that the file still exists under `STUDIO_STORAGE_DIR` and that the API process can read it. |

