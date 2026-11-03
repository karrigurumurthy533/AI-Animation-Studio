from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class AuthBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class RegisterRequest(AuthBase):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class LoginRequest(AuthBase):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class ForgotPasswordRequest(AuthBase):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class ResetPasswordRequest(AuthBase):
    token: str = Field(min_length=32, max_length=512)
    new_password: str = Field(min_length=8, max_length=128)


class ChangePasswordRequest(AuthBase):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ProfileUpdateRequest(AuthBase):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    avatar: str | None = Field(default=None, max_length=2048)
