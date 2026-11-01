# Case study: shadcn/ui as the reference prior

> Ecosystem facts here are a snapshot as of mid-2026 and rot fastest. The structural lessons (grammar transfer, entropy at the widget boundary, version blending, legibility versus contract) are the durable part. Sources for every fact are in [evidence.md](evidence.md).

shadcn/ui is probably the most heavily represented component idiom in current model priors. Training corpora are not public, so this is inference from two anchors (Vercel says v0 is trained on it; it is prevalent in recent public React code) plus observed default output. Either way it is the case to reason from, in both directions: what a sharp prior buys, and how a prior distorts.

One framing correction first. shadcn describes itself as "how you build your component library," not as a design system. Its five stated principles are Open Code, Composition, Distribution, Beautiful Defaults, and AI-Ready. Two of those (Composition as "a common, composable interface, making them predictable," and Beautiful Defaults) are this skill's own principles under other names. So the disagreement is narrower than "shadcn versus agent-friendly." It is about three specific choices: where styling lives, whether there is a layout layer, and how the variant axes are cut.

## What transfers: conform to these

The valuable learning is a grammar, not a component list. It generalizes to components the model has never seen, provided the library conjugates regularly.

- Compound parts: `Root` / `Trigger` / `Content` / `Header` / `Title` / `Description` / `Footer` / `Item`. This is Radix's grammar (and before it Reach UI and Headless UI), and it is the sharpest React interaction-widget prior that exists.
- Controlled-state pairs: `open`/`onOpenChange`, `value`/`onValueChange`, `checked`/`onCheckedChange`, with `defaultX` for uncontrolled.
- Closed `variant` / `size` unions as the variant mechanism. Keep the shape; the vocabulary is the problem (below).
- "Interaction mechanics are the library's job." Agents seeing Radix-shaped parts stop hand-wiring focus, keyboard, and ARIA. Correct for mechanics. The over-generalization to watch: Radix leaves accessible meaning to the consumer (dialog titles, icon-button labels, error text) and warns only at runtime in the console, which a non-rendering agent never sees. Move that requirement into types.
- `asChild` composition. High prior, runtime-only failure modes; type the unsupported cases or offer explicit variants.
- Beautiful defaults. shadcn's zero-config output looks good, which is exactly Move 1 in SKILL.md.
- The distribution channel. The registry protocol, the MCP server, and the CLI v4 skill are open to any conforming registry. A competing library inherits agent-facing discovery and installation without building it; good item descriptions and rules files are the price of entry.

## What distorts: diverge from these

1. **The system stops at the widget boundary.** shadcn ships no layout primitives. Its examples compose widgets with ad-hoc utility strings (`flex items-center justify-between gap-4 p-6`), and training data shows no dominant choice among `gap-2`/`gap-3`/`gap-4`/`p-4`/`p-6`/`space-y-*`. Agents learned that composition means improvising spacing per call site. Within one file the model tends to copy its own earlier choice; across files and sessions the values drift, and nobody rendering-blind can see it. Probably the largest quality gap in agent-generated shadcn UIs and the clearest opening for a system that owns layout (Braid's rule: components ship no outer whitespace, layout components own all spacing). Unmeasured; judged from output.

2. **A fused variant axis.** `Button` `variant` is `default | destructive | outline | secondary | ghost | link`: intent (`destructive`), treatment (`outline`, `ghost`), and element identity (`link`) on one axis, so "destructive outline" cannot be said. Splitting into tone × appearance is better structure, and it is not a novel bet: Radix Themes (same team as the primitives shadcn wraps) uses `color` × `variant` (`solid`, `soft`, `outline`, `ghost`), Chakra uses `colorPalette` × `variant`, Mantine uses `color` × `variant`. Populate each axis with those already-familiar words and the split rides an existing prior instead of fighting one.

3. **Semantically empty values.** `variant="default"` and `size="default"` describe nothing. `size="icon"` puts shape on a size axis, and the axis has since grown to `icon-xs`, `icon-sm`, `icon-lg`, compounding it. Radix Themes' separate `IconButton` is the cleaner precedent; `sm`/`md`/`lg` are the familiar ordinal labels.

4. **Override as the demonstrated workflow.** Examples routinely thread `className` through `cn()`. Whatever the canonical examples show becomes normal, so agents learn that restyling inline is how you use a component. Keep the hatch; stop showcasing it.

5. **Copy-paste ownership taught as universal.** Against a shadcn-derived repo, editing component source is correct. Against an npm-distributed library, the same habit surfaces as reaching into internals or forking styles instead of using the API. This is the legibility/contract split, below.

6. **The prior is a blend of incompatible snapshots.** February 2025 alone: Tailwind v4 and React 19, `forwardRef` removed, `data-slot` added, `toast` deprecated for `sonner`, the `default` style deprecated for `new-york`, HSL to OKLCH, `hsl(var(--x))` to `var(--x)`, `w-4 h-4` to `size-4`. Since then: Base UI as an alternative base (January 2026), a unified `radix-ui` package (February 2026), `Field` replacing the `Form`/`FormField` stack, CLI v4 with skills and presets (March 2026). Models hold every snapshot as one smeared distribution and interpolate. This is the structural cost of being the parametric prior. shadcn's skill (which injects the project's actual Tailwind version, base library, and installed components per interaction) is a direct patch for it at generation time, and a context-taught library sidesteps it entirely, provided its docs are actually loaded.

## Legibility versus contract, resolved by regime

shadcn's AI-Ready principle is "open code for LLMs to read, understand, and improve." This skill's default is the opposite: hide implementation, expose a typed contract. Both are right, for different files.

- When the agent **owns** the components (it is editing `components/ui/button.tsx`), it will open the file. Readable implementation wins: colocated styling, minimal indirection, utility classes or plain CSS that say what the thing looks like. shadcn is correct here.
- When the agent **consumes** the components from app code, it sees imports, types, and a few sibling usages. It rarely opens implementation. Here readable styling is writable styling, and call-site styling is the entropy Move 3 exists to remove. The contract model is correct here.

A design-system team starting from shadcn can have both: keep shadcn's grammar (and, if useful, its source) as the implementation layer for maintainers, and expose a contract API (tone × appearance, tokenized layout primitives, intent components, required accessible names) to everyone importing from it.

## Prior depth: anchor as deep as the semantics allow

Prior sharpness roughly tracks corpus size × age × stability. shadcn sits near the bottom.

| Layer | Example vocabulary | Sharpness |
|---|---|---|
| HTML semantics | `button`, `label`, `table`, `htmlFor` | Decades old, spec-defined, one meaning |
| CSS specs | `space-between`, `center`, grid/flex keywords | One meaning, defined by W3C |
| ARIA patterns | dialog, tablist, listbox, combobox | Spec vocabulary, stable |
| Pan-library words | `sm`/`md`/`lg`, `primary`/`danger`/`success`, `disabled`, `solid`/`outline`/`ghost` | Recurring, with drift: MUI says `error` where others say `danger`; in Tailwind `sm`/`md`/`lg` are breakpoints |
| Tailwind | utility classes | Huge but version-churned |
| shadcn specifics | `cn()`, its exact variant unions | Youngest, internally blended |

Models know CSS mechanics superbly and cannot pick values blind. So borrow spec keywords for semantics (`justify="space-between"`) and quantize every magnitude to a token scale. The goal is not raw CSS at call sites; it is no value-picking at call sites.

## Prior physics: what a name makes the model assume about layout

These are observed expectations from agent output, not measured. Types cannot express any of them, which is why SKILL.md Move 2 says to make a deliberate break visible where the code is written.

- Spacing comes from the parent's gap, not from child margins.
- A container (`Card`, `Panel`, `Dialog.Content`) owns its internal padding and border.
- Block components (`Card`, `Table`, `Alert`) fill their container's width; controls (`Button`, `Select`, `Input` in a row) stay intrinsic-width.
- Headers and footers (`CardHeader`, `DialogFooter`) include their own spacing and separate themselves from body content.
- A `Toolbar` is a single horizontal row; a `Sidebar` is a vertical column; a `Container` is centered with a max width.

None is universal. Mobile idioms use full-width controls, dialogs go full-screen at small sizes, and some compound components split padding ownership between parts. The actionable form is to know which expectations each of your components confirms or breaks, write the project's own layout contract where agents load it, and make every break loud.

## Names: sharp priors and the collision zone

- **Sharp (safe when conforming):** `Toolbar` (horizontal control row), `Sidebar` (vertical nav), `Container` (centered max-width, consistent from Bootstrap through MUI), `Tooltip` (hover/focus-revealed, non-interactive), `Inline` (horizontal flow that wraps; CSS defines no such component, but the directional hint is strong).
- **Bimodal:** `Stack` leans vertical (MUI and Chakra both default to column) but training data is full of `direction="row"`, so the name alone does not pin the visual axis. Exits: one component per axis, or Chakra's explicit `HStack`/`VStack`. Note the honest version of the argument: CSS itself flips `align-items` with `flex-direction` and models handle that fine. The gain from splitting is one fewer degree of freedom and a call site a reviewer can read, not a rescued prior.
- **Collision zone.** Some are meaning collisions (the name denotes different widgets), some are grammar collisions (same widget, incompatible API shapes). Both smear the distribution the model samples from.

| Name | Divergent usages in training data |
|---|---|
| `Select` | Grammar: HTML `<option>` children · Radix compound parts · react-select `options` prop · MUI's `onChange`-centric API |
| `Menu` | Meaning: Ant navigation menu (inline/vertical/horizontal) · MUI dropdown · Radix `DropdownMenu` |
| `Sheet` | Meaning: iOS adaptive modal presentation, bottom-anchored on iPhone · shadcn edge-anchored panel, default right |
| `Drawer` | Meaning: vaul defaults to bottom (top/left/right since 2024) · MUI/Ant any edge, defaulting left/right |
| `Form` | Grammar: bare HTML · shadcn's react-hook-form + zod wrapper · shadcn's later `Field` stack |

For collision-zone names, even good in-context docs fight the prior rather than fill a blank. Conform fully, or pick a distinct, descriptive name and let types carry the semantics.
