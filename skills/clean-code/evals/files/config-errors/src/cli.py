import sys
from pathlib import Path

from .config.load import load_config


def main(argv: list[str]) -> int:
    path = Path(argv[1]) if len(argv) > 1 else Path.home() / ".exampleapp.json"
    config = load_config(path)
    print(f"Using {config.api_url} (timeout {config.timeout_s}s, {config.retries} retries)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
