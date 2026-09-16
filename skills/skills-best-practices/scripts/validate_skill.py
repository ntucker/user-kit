#!/usr/bin/env python3
"""Validate a skill folder against the Agent Skills spec and Cursor conventions.

Checks core frontmatter fields, name/folder agreement, size budgets, referenced files,
and authoring conventions (linked references, skill "name" form for other skills, no
Windows paths, no "When to use" body section).
Python 3.8+, stdlib only; parses the YAML subset skills actually use (scalars, block
scalars, one-level maps and lists).

Exit codes: 0 valid (warnings may be present); 1 errors found; 2 usage or unreadable input.
"""
import argparse
import json
import os
import re
import sys

NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
COLORS = {"default", "green", "cyan", "blue", "purple", "magenta", "orange", "yellow", "red", "brand"}
KNOWN_FIELDS = {
    "name", "description", "license", "compatibility", "metadata", "allowed-tools",  # open spec
    "paths", "globs", "disable-model-invocation", "icon", "color",  # Cursor
}
BUNDLE_DIRS = ("scripts/", "references/", "assets/")
FENCE_RE = re.compile(r"^[ \t]*(`{3,}|~{3,}).*?^[ \t]*\1[ \t]*$", re.S | re.M)
LINK_RE = re.compile(r"\]\(\s*([^)\s#]+)(?:#[^)\s]*)?(?:\s+\"[^\"]*\")?\s*\)")
BLOCK_SCALAR_RE = re.compile(r"[>|](?:[+-]?\d?|\d?[+-]?)")
TRIGGER_RE = re.compile(r"\b(Use|Apply|Invoke|Load|Trigger)\b[^.]{0,40}?\b(when|whenever|for|if|to)\b", re.I)

def _unquote(value):
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        inner = value[1:-1]
        return inner.replace("''", "'") if value[0] == "'" else inner
    return value


def parse_frontmatter(text):
    if not text.startswith("---"):
        return None, text, "missing frontmatter"
    parts = text.split("\n---", 1)
    if len(parts) < 2:
        return None, text, "unterminated frontmatter"
    raw, body = parts[0][3:], parts[1].lstrip("\n")
    data, lines, i, last_key = {}, raw.split("\n"), 0, None
    while i < len(lines):
        line = lines[i]
        i += 1
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if line.startswith((" ", "\t")):
            if last_key and isinstance(data.get(last_key), str):
                data[last_key] = (data[last_key] + " " + line.strip()).strip()
                continue
            return None, body, "unexpected indentation at: %r" % line
        if ":" not in line:
            return None, body, "expected 'key: value' at: %r" % line
        key, _, value = line.partition(":")
        key, value, last_key = key.strip(), value.strip(), key.strip()
        if not value.startswith(('"', "'")):
            value = re.sub(r"\s+#.*$", "", value)
        if BLOCK_SCALAR_RE.fullmatch(value):
            block = []
            while i < len(lines) and (lines[i].startswith((" ", "\t")) or not lines[i].strip()):
                block.append(lines[i].strip())
                i += 1
            data[key] = (" " if value.startswith(">") else "\n").join(b for b in block if b).strip()
        elif value == "":
            nested, items = {}, []
            while i < len(lines) and (lines[i].startswith((" ", "\t")) or not lines[i].strip()):
                item = lines[i].strip()
                i += 1
                if item.startswith("- "):
                    items.append(_unquote(item[2:].strip()))
                elif ":" in item:
                    k, _, v = item.partition(":")
                    nested[k.strip()] = _unquote(v.strip())
            data[key] = items if items else nested
        else:
            data[key] = value
    for key, value in data.items():  # unquote after continuation lines are merged
        if isinstance(value, str):
            data[key] = _unquote(value)
    return data, body, None


def find_references(text):
    refs = set(LINK_RE.findall(text))
    refs |= set(re.findall(r"(?<![\w./<])((?:scripts|references|assets)/[\w/-]+(?:\.[\w-]+)+)", text))
    return sorted(r for r in refs if not r.startswith(("http://", "https://", "~", "/")) and "<" not in r)


def validate(skill_dir):
    errors, warnings, info = [], [], {}
    skill_dir = os.path.abspath(skill_dir.rstrip("/"))
    path = os.path.join(skill_dir, "SKILL.md")
    if not os.path.isfile(path):
        return ["SKILL.md not found in %s" % skill_dir], warnings, info
    with open(path, encoding="utf-8-sig") as f:
        text = f.read()
    fm, body, err = parse_frontmatter(text)
    if err:
        return ["frontmatter: %s" % err], warnings, info

    folder = os.path.basename(skill_dir)
    name = fm.get("name")
    if not isinstance(name, str):
        errors.append("name: required" if name is None else "name: must be a string")
    elif not name:
        errors.append("name: required")
    else:
        if not NAME_RE.match(name) or len(name) > 64:
            errors.append("name: %r must be 1-64 chars of a-z, 0-9, hyphens; no leading/trailing/double hyphens" % name)
        if name != folder:
            errors.append("name: %r must match folder name %r" % (name, folder))

    invocation = fm.get("disable-model-invocation")
    if invocation is not None and str(invocation).lower() not in {"true", "false"}:
        errors.append("disable-model-invocation: must be true or false")
    explicit_only = str(invocation or "").lower() == "true"
    desc = fm.get("description")
    if not isinstance(desc, str):
        errors.append("description: required" if desc is None else "description: must be a string")
    elif not desc:
        errors.append("description: required")
    else:
        if len(desc) > 1024:
            errors.append("description: %d chars exceeds 1024" % len(desc))
        if re.match(r"^(I |I'm|You can|You should)", desc):
            warnings.append("description: avoid first/second person aimed at the user; state capability, then 'Use when...'")
        if not explicit_only and not TRIGGER_RE.search(desc):
            warnings.append("description: no trigger clause ('Use when...'); auto-invocation relies on it")
        info["description_chars"] = len(desc)

    compat = fm.get("compatibility")
    if compat is not None:
        if not isinstance(compat, str):
            errors.append("compatibility: must be a string")
        elif len(compat) > 500:
            errors.append("compatibility: %d chars exceeds 500" % len(compat))
    paths = fm.get("paths")
    if paths is not None and not (
        isinstance(paths, str)
        or isinstance(paths, list) and paths and all(isinstance(item, str) and item for item in paths)
    ):
        errors.append("paths: must be a string or non-empty list of strings")
    metadata = fm.get("metadata")
    if metadata is not None and not (
        isinstance(metadata, dict)
        and all(isinstance(k, str) and isinstance(v, str) for k, v in metadata.items())
    ):
        errors.append("metadata: must be a string-to-string map")
    color = fm.get("color")
    if color is not None and color not in COLORS:
        errors.append("color: %r is not one of %s" % (color, ", ".join(sorted(COLORS))))
    if "globs" in fm:
        warnings.append("frontmatter: 'globs' is legacy in Cursor; use 'paths'")
    unknown = sorted(set(fm) - KNOWN_FIELDS)
    if unknown:
        info["unknown_fields"] = unknown

    body_lines = body.count("\n") + 1
    est_tokens = len(body) // 4
    info.update({"body_lines": body_lines, "body_tokens_estimate": est_tokens})
    if body_lines > 500:
        warnings.append("body: %d lines exceeds the 500-line guideline; move detail to references/" % body_lines)
    if est_tokens > 5000:
        warnings.append("body: ~%d tokens exceeds the 5000-token guideline" % est_tokens)
    prose = FENCE_RE.sub("", body)  # fenced examples are not the skill's own instructions
    if not explicit_only and re.search(r"^#+\s*When to use", prose, re.I | re.M):
        warnings.append("body: 'When to use' section cannot affect auto-triggering; put trigger conditions in the description")
    if re.search(r"\b(?:scripts|references|assets)\\\w|[A-Za-z]:\\", prose):
        warnings.append("body: Windows-style path found; use forward slashes")

    links = set(LINK_RE.findall(prose))
    prose_refs, body_refs = find_references(prose), find_references(body)
    missing, unresolved, chained = [], [], []
    for ref in prose_refs:
        target = os.path.join(skill_dir, ref)
        if not os.path.exists(target):
            # Only markdown links are unambiguous references; inline-code paths may be illustrative.
            if ref in links and ref.startswith(BUNDLE_DIRS):
                missing.append(ref)
            else:
                unresolved.append(ref)
        elif ref.endswith(".md"):
            with open(target, encoding="utf-8-sig") as f:
                sub = [r for r in find_references(FENCE_RE.sub("", f.read()))
                       if r.endswith(".md") and os.path.exists(os.path.join(skill_dir, r))]
            if sub:
                chained.append("%s -> %s" % (ref, ", ".join(sub)))
    fenced_missing = [r for r in body_refs if r not in prose_refs
                      and r.startswith(BUNDLE_DIRS) and not os.path.exists(os.path.join(skill_dir, r))]
    if missing:
        errors.append("references: missing files: %s" % ", ".join(missing))
    if fenced_missing:
        warnings.append("references: paths inside code blocks that do not exist (fine if illustrative): %s" % ", ".join(fenced_missing))
    if unresolved:
        warnings.append("references: paths not found under skill root (fine if illustrative; links resolve from the skill folder): %s" % ", ".join(unresolved))
    if chained:
        warnings.append("references: keep one level deep; nested chains: %s" % "; ".join(chained))

    linked = {l for l in links if l.endswith(".md")}
    bare = sorted(set(re.findall(r"`((?:references|assets)/[\w./-]+\.md)`", prose)) - linked)
    if bare:
        warnings.append("convention: link documents as [Concept Name](path) rather than bare paths: %s" % ", ".join(bare))
    path_as_text = sorted({p for t, p in re.findall(r"\[([^\]]+)\]\(([^)\s#]+\.md)[^)]*\)", prose) if t.strip("`") == p})
    if path_as_text:
        warnings.append("convention: link text should name the concept, not repeat the path: %s" % ", ".join(path_as_text))
    by_path = set(re.findall(r"(?:skills-cursor|skills)/([a-z0-9-]+)/SKILL\.md", prose))
    other_skills = sorted(by_path - {folder})
    if other_skills:
        warnings.append('convention: refer to other skills as skill "name", not by path or slash command: %s' % ", ".join(other_skills))
    return errors, warnings, info


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("skill_dir")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    args = ap.parse_args()
    if not os.path.isdir(args.skill_dir):
        ap.error("%s is not a directory" % args.skill_dir)
    errors, warnings, info = validate(args.skill_dir)
    if args.json:
        print(json.dumps({"valid": not errors, "errors": errors, "warnings": warnings, "info": info}, indent=2))
    else:
        for e in errors:
            print("ERROR   " + e)
        for w in warnings:
            print("WARNING " + w)
        print("%s: %s (%s)" % ("INVALID" if errors else "OK", args.skill_dir, ", ".join("%s=%s" % kv for kv in info.items())))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
