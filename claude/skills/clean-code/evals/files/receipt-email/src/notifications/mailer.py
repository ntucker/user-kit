import smtplib
from email.message import EmailMessage

from ..settings import SMTP_HOST, FROM_ADDRESS


def send_email(to: str, subject: str, body: str) -> None:
    msg = EmailMessage()
    msg["From"] = FROM_ADDRESS
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP(SMTP_HOST) as smtp:
        smtp.send_message(msg)
