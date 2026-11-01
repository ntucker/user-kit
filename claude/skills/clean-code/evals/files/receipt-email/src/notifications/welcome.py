from ..orders.model import User
from .mailer import send_email


def send_welcome(user: User) -> None:
    send_email(user.email, "Welcome aboard", f"Hi {user.name}, thanks for signing up.")
