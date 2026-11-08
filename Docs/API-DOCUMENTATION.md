# AI ANIMATION STUDIO
# API DOCUMENTATION

**Version:** 1.0.0  
**Base URL:** /api/v1  
**Protocol:** HTTPS  
**Format:** JSON  
**Authentication:** Bearer JWT

## 1. API Standards

All API endpoints must follow REST conventions.

Success response:

{
  "success": true,
  "message": "Operation completed",
  "data": {}
}

Error response:

{
  "success": false,
  "message": "Operation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": []
  }
}

## 2. Authentication APIs

POST /auth/register

POST /auth/login

POST /auth/logout

POST /auth/refresh

POST /auth/forgot-password

POST /auth/reset-password

GET /auth/me

## 3. User APIs

GET /users/profile

PATCH /users/profile

PATCH /users/password

DELETE /users/account

## 4. Project APIs

POST /projects

GET /projects

GET /projects/{projectId}

PATCH /projects/{projectId}

DELETE /projects/{projectId}

POST /projects/{projectId}/duplicate

## 5. Image Upload APIs

POST /projects/{projectId}/uploads

POST /uploads/presigned-url

POST /uploads/complete

For local development, the presigned upload response points to a short-lived
PUT /uploads/local/{uploadId} endpoint. The upload token is bound to the
authenticated owner, project, file name, and declared file size. Production
deployments should replace this local route with signed object-storage URLs.

GET /assets/{assetId}

DELETE /assets/{assetId}

Uploads should support signed object-storage URLs.

## 6. AI Image Analysis APIs

POST /projects/{projectId}/analysis

GET /jobs/{jobId}

GET /projects/{projectId}/analysis

## 7. 3D Generation APIs

POST /projects/{projectId}/models/generate

GET /projects/{projectId}/models

GET /models/{modelId}

POST /models/{modelId}/regenerate

POST /models/{modelId}/approve

## 8. Mesh Editing APIs

POST /models/{modelId}/mesh/validate

POST /models/{modelId}/mesh/repair

POST /models/{modelId}/mesh/retopology

POST /models/{modelId}/mesh/smooth

POST /models/{modelId}/mesh/optimize

GET /models/{modelId}/mesh/report

## 9. Materials APIs

GET /characters/{characterId}/materials

POST /characters/{characterId}/materials

PATCH /materials/{materialId}

POST /materials/{materialId}/generate-texture

POST /materials/{materialId}/apply

## 10. Rigging APIs

POST /characters/{characterId}/rigging/generate

GET /characters/{characterId}/rigging

POST /characters/{characterId}/rigging/validate

POST /characters/{characterId}/rigging/weight-paint

POST /characters/{characterId}/rigging/approve

## 11. Animation APIs

GET /animations/library

POST /characters/{characterId}/animations

POST /characters/{characterId}/animations/generate

GET /projects/{projectId}/animations

PATCH /animations/{animationId}

DELETE /animations/{animationId}

## 12. Lighting APIs

GET /projects/{projectId}/lighting

POST /projects/{projectId}/lighting

PATCH /projects/{projectId}/lighting/{lightingId}

POST /projects/{projectId}/lighting/preview

## 13. Scene APIs

POST /projects/{projectId}/scenes

GET /projects/{projectId}/scenes

GET /scenes/{sceneId}

PATCH /scenes/{sceneId}

DELETE /scenes/{sceneId}

POST /scenes/{sceneId}/generate

## 14. Rendering APIs

POST /scenes/{sceneId}/render

GET /renders/{renderId}

POST /renders/{renderId}/cancel

GET /projects/{projectId}/renders

## 15. Export APIs

POST /projects/{projectId}/export

GET /exports/{exportId}

GET /projects/{projectId}/exports

Supported formats:

- BLEND
- GLB
- GLTF
- FBX
- OBJ
- MP4

Processing jobs are pushed to the Redis `studio:jobs` queue. Run the separate
local worker with `python -m app.worker` from `Backend`. Set
`BLENDER_EXECUTABLE` and `STUDIO_STORAGE_DIR` for Blender jobs and local asset
storage. Jobs for AI capabilities without a configured provider adapter end
with `ADAPTER_NOT_CONFIGURED`.

## 16. Workflow APIs

GET /projects/{projectId}/workflow

GET /projects/{projectId}/workflow/{stageName}

POST /projects/{projectId}/workflow/{stageName}/approve

POST /projects/{projectId}/workflow/{stageName}/retry

## 17. Job Management APIs

GET /jobs/{jobId}

GET /jobs

POST /jobs/{jobId}/cancel

GET /jobs/{jobId}/logs

## 18. Version APIs

POST /projects/{projectId}/versions

GET /projects/{projectId}/versions

GET /versions/{versionId}

POST /versions/{versionId}/restore

## 19. API Security

- JWT authentication.
- Project ownership validation.
- Role-based authorization.
- Rate limiting.
- Request validation.
- Upload size limits.
- File type validation.
- Signed file URLs.
- Secure API error handling.

## 20. Background Job Contract

Heavy processing endpoints should return HTTP 202 Accepted.

Example:

{
  "success": true,
  "message": "Processing queued",
  "data": {
    "jobId": "JOB_ID",
    "status": "queued",
    "progress": 0
  }
}

Job status values:

- pending
- queued
- processing
- completed
- failed
- cancelled

## 21. Real-Time Updates

Use WebSocket or Server-Sent Events for:

- Processing progress.
- Blender job status.
- Model generation status.
- Rendering status.
- Notifications.

## 22. API Documentation

Use FastAPI-generated OpenAPI documentation.

Development documentation:

/docs

Alternative API reference:

/redoc

**Document Status:** Initial API Contract
