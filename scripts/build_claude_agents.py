#!/usr/bin/env python3
"""Generate Claude Code copies of the Cursor subagents.

`agents/*.md` keeps Cursor frontmatter (`model: claude-opus-5-5[effort=high]`),
which Claude Code sends to the API verbatim and gets a 404. This writes
`claude/agents/<name>.md` with `model` and `effort` split and Cursor's
`readonly: true` expressed as `disallowedTools`, and points
`.claude-plugin/plugin.json` at those files so Claude Code skips `agents/`.

    python3 scripts/build_claude_agents.py          # regenerate
    python3 scripts/build_claude_agents.py --check  # exit 1 if out of date
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "agents"
TARGET = ROOT / "claude" / "agents"
MANIFEST = ROOT / ".claude-plugin" / "plugin.json"

MODEL_LINE = re.compile(r"^model:\s*(\S+?)(?:\[effort=(\w+)\])?\s*$", re.M)
READONLY_LINE = re.compile(r"^readonly:\s*true\s*$", re.M)
HEADER = "<!-- Generated from agents/{name} by scripts/build_claude_agents.py. Do not edit. -->\n"


def to_claude(text: str) -> str:
    def replace(match: re.Match) -> str:
        model, effort = match.group(1), match.group(2)
        if re.fullmatch(r"(opus|sonnet|haiku|fable)-\d.*", model):
            model = f"claude-{model}"
        return f"model: {model}" + (f"\neffort: {effort}" if effort else "")

    text = MODEL_LINE.sub(replace, text, count=1)
    return READONLY_LINE.sub("disallowedTools: Write, Edit, NotebookEdit", text, count=1)


def expected() -> dict[Path, str]:
    files = {}
    for source in sorted(SOURCE.glob("*.md")):
        text = to_claude(source.read_text())
        frontmatter_end = text.index("\n---", 3) + len("\n---\n")
        files[TARGET / source.name] = (
            text[:frontmatter_end] + HEADER.format(name=source.name) + text[frontmatter_end:]
        )
    manifest = json.loads(MANIFEST.read_text())
    manifest["agents"] = [f"./{path.relative_to(ROOT)}" for path in files]
    files[MANIFEST] = json.dumps(manifest, indent=2) + "\n"
    return files


def main() -> int:
    files = expected()
    stale = sorted(
        {path for path, text in files.items() if not path.exists() or path.read_text() != text}
        | {path for path in TARGET.glob("*.md") if path not in files}
    )
    if "--check" in sys.argv:
        for path in stale:
            print(f"out of date: {path.relative_to(ROOT)}")
        if stale:
            print("run: python3 scripts/build_claude_agents.py")
        return 1 if stale else 0
    TARGET.mkdir(parents=True, exist_ok=True)
    for path in stale:
        if path in files:
            path.write_text(files[path])
        else:
            path.unlink()
    return 0


if __name__ == "__main__":
    sys.exit(main())
