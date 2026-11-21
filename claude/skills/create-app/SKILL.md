---
name: "create-app"
description: "Creates a new app repository in the person's app family, set up the way ntucker/chess (Opening Night) is - the same stack, global config, infrastructure, CI and deploys, and Claude project process (GOALS.md, AGENTS.md, PROJECTS.md, autoland) - for a different app. Use when the person asks for a new app made like chess (a stock app, a poker app), or says \"another one of these\", \"fork or clone this setup for X\", or \"start a project like this one for X\", even if they never say \"create-app\". Not for a one-off prototype, artifact or script, an app on a stack with no tie to chess, a feature or thread in a repo that already exists, or setting up a Claude project on an existing repo."
---

# Create an app like the reference app

The reference repo is `ntucker/chess` unless the person names another app made this way. The new app takes everything in the reference that would be true of any app, leaves what is about the reference's domain, and gets its own brand. The reference's files are the source of truth for the stack, versions, config, code and process: read them as they are on its default branch today. This skill holds only what they can't tell you. If you can't read the reference at a commit, stop and ask for it to be attached; never scaffold from memory.

## 1. Learn the app

Ask once, in one message, and lead with what you will assume so the person only answers what differs:

- Name and one-line purpose. The purpose becomes the project goal and the autoland reviewer's brief.
- Repository `<owner>/<repo>` and its visibility (default: the person's GitHub login, and the reference's visibility).
- The look, as a concept in a few words (chess: "a theater at curtain-up"). Offer two or three if they give none.
- Who uses it, as one noun (chess: "learner"); the autoland reviewer acts as this person. Infer one and let them change it.
- The reference's choices, summarized from its `GOALS.md`, `README.md`, `package.json` and app config (platforms, hosting, data layer, design system, license, the Android application id), each kept unless they name another.
- Anything the purpose needs that the reference's setup can't give. The usual case is a secret (an API key, accounts) when the reference hosts a public static site: a key can't ship in the app, and a server that holds it can be called by anyone. This has no default. Offer: (a) a small server that holds the key, rate-limited and cached, if the API's terms allow relaying; (b) a host with server routes; (c) each user enters their own key.

Without answers, build locally on what you assumed and list the assumptions in PR #1, with these limits, because each is the person's decision and hard to undo:
- Create no repository until the person has confirmed its name and visibility in this conversation.
- Build nothing that depends on a secret.
- Write no product principles in `GOALS.md` beyond the purpose and platforms.

## 2. Make the repository

Once the name and visibility are confirmed, create the repo if you can; otherwise ask the person to create an empty one and attach it. Never push to a repo that already has commits. Push one root commit to the default branch with the license and a one-line README, then open the whole scaffold as PR #1. The person merges PR #1 by hand, since it adds the process files a PR may not land by itself. Don't autoland it.

## 3. Build the scaffold

Read the reference without changing the person's checkout (`git fetch`, then `git show FETCH_HEAD:<path>` or a worktree).

- **Take** tooling and editor config, CI and deploy workflows and their scripts, app config, the entry and root layout, and the code modules the scaffold uses, each with its tests. Remove the reference's domain from them, including comments, strings and test fixtures, keeping every reason. Domain work also hides in config (a bundler setting or a patch that serves one domain module): remove it too. Where a general file depends on domain code, write the smallest one in the same shape that the scaffold needs.
- **Leave, and record,** every other general module (in chess: storage, settings, list motion, sheets and the like). In the new `AGENTS.md` write: "Scaffolded from `<reference>@<sha>`. Port these from there when first needed, rather than rewriting them:" and the list, each with the rule it carries. Otherwise the next agent reinvents them, and an app made from this one can never get them.
- **Keep what isolates or equips the app even before code uses it**: the stack's packages, the agent skills the reference links (the linked list must match the reference's), and storage isolation. Sites on one static host share an origin, so keep the workflow's preview storage prefix and give the app its own storage key prefix.
- **Versions** come from the reference's `package.json`. Drop each dependency and script that only domain code uses.
- **Process files** (`PROJECTS.md`, `.agents/`, `docs/plans/`, the README's contributing section) keep their rules word for word. Change only names: the app, the repo, URLs, the user noun, and the purpose in the reviewer's brief. Where a rule names something the person's apps share (their machine, an emulator, reviewers, accounts), keep it about all of them. Where a domain example has no counterpart in the new app yet, delete the example; don't invent one.
- **`AGENTS.md`** keeps the reference's sections and its app-wide rules, and drops its domain modules. Add these rules of the person's unless it already states them: Data Client holds anything async, plain context and reducers hold the rest, and there is no other state library (react.dev's "Choosing the State Structure": derive what is derivable); saved state is kept the way the reference keeps it; while the app uses Data Client, loading and error states use its `AsyncBoundary`; each area of a screen has one way to change what it shows; a request to change how a control looks or works keeps its options and the UI around it.
- **Brand** is never reused, fonts included. Design the theme from the look: each color mode is a place in the concept (chess: dark is the stage, light the printed program), the design system is customized and never stock, and contrast is checked by a test (the reference may have none to copy; if its design system loads in only one of the test projects, the test belongs to that one). Draw the logo in the reference's brand script, in crisp flat shapes, and show the person the icon at full size and at favicon size.
- **Home screen**: designed, showing the brand and the one-line purpose only. Features, tiers and flows are the person's to decide, so show none, and write no tagline or other copy of your own.
- **Swaps**: when the person changes a choice, also remove what existed only for the old one (workflow jobs, scripts, rules, hand-over steps), state the new one in `AGENTS.md`, and rewrite any kept rule it contradicts (a server contradicts "no server").

Then read the reference's `AGENTS.md` module by module (and, when the reference was itself scaffolded from another app, that app's) and ask of each domain idea whether it would serve this app. Example: chess runs its engine off the main thread and wraps it as a Data Client endpoint, which suits poker equity or a long price indicator. List the ones that fit in PR #1 as follow-ups, and build none: features are the person's to ask for.

## 4. Verify, then open PR #1

Run the reference's checks, export the web app the way its CI does, serve it at the path the host will use, and screenshot the home screen on desktop and at phone width, in light and dark, with no console errors. Then check the copy against the new repo:

- No domain word of the reference remains outside links to it, including the reference's user noun if the new one differs.
- Every check `autoland.md` requires is a job name in the new workflows or an app in the hand-over, and every path it protects exists.

PR #1 says which reference commit it came from, the choices kept and changed, what you assumed, the open questions, and the patterns offered. Report its check results as they are; a first deploy can fail until the host is switched on. When a copied check fails on the reference itself, copy it unchanged and report it; don't repair or drop it.

## 5. Hand over

Give the person numbered steps, in the order they must happen, for only what they must do themselves. Find them in what you built: anything you couldn't do yourself (creating the repo, pushing), switching the host on if PR #1's checks need it, merging PR #1, each one-time host setting the README names, each reviewer or app that `autoland.md` waits for, a check of the scaffold on each platform you couldn't run by the reference's process, anything a swap added, and creating the app's Claude project as the README's contributing section says.