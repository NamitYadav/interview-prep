# Keyboard shortcuts toggle

**Goal:** Close the one knowingly-open accessibility gap. WCAG 2.2 **SC 2.1.4 Character
Key Shortcuts (Level A)** requires that a shortcut using only unmodified letter,
punctuation, number or symbol characters can be turned off, remapped, or made active
only on focus. `Practice` binds `n`, `b`, `1`, `2`, `3` and Space on `window`, and the
a11y branch only extended the typing guard — which fixes the real conflict with a focused
`<audio>` element but does not satisfy the criterion.

Someone using speech input, or with a tremor, can still fire `n` and skip a question with
no focused element at all. The criterion wants an off switch, so this adds one.

## Design

A per-device preference, the same shape as `useStrictMode` and `useLoopDate`: not prep
data, so it stays out of export/import backups and needs no schema version.

- **Key:** `interview-prep:shortcuts`, storing `'0'` when disabled.
- **Default: ON.** Absent means enabled. The shortcuts exist today and are the fastest way
  to drill; defaulting them off would be a silent regression for the one person using this.
- **Control:** a toggle in the app header beside Strict mode, same shape and same
  `aria-pressed`, labelled "Shortcuts". It sits next to Strict mode because both are
  drill-behaviour switches, and that is where a user already looks for them.

## Behaviour when off

- `Practice` does not register its `keydown` listener at all — not a listener that
  returns early, so nothing is intercepted and `Space` scrolls the page normally.
- Every `<kbd>` hint disappears: `B`/`N` in Practice's controls, `Space` on the Reveal
  button, and `1`/`2`/`3` on the rating radios. A hint for a shortcut that does nothing is
  worse than no hint.
- The rating radios stay fully keyboard-operable via the APG pattern — arrows to move,
  Space or Enter to commit. **Turning shortcuts off never removes a user's only way to
  do something**, which is what makes this safe to offer.

## Threading

`shortcuts` follows exactly the path `strictMode` already takes: `App` owns it and passes
it to `WeakDrill`, `RoundView` and `MockSession`, each of which passes it to `Practice`.
`Practice` passes it to `QuestionCard` as `shortcuts`, which gates the Space hint and
`RatingRadios`' `showKeys`.

`QuestionCard` currently hardcodes `showKeys` on `RatingRadios`, so Browse and `#search`
advertise `1`/`2`/`3` shortcuts that do not exist there — those views never mount
`Practice`. Gating on the new prop fixes that too, since the default is off.

## Out of scope

- Remapping. The criterion is satisfied by an off switch alone, and a remap UI is a much
  larger surface for a single-user tool.
- Deduplicating the now-five near-identical localStorage preference hooks (`useTheme`,
  `useStrictMode`, `useLoopDate`, the drafts/lap stores, and this one). Real, worth doing,
  and a separate change — bundling a refactor of four working hooks into a feature branch
  is how the last round shipped four regressions.
