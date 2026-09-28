from collections.abc import Iterable


def find_posts_by_tag(posts: Iterable[dict], raw_tag: str) -> list[dict]:
    wanted = raw_tag.strip().lower()
    return [post for post in posts if wanted in {t.strip().lower() for t in post["tags"]}]
