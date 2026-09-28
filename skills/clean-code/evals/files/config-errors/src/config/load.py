import json
import logging
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Config:
    api_url: str = "https://api.example.com"
    timeout_s: float = 10.0
    retries: int = 3

    @classmethod
    def parse(cls, text: str) -> "Config":
        data = json.loads(text)
        return cls(**data)


def load_config(path: Path) -> Config:
    try:
        return Config.parse(path.read_text())
    except Exception:
        logger.warning("config load failed")
        return Config()
