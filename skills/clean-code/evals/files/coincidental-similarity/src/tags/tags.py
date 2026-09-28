MAX_TAGS = 10


def normalize_tag(raw: str) -> str:
    return raw.strip().lower()


def parse_tags(raw: str) -> list[str]:
    tags: list[str] = []
    for part in raw.split(","):
        tag = normalize_tag(part)
        if tag and tag not in tags:
            tags.append(tag)
    return tags[:MAX_TAGS]
