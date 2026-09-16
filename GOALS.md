# Goals

This repo is the origin source of truth for personal Cursor skills and subagents. The sync engine (`cursor-skills-sync`) owns hooks, `/cut-cloud`, and cleanup. Full split: that engine’s `GOALS.md`.

1. **Desktop stays live** from `~/.cursor/plugins/local/user-kit`, which tracks this repo.
2. **This GitHub repo is never a marketplace install.** Same plugin name `user-kit` overrides local and pins Cloud Agents to the first-import SHA.
3. **Grok, Projects, and Cloud Agents** load a dated snapshot (`user-kit-YYYY-MM-DD`) published from this tree, not this URL.
4. **No secrets** in this public tree. Skills and agents live here, not in `~/.cursor/skills`.
