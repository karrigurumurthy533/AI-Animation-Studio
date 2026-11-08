from pymongo import ASCENDING, DESCENDING
from pymongo.asynchronous.database import AsyncDatabase


async def ensure_indexes(db: AsyncDatabase) -> None:
    await db.users.create_index([("email", ASCENDING)], unique=True, name="uq_users_email")
    await db.users.create_index([("accountStatus", ASCENDING)], name="ix_users_status")

    await db.projects.create_index([("userId", ASCENDING), ("updatedAt", DESCENDING)], name="ix_projects_owner_updated")
    await db.projects.create_index([("status", ASCENDING)], name="ix_projects_status")

    await db.characters.create_index([("projectId", ASCENDING)], name="ix_characters_project")
    await db.assets.create_index([("projectId", ASCENDING), ("assetType", ASCENDING)], name="ix_assets_project_type")
    await db.workflowStages.create_index([("projectId", ASCENDING), ("stageOrder", ASCENDING)], unique=True, name="uq_workflow_project_order")
    await db.jobs.create_index([("status", ASCENDING), ("createdAt", ASCENDING)], name="ix_jobs_status_created")
    await db.jobs.create_index([("projectId", ASCENDING)], name="ix_jobs_project")
    await db.scenes.create_index([("projectId", ASCENDING), ("sceneOrder", ASCENDING)], name="ix_scenes_project_order")
    await db.projectVersions.create_index([("projectId", ASCENDING), ("versionNumber", ASCENDING)], unique=True, name="uq_versions_project_number")
    await db.animations.create_index([("projectId", ASCENDING), ("createdAt", DESCENDING)], name="ix_animations_project_created")
    await db.materials.create_index([("characterId", ASCENDING), ("createdAt", DESCENDING)], name="ix_materials_character_created")
    await db.lighting.create_index([("projectId", ASCENDING), ("createdAt", DESCENDING)], name="ix_lighting_project_created")
    await db.jobs.create_index([("userId", ASCENDING), ("createdAt", DESCENDING)], name="ix_jobs_user_created")
