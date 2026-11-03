from datetime import datetime
from typing import Any

from bson import ObjectId


def public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(user["_id"] if isinstance(user.get("_id"), ObjectId) else user.get("_id")),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "avatar": user.get("avatar"),
        "role": user.get("role", "user"),
        "emailVerified": bool(user.get("emailVerified", False)),
        "accountStatus": user.get("accountStatus", "active"),
        "createdAt": _iso(user.get("createdAt")),
        "updatedAt": _iso(user.get("updatedAt")),
    }


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None
