from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ProjectBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid", populate_by_name=True)


class ProjectCreate(ProjectBase):
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=2000)
    projectType: str = Field(default="Character film", min_length=2, max_length=80)


class ProjectUpdate(ProjectBase):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    projectType: str | None = Field(default=None, min_length=2, max_length=80)
    currentStage: Literal["image_upload", "image_analysis", "model_generation", "mesh_editing", "materials", "rigging", "animation", "lighting", "rendering", "export"] | None = None
    status: Literal["draft", "active", "completed", "archived"] | None = None
    thumbnail: str | None = Field(default=None, max_length=2048)
    settings: dict[str, Any] | None = None


def public_project(project: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(project["_id"]),
        "name": project.get("name", ""),
        "description": project.get("description", ""),
        "projectType": project.get("projectType", "Character film"),
        "status": project.get("status", "draft"),
        "thumbnail": project.get("thumbnail"),
        "currentStage": project.get("currentStage", "image_upload"),
        "settings": project.get("settings", {}),
        "createdAt": project.get("createdAt").isoformat() if project.get("createdAt") else None,
        "updatedAt": project.get("updatedAt").isoformat() if project.get("updatedAt") else None,
    }
