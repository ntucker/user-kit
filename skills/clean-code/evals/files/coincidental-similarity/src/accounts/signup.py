from dataclasses import dataclass


@dataclass(frozen=True)
class Signup:
    email: str
    display_name: str


def normalize_email(raw: str) -> str:
    return raw.strip().lower()


def create_signup(raw_email: str, display_name: str) -> Signup:
    email = normalize_email(raw_email)
    if "@" not in email:
        raise ValueError(f"Not an email address: {raw_email!r}")
    return Signup(email=email, display_name=display_name.strip())
