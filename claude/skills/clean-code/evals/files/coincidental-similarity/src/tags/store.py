from .normalize import normalize_tag


def add_tag(post: dict, raw_tag: str) -> None:
    tag = normalize_tag(raw_tag)
    if tag and tag not in post["tags"]:
        post["tags"].append(tag)
