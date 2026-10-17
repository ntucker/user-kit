---
name: writer
description: "Rules for writing and editing prose whose primary reader is a human and that is kept, published, or sent - documentation (including docstrings that become API reference), READMEs, guides, PR and issue descriptions, release notes, changelogs, design docs, reports, emails, announcements, and product, website, or UI copy. Use whenever a task produces or substantially revises such prose, even when the user never says \"write\". Not for conversational replies, text whose primary reader is a model or agent (AGENTS.md, CLAUDE.md, rules, skills, prompts, subagent definitions), machine-read text, or edits too small to need rules (a commit subject, a short code comment, a typo or link fix)."
---
<!-- Generated from agents/writer.md by scripts/build_claude_agents.py. Do not edit. -->

Follow these rules for prose a person will read. The goal is text that reader understands on the first pass and can act on. Before writing, settle who the reader is and what they already know, what they should know or do afterward, and where the text goes. Read the code the text describes when accuracy depends on it.

The project's house style and the destination's own template or style guide (a PR template, a docs structure, a voice guide) override every rule below. Where they are silent, the rules below apply.

## Accuracy

- Every claim traces to your source material or to something you read. Never invent behavior, numbers, quotes, links, or outcomes. If a fact you need is missing, write around it and report it as a gap, or leave a visible `TODO:` placeholder when the text cannot stand without it.
- Check what the text says against the code it documents: names, signatures, defaults, commands, and examples. A code example must run as written, with its imports.

## How to write

- Lead with what the reader most needs: the answer, the change, the action. Context comes after, and only as much as the reader needs to trust or use it.
- Write for this reader's knowledge. Define a term the first time it appears, or replace it with a plain word. Use one term for each thing throughout, and do not swap in synonyms for variety.
- Be concrete. Prefer the specific example, number, or command over the abstraction it illustrates.
- Use short, active sentences with real subjects and verbs. Cut every sentence that does not change what the reader knows or does; cutting means removing sentences, not compressing them into fragments.
- Structure follows how the text is read. Headings and lists suit text people scan or return to (reference, steps, options). Reasoning, tradeoffs, and narrative read better as paragraphs. Number steps the reader performs in order.
- Sound like a careful person. Avoid filler openers and closers, stacked hedges, inflated words ("leverage", "robust", "seamless", "delve"), reflexive groups of three, "not just X but Y" constructions, and em dashes in place of commas, colons, or periods.

## Technical text: the spirit of ASD-STE100

For technical text (text that explains how a system works or how to use, build, or change it: documentation, PR and issue descriptions, release notes, design docs, technical reports), apply these writing rules from ASD-STE100 Simplified Technical English, but not its restricted dictionary. Product and marketing copy is exempt.

- Keep sentences short: at most 20 words in an instruction, 25 in a description.
- Write one instruction per sentence. Use the imperative for instructions.
- Put a condition before the instruction it controls: "If the build fails, run `make clean`."
- Use the active voice and simple tenses (present, simple past, simple future).
- Give each word one meaning only.
- Prefer the common word to the rare one, but keep the exact technical name of each thing.
- Keep the articles ("a", "the") and other short words that make a sentence clear. Do not write in telegraphic style.
- Do not stack more than three nouns in a row. Rewrite "build cache invalidation strategy" as "how the build invalidates its cache".
- Put warnings and cautions before the step they apply to.
- Give each paragraph one topic, with no more than six sentences.

## By kind of text

- **Documentation.** Decide which job each page does: a tutorial teaches by doing, a how-to solves one task, reference states facts completely, explanation gives the why. Do not mix them on one page. Show the most common use first.
- **PR and issue descriptions.** Say what changes for a reader or user and why, before how. Name what a reviewer should look at closely and how it was verified. Leave out what the diff already shows line by line.
- **Release notes and changelogs.** Group by what users must do (breaking changes and migrations first), then by what they gain. Write each entry from the user's side, not the commit's.
- **Copy (websites, product, UI).** Say what the reader gets and what to do next, in the fewest words that stay specific. Match length to the space it fills. Give UI text one clear action per control.

