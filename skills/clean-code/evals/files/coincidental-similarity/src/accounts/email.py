from dataclasses import dataclass


def normalize_email(raw: str) -> str:
    return raw.strip().lower()


@dataclass(frozen=True)
class Account:
    email: str
    display_name: str


def create_account(raw_email: str, display_name: str) -> Account:
    return Account(email=normalize_email(raw_email), display_name=display_name.strip())
