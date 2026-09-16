---
name: agent-friendly-design-systems
description: Guides the design and review of design systems and component library APIs that AI agents can use correctly with little or no rendering feedback. Derives every recommendation from three measured properties of code-generating models (frequency-shaped priors, context override, executable-only verification) and three design moves (make the default guess right, make wrong output fail before it ships, remove the decision). Use when designing, reviewing, or evolving a component library, design system, variant API, layout primitive set, or token architecture, especially when agents are among its consumers.
---

# Design systems for agentic use

This skill informs design decisions; it does not mandate them. Every recommendation can lose to a legitimate project goal (expert expressiveness, brand needs, platform limits, existing conventions). Name the trade and defer to a deliberate contrary choice. Examples are React and TypeScript because that is where model priors are sharpest; the reasoning ports to any stack.

## The objective

A code-generating model is a sampler. It emits the program it finds most plausible given what it learned in training (the prior) and what is in the session (the context), then keeps whatever survives the checks it can run. A human-first API asks "can the right thing be expressed?" An agent-first API asks "of everything that looks right, how much is right?" So the objective has two halves: make the most probable program the correct one, and make the improbable ones fail before they ship.

This is ordinary API design (Bloch's "easy to use correctly, hard to use incorrectly," Minsky's "make illegal states unrepresentable," the pit of success) under two stricter assumptions: the consumer's familiarity is a measurable distribution over public code, and the consumer verifies only what it can execute.

## Three properties of the consumer

Everything below derives from these. Sources, scope caveats, and local measurement methods are in [evidence.md](evidence.md).

1. **The prior is frequency-shaped, version-blended, and unpatchable.** A model knows a pattern in proportion to how often it appeared in training; accuracy rises log-linearly with corpus frequency. Every version of a library that ever appeared is superimposed into one distribution, which is why models emit deprecated APIs 25 to 38% of the time and score around 50% on version-pinned tasks. Nothing a library ships can edit this. It can only be matched or overridden.

2. **Context overrides the prior, but only context that is actually present.** Prompts drawn from outdated code produced 70 to 90% deprecated usage; prompts drawn from current code produced 9 to 18%. Sibling code in the file steers output more than anything a library publishes. Retrieved docs help; a bare version label helps a little. Published docs the agent never loads do nothing.

3. **Only executable feedback is verification.** The type checker is deterministic, cheap, and always in the loop, and 94% of compile errors in LLM-generated TypeScript are type errors, so it catches a lot. Rendering is expensive, needs setup, and vision-language judgment of layout is weak even with a screenshot in hand. Whatever the types do not encode ships if the model gets it wrong.

Two consequences. The cost of error is asymmetric: a human sees a bad gap and fixes it in seconds, an agent's bad gap ships, so "easy to fix" is worth far less than "hard to get wrong." And evolution must be additive: a rename or a meaning change costs agents until the next training run and the old form never fully leaves the distribution, so when you must break, put the migration in types and colocated docs, not only a changelog.

## Three moves

Every design lever is one of these. When evaluating a design, ask which move it makes and which it undermines.

### Move 1: make the default guess right

The agent's first guess is prior plus visible context. Two things shape it.

**Names are bets on distributions.** A name's value is sharpness times agreement: how single-meaninged its public usage is, times whether that meaning is yours. Sharpness tracks corpus size, age, and stability, so HTML and CSS spec vocabulary beats ARIA pattern names beats pan-library words (`sm`/`md`/`lg`, `primary`/`danger`, `solid`/`outline`/`ghost`) beats any one library's idioms; anchor as deep as the semantics allow. Agreement is binary, and a familiar name with different behavior is the worst case: the model applies the learned meaning confidently and the code compiles. When no sharp name agrees with your semantics, compose a novel one from learned grammar. `Page`/`PageHeader`/`PageTitle` exists in no major library, yet the `X`/`XHeader`/`XTitle` conjugation carries hierarchy and child order for free and stays discoverable in autocomplete and in the agent's own plan. A prop whose meaning depends on another prop (`align` under a `direction` switch) is two coupled bets; uncouple them into one component per axis or explicit names. The gain is one fewer degree of freedom, not a rescued prior; models handle CSS's own axis flip fine.

**The visible codebase is the prompt.** Sibling usages, the catalog, and the canonical example are what the agent actually conditions on. Regularity compresses that prompt: if every component conjugates the same axes with the same vocabulary, two components in context teach the whole catalog, and every synonym or per-component exception is a separate fact that has to be taught and usually is not. The catalog partitions the output: agents plan in units like "page header" and "toolbar" before reading code and force the plan through whatever exists, so name components after those units. Whatever the examples show becomes the workflow, `className` overrides included; show the intended path, and keep examples version-matched and colocated with the code the agent must touch.

Prior strength justifies conforming in syntax the agent must write. It never justifies exposing a decision the agent should not be making; that is Move 3.

### Move 2: make wrong output fail before it ships

Anything a render or a runtime would have caught must fail earlier, or it ships.

**Where types can express it, put it in the type.** Closed unions instead of boolean combinations nobody designed. Discriminated unions for mode-dependent props. `Omit` what a part does not support instead of documenting "don't use this here." Required props for the meaning behavior layers leave to the consumer (dialog titles, icon-button labels, error text; Radix and React Aria warn about these only in a console the agent never sees). Compile errors for the unsupported cases of `asChild`/`as`, or explicit non-polymorphic variants such as `ButtonLink`. The test is the same each time: an agent completing the prop sees the legal vocabulary, and the illegal program does not compile.

**Where types cannot express it, make the divergence visible where the code is written.** Names carry layout expectations no type encodes (a container owns its padding, a block fills its parent, spacing comes from parent gaps; the case study lists them). A component that breaks the expectation its name creates compiles and renders quietly wrong in the one dimension the agent cannot see. Signal the break at the call site (a required prop, a non-colliding name) or in context the agent reliably loads (a rule beside the code). Documentation the agent will not encounter does not count.

### Move 3: remove the decision

A decision whose correctness is only visible when rendered belongs in the library, not at the call site. One principle at four granularities:

- **Values.** Quantize every magnitude and resolve appearance through semantic roles: `gap="3"` and `tone="danger"` at the call site, px and hex in the theme. Models know flex and grid mechanics; they cannot pick 12 versus 16 blind, and independent picks drift across files into a rhythm nobody sees. Spec keywords (`justify="space-between"`) keep the semantics free while the scale removes the guess.
- **Composition.** Own layout, not just widgets. Braid's rule is the clean version: components ship no outer whitespace, and layout components own all spacing. A system that stops at the widget boundary makes every call site improvise.
- **Patterns.** Where a composition recurs (`FormField`, `EmptyState`, `PageHeader`, `ConfirmDialog`), ship it. Each re-derivation from primitives is a chance to diverge.
- **Adaptation.** Handle viewport, content length, writing direction, motion and contrast preferences, and loading/empty/error states by construction, or require them in the type. Call-site media logic is a blind decision.

Escape hatches (`className`, `style`, CSS variables) should exist and sit below the default path in probability: available, ranked, never showcased. If they are the demonstrated workflow, Move 1 has made them the default guess.

## The regime decides legibility versus contract

Two coherent philosophies exist; shadcn is the clearest statement of the first.

- **Legibility.** Ship source into the repo. The agent reads and edits it, and styling is visible where it is written. Correct when the agent **owns** the components: it will open the file, and readable implementation (colocated styling, minimal indirection) is what it needs.
- **Contract.** Expose a typed API and hide the implementation. Correct when the agent **consumes** the components from app code: it sees imports, types, and a few sibling usages, and rarely opens the implementation. Readable styling is writable styling, and call-site styling is the entropy Move 3 removes.

Most systems need both, split by audience: legibility for whoever maintains `components/`, contract for everyone importing from it. Decide which regime a file is in before applying the moves. [shadcn-case-study.md](shadcn-case-study.md) works through what to keep from shadcn, what to change, and why.

## Tensions

Two, each with several faces. Name the trade; do not pretend it is free.

- **Concentrated probability versus expressiveness.** Every removed degree of freedom is someone's lost capability. It appears as intent components versus primitives, closed axes versus orthogonal props, and stretching an axis versus splitting it (stretch while every value answers the same question; shadcn's `Button` variant, fusing intent, treatment, and element identity, is the canonical fused axis). The ranked escape hatch is the usual answer.
- **Prior alignment versus ownership.** Matching convention buys free correctness and imports the convention's flaws and churn. It appears as familiar versus distinct names (distinct costs discoverability; grammar-conforming novel names recover most of it) and as prior-friendly versus better-designed. Diverging costs alignment once; a kept flaw costs correctness forever.

## Measure instead of trusting

The three properties are measured at the model level. The moves are mechanisms consistent with those measurements, not measured on any UI library; the evidence file marks which is which. Before adopting a rule, run it: 20 to 40 realistic UI tasks, sampled several times per regime (no context, types plus two sibling usages, full source); score first-attempt compile, misuse caught by types versus silent, token variance across sibling call sites, accessibility lint, and a short visual pass; change one design decision; re-run. Keep what moves the numbers.

## Review checklist

- Move 1: would a model familiar with comparable libraries guess this on the first try, and if the name is borrowed, does it behave identically? Does the canonical example show the intended path?
- Move 2: does every realistic misuse fail to compile? Where a name's visual expectation is broken, is the break visible where the code is written?
- Move 3: is any value, composition, pattern, or adaptation left for the call site to decide blind?
- Regime: is this file owned or consumed by the agent, and is the legibility/contract choice deliberate?
- Evolution: would this change break code written from last year's prior, and is the migration visible in types and colocated docs?
