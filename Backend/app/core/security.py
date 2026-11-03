from datetime import datetime, timezone

from pwdlib import PasswordHash

password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password, password_hash)
    except (ValueError, TypeError):
        return False


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
