import asyncio
import smtplib
from email.message import EmailMessage

from app.core.config import settings


def _send(message: EmailMessage) -> None:
    if not settings.smtp_host:
        raise RuntimeError("SMTP is not configured")
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if settings.smtp_username and settings.smtp_password:
            server.login(settings.smtp_username, settings.smtp_password.get_secret_value())
        server.send_message(message)


async def send_password_reset(email: str, token: str) -> None:
    reset_url = f"{settings.frontend_url.rstrip('/')}/reset-password?token={token}"
    message = EmailMessage()
    message["Subject"] = "Reset your AI Animation Studio password"
    message["From"] = settings.smtp_from_email
    message["To"] = email
    message.set_content(
        "A password reset was requested for your AI Animation Studio account. "
        f"This link expires in {settings.password_reset_minutes} minutes:\n\n{reset_url}\n\n"
        "If you did not request this, you can ignore this message."
    )
    await asyncio.to_thread(_send, message)
