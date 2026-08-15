# `components/primitives/` — internal UI primitive layer

The redesign's component layer. It consumes the `--ui-*` design tokens (defined
in `css/theme.scss` by the tokens foundation) and provides the canonical UI
primitives that later redesign children build on. **Internal** — not part of the
package's public API surface; consumed only within `@excalidraw/excalidraw` and
adopted gradually.

## Members

| File            | Purpose                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| `button.scss`   | `@mixin uiButtonStyles` (shared base) + the `.ui-button` class family.  |
| `UiButton.tsx`  | Canonical button component (one state model, owned focus-visible).      |
| `Icon.tsx`      | Icon adapter enforcing a standardized rendering contract.               |
| `chrome-icons.ts` | 15 highest-frequency chrome icons re-authored through `<Icon>`.       |
| `index.ts`      | Internal barrel.                                                        |

## Conventions

### One button state model — `selected` is canonical

There is exactly one "this control is the active/selected/checked one" concept.
Its canonical name is **`selected`**. The legacy names map onto it:

| Legacy name             | Maps to    |
| ----------------------- | ---------- |
| `Button.selected`       | `selected` |
| `RadioButton.active`    | `selected` |
| `IconButton.checked`    | `selected` |
| `aria-pressed="true"`   | `selected` |

`<UiButton selected>` renders both the `ui-button--selected` class and
`aria-pressed="true"`. The SCSS matches `&.selected`, `&.ui-button--selected`,
**and** `&[aria-pressed="true"]`, so the affordance survives whether a consumer
uses the class or the attribute. Later children migrate `active`/`checked` onto
`selected` rather than re-choosing the name.

Variants: `default` (outline) / `solid` / `ghost` / `danger`. Sizes: `md` / `lg`.

### Owned, reliable focus-visible

`.ui-button:focus-visible` renders a 2px brand ring
(`box-shadow: 0 0 0 var(--ui-space-1) var(--color-brand-hover)`). The rule lives
inside `uiButtonStyles`, so under `.excalidraw` it compiles to
`.excalidraw .ui-button:focus-visible` (and the adopted-surface equivalents) at
specificity **(0,3,0)**, which beats the legacy global
`.excalidraw button:focus-visible` **(0,2,1)** — the owned ring wins **without
`!important`**. The global 1px rule stays for non-unified buttons (backward
compat).

### Consume `--ui-*` tokens; never define tokens

The primitive layer **consumes** design tokens; it does **not** define them.
Express every radius/spacing/typography/surface/border/shadow value via the
`--ui-*` tokens (`--ui-radius-*`, `--ui-space-*`, `--ui-font-*`,
`--ui-surface-*`, `--ui-border*`, `--ui-shadow-*`) plus the existing
`--color-primary` / `--color-danger` families. Do **not** introduce new CSS
custom properties here — the tokens/primitives boundary stays clean.

### Icon rendering contract

`<Icon>` forces `stroke="currentColor"` + `fill="none"` (outline family),
`aria-hidden="true"`, `focusable="false"`, a single canonical size axis
(`sm`/`md`/`lg`), a single canonical stroke-weight axis
(`light`/`regular`/`medium`/`bold`), a consistent square viewBox, and opt-in RTL
mirroring (composing the existing `.rtl-mirror` rule). Pass only path geometry;
the adapter owns every rendering attribute. The legacy `createIcon` factory in
`icons.tsx` is intentionally **not** mutated — non-chrome icons keep rendering
through it unchanged.

### Internal only / adopt gradually

New primitives are added here and adopted surface-by-surface. Do not break
existing consumers or the public component API. When adopting a surface,
prefer the lowest-risk change: swap the SCSS mixin include (`uiButtonStyles`)
before rewriting the component to render `<UiButton>`. Keep legacy marker
classes (e.g. `.excalidraw-button`) so external styling keeps applying.
