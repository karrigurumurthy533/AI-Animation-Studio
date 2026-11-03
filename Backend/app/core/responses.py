from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


class ApiException(Exception):
    def __init__(self, status_code: int, code: str, message: str, details: Any = None):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or []


def success(message: str, data: Any, status_code: int = 200) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"success": True, "message": message, "data": data},
    )


async def api_exception_handler(_: Request, exc: ApiException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.message,
            "error": {"code": exc.code, "details": exc.details},
        },
    )


async def http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    message = str(exc.detail) if isinstance(exc.detail, str) else "Request failed"
    return JSONResponse(
        status_code=exc.status_code,
        headers=exc.headers,
        content={
            "success": False,
            "message": message,
            "error": {"code": "HTTP_ERROR", "details": []},
        },
    )


async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    details = [
        {"field": ".".join(str(part) for part in item["loc"]), "message": item["msg"], "type": item["type"]}
        for item in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Request validation failed",
            "error": {"code": "VALIDATION_ERROR", "details": details},
        },
    )
