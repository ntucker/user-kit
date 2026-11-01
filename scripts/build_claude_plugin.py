#!/usr/bin/env python3
"""Build the Claude Code plugin in `claude/` from the Cursor tree.

The plugin root is `claude/`, not the repo root, because Claude surfaces that
scan a plugin's default `agents/` directory (the claude.ai plugin page does,
even when the manifest lists other files) would otherwise list every agent
twice and could run the Cursor copy. So `claude/` holds:

- `agents/<name>.md`: Claude Code copies of `agents/*.md`. Cursor frontmatter
  (`model: claude-opus-5-5[effort=high]`) is sent to the API verbatim and 404s,
  so `model` and `effort` are split and Cursor's `readonly: true` becomes
  `disallowedTools`. An agent on another provider's model (Gemini, GPT) is
  Cursor-only and gets no copy.
- `skills/` and `workflows/`: byte-for-byte mirrors of the shared sources.
- `.claude-plugin/plugin.json`: hand-written, with no component lists, since
  the defaults above are exactly the plugin's contents.

An agent can also ship its instructions to Claude Code as a skill, for when a
subagent on the session's own model would only lose the conversation's context.
Its body then carries markers, which Cursor reads as HTML comments:

    <!-- claude-skill-description: ... -->   opts in; the skill's description
    <!-- claude-skill                        text only the skill gets
    ...
    -->
    <!-- subagent-only -->                   text only the subagent gets
    ...
    <!-- /subagent-only -->

The skill is written to `claude/skills/<name>/SKILL.md`, which Cursor does not load.

    python3 scripts/build_claude_plugin.py          # regenerate
    python3 scripts/build_claude_plugin.py --check  # exit 1 if out of date
"""

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "agents"
PLUGIN = ROOT / "claude"
TARGET = PLUGIN / "agents"
SKILLS = PLUGIN / "skills"
MIRRORED = ("skills", "workflows")
GENERATED = (TARGET, SKILLS, PLUGIN / "workflows")

MODEL_LINE = re.compile(r"^model:\s*(\S+?)(?:\[effort=([\w-]+)\])?\s*$", re.M)
READONLY_LINE = re.compile(r"^readonly:\s*true\s*$", re.M)
HEADER = "<!-- Generated from agents/{name} by scripts/build_claude_plugin.py. Do not edit. -->\n"
SKILL_DESCRIPTION = re.compile(r"^<!-- claude-skill-description: (.+?) -->\n", re.M)
SKILL_ONLY = re.compile(r"^<!-- claude-skill\n(.*?)^-->\n", re.M | re.S)
SUBAGENT_ONLY = re.compile(r"^<!-- subagent-only -->\n(.*?)^<!-- /subagent-only -->\n", re.M | re.S)
ANY_MARKER = re.compile(r"<!-- /?(subagent-only|claude-skill)")


CLAUDE_MODEL = re.compile(r"claude-[\w.-]+|opus|sonnet|haiku|fable|inherit")
OTHER_PROVIDER_MODEL = re.compile(r"(gemini|gpt|grok|composer)(-[\w.-]+)?")
EFFORTS = {"low", "medium", "high", "xhigh", "max"}


def to_claude(name: str, frontmatter: str) -> str | None:
    """Rewrite Cursor frontmatter for Claude Code, failing on values Claude Code would reject.

    Returns None for another provider's model: that agent is Cursor-only."""
    model = MODEL_LINE.search(frontmatter)
    if model and OTHER_PROVIDER_MODEL.fullmatch(model.group(1)):
        return None

    def replace(match: re.Match) -> str:
        model, effort = match.group(1), match.group(2)
        if not CLAUDE_MODEL.fullmatch(model):
            sys.exit(f"agents/{name}: model {model!r} is not a Claude Code model")
        if effort and effort not in EFFORTS:
            sys.exit(f"agents/{name}: effort {effort!r} is not one of {sorted(EFFORTS)}")
        return f"model: {model}" + (f"\neffort: {effort}" if effort else "")

    frontmatter = MODEL_LINE.sub(replace, frontmatter, count=1)
    return READONLY_LINE.sub("disallowedTools: Write, Edit, NotebookEdit", frontmatter, count=1)


def render(name: str, body: str, target: str) -> str:
    """Keep the marked blocks for `target` ("skill" or "agent") and drop the other's."""
    keep, drop = (SKILL_ONLY, SUBAGENT_ONLY) if target == "skill" else (SUBAGENT_ONLY, SKILL_ONLY)
    out = keep.sub(r"\1", drop.sub("", SKILL_DESCRIPTION.sub("", body)))
    if ANY_MARKER.search(out):
        sys.exit(f"agents/{name}: unmatched marker left in the generated {target}")
    return out


def expected() -> dict[Path, tuple[bytes, bool]]:
    """Every generated file, as (contents, executable)."""
    files: dict[Path, tuple[bytes, bool]] = {}
    for source in mirrored_sources():
        files[PLUGIN / source.relative_to(ROOT)] = (source.read_bytes(), is_executable(source))
    for source in sorted(SOURCE.glob("*.md")):
        text = source.read_text()
        frontmatter_end = text.index("\n---", 3) + len("\n---\n")
        frontmatter, body = text[:frontmatter_end], text[frontmatter_end:]
        header = HEADER.format(name=source.name)
        opened, closed = body.count("<!-- subagent-only -->"), body.count("<!-- /subagent-only -->")
        if opened != closed or opened != len(SUBAGENT_ONLY.findall(body)):
            sys.exit(f"agents/{source.name}: subagent-only markers do not pair up")
        if description := SKILL_DESCRIPTION.search(body):
            skill = SKILLS / source.stem / "SKILL.md"
            if skill in files:
                sys.exit(f"agents/{source.name}: skills/{source.stem} already exists")
            files[skill] = (
                (
                    f"---\nname: {source.stem}\ndescription: {json.dumps(description.group(1))}\n---\n"
                    + header
                    + render(source.name, body, "skill")
                ).encode(),
                False,
            )
        elif ANY_MARKER.search(body):
            sys.exit(f"agents/{source.name}: has skill markers but no claude-skill-description line")
        if (claude_frontmatter := to_claude(source.name, frontmatter)) is not None:
            files[TARGET / source.name] = ((claude_frontmatter + header + render(source.name, body, "agent")).encode(), False)
    return files


def mirrored_sources() -> list[Path]:
    """Files under MIRRORED that git tracks or would track, so .DS_Store and caches stay out."""
    listing = subprocess.run(
        ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", *MIRRORED],
        cwd=ROOT, capture_output=True, check=True, text=True,
    ).stdout
    return sorted(path for name in listing.split("\0") if name and (path := ROOT / name).is_file())


def is_executable(path: Path) -> bool:
    return bool(path.stat().st_mode & 0o100)


def main() -> int:
    files = expected()
    existing = {path for directory in GENERATED for path in directory.rglob("*") if path.is_file()}
    stale = sorted(
        {path for path, (data, executable) in files.items()
         if not path.exists() or path.read_bytes() != data or is_executable(path) != executable}
        | (existing - files.keys())
    )
    if "--check" in sys.argv:
        for path in stale:
            print(f"out of date: {path.relative_to(ROOT)}")
        if stale:
            print("run: python3 scripts/build_claude_plugin.py")
        return 1 if stale else 0
    for path in stale:
        if path in files:
            data, executable = files[path]
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            path.chmod(0o755 if executable else 0o644)
        else:
            path.unlink()
            for parent in path.parents:
                if parent == PLUGIN or any(parent.iterdir()):
                    break
                parent.rmdir()
    return 0


if __name__ == "__main__":
    sys.exit(main())
