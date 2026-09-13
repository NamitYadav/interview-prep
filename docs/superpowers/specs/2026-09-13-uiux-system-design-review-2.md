# UI/UX and System Design Review, second pass

**Date:** 2026-09-13
**Scope:** Delta since the first review (`9aaccec`), as of `c8cff85` (main): the review
fixes (PRs 42, 43) and the six feature PRs that followed — focus sound (44), sticky
Settings (45), category strength panel (46), clickable category rows (47), font bump /
pointer cursor / back-to-top (48), back-to-top fix (49). Plus a re-sweep of the rest.
UI half driven live in the browser: desktop, 375×812 and 375×667, dark / Gruvbox /
Light, keyboard shortcuts. System-design half judged against the same constraints as
before: single-user, static, localStorage only, one bundle, GitHub Pages.
**Deliverable:** Report, then fixes in the same PR. **Status:** everything below is
fixed in this branch except U10 (needs a real iPhone to confirm). Re-measured after
the fixes at 375×667: the Settings panel scrolls inside itself and Reset is reachable
(627px of 667); Reveal spans the first line, Probe and Record split the second at
146px each; the category chip truncates at 22px tall; the summary target is 27px.

## Verdict

No P1. Lint, 351 tests and the build are green. The first review's P2s and P3s all
hold on re-check (rating sits under key points, the 45-min clock survives a reload and
a tab switch, the round header fits at 375px, lap cap is 64 and asserted, Back after
Skip stays hidden, focus rings stay off the two programmatic targets, model answer has
a heading, no raw id on the design prompt, README count is 295).

Three P2s, all in the new code, all a few lines each:

- Settings panel is now taller than a phone viewport and the sticky header pins it, so
  Export / Import / Reset cannot be reached at all on a 667px-tall screen.
- Light theme verdict words ("OK", "Solid") in the new category panel fail AA
  contrast — and the same two colours already fail on the rating buttons.
- The action row on a phone wraps "Probe me (1/2)" onto three lines, 88px tall.

Then P3 polish and hygiene.

Verified to work, so nobody re-checks: clicking a category row sets the select, remounts
Practice and moves focus to the new question (the page scrolls to it on its own, so the
open panel above does not strand you); rating with `2` from the bottom of a long
revealed card lands the next question's heading at 394px, well clear of the 52px sticky
header; focus sound keeps playing across a route change and the Play/Pause label
follows; the back-to-top button appears past 400px and honours reduced motion; no
console errors on any route; dark and Gruvbox verdict colours are all above 5.8:1;
Browse's scroll listener sets the same boolean on every event, which React bails out
of, so no re-render per scroll; the bundle is 926 KB raw / 300 KB gzip, matching the
README's "~300KB".

## UI/UX findings

### P2

**U1. Settings panel cannot be scrolled to its bottom on a phone.** The panel is
681px tall (`src/components/Settings.tsx:57`, four sections since focus sound was
added, at the new 18px root) and sits inside the header that PR 45 made `sticky`
(`src/App.tsx:84`). Measured at 375×667: panel bottom at 732px, the "Your data" row
(Export, Import, Reset progress) 65px below the fold, and scrolling the page does not
move it because the header it hangs from is pinned. At 375×812 it fits with 80px to
spare — but Safari on an iPhone 12/13/14 reports roughly 660px of `innerHeight` with
its toolbar showing, so this hits current phones, not just the SE. Before the sticky
change, scrolling revealed the rest; the two PRs are individually fine and broken
together.
*Fix:* one class on the panel div: `max-h-[calc(100dvh-4rem)] overflow-y-auto`. Keeps
sticky, keeps every control reachable at any height. Alternative if the 52px of
permanent header on a phone (8% of a 667px viewport, holding one button) bothers
you: `sm:sticky` instead of `sticky`.

**U2. Light theme: "OK" and "Solid" verdicts fail AA.** `text-amber-600` on the page
background is 3.05:1 and `text-emerald-600` is 3.61:1 at 13.5px
(`src/components/CategoryStrength.tsx:9-11`); AA for body text is 4.5:1. "Weak"
(`red-600`, 4.63:1) just passes. The same three classes are what the rating buttons
use (`src/components/RatingRadios.tsx:5-7`) at 15.75px, so that was already failing
in Light and the first review's contrast check (body and secondary text) did not
cover it. Dark and Gruvbox are fine: 7.2–11.9:1 and 5.9–9.7:1.
*Fix:* `amber-700` (4.81:1) and `emerald-700` (5.25:1) for the light half of those
two pairs; `red-700` (6.2:1) for symmetry. Both files spell the triple out by hand —
see S2 for doing it once.

**U3. Phone action row wraps to three lines.** At 375px the row is three equal
thirds (`max-sm:*:flex-1`, `src/components/QuestionCard.tsx:235`), each 91–101px
wide. In a monospace face at 15.75px "Probe me (1/2)" needs about 150px, so it
breaks as "Probe / me / (1/2)" and all three buttons stand 88px tall. That is on
every question with follow-ups, every time, on the primary phone flow. The first
review's U10 fix (equal thirds) predates the font bump.
*Fix:* either shorten the label to `Probe (1/2)` or make the row
`grid grid-cols-2 sm:flex` with Reveal `col-span-2` — Reveal is the primary and can
have the whole first line.

### P3

**U4. Root font size is a fixed pixel value.** `html { font-size: 18px }`
(`src/index.css:77`) replaces the reader's browser default. Someone who set their
browser to 20px or 24px for low vision now gets 18px everywhere (WCAG 1.4.4; page zoom
still works, but the default-font path is the one such users actually configure).
*Fix:* `font-size: 112.5%` — identical for everyone on a 16px default, scales for
everyone else. Breakpoints are unaffected either way (Tailwind's `rem` media queries
use the browser default, not the root you set).

**U5. Focus sound has no indicator outside the panel.** Once White/Pink/Brown is
playing and the panel is closed, nothing on screen says so, and the only way to stop
it is Settings → Pause. *Fix:* lift `useFocusSound` from `FocusSound` to `Settings`
(props down, three lines) and append a small "♪" or dot to the summary label while
`playing`.

**U6. Back-to-top covers the bottom-right of the last Browse rows.** The fixed
button (`src/components/Browse.tsx:88`, 70×38px) overlays the tap area and the
rating column of whatever row is scrolled under it. Conventional, but a `pb-16` on the
list lets the last rows scroll clear of it.

**U7. "By category" is a 13.5px, 18px-tall disclosure control.** The summary
(`src/components/CategoryStrength.tsx:53`) is `text-xs` with no padding: an 18px
target against the 24px minimum of WCAG 2.5.8, and the smallest interactive thing on
the page. *Fix:* `py-1` (or `text-sm`); nothing else moves.

**U8. Category chip wraps on phones.** "Architecture & system design" in the card's
category chip (`src/components/QuestionCard.tsx:138`) breaks onto two lines at 375px,
a 40px-tall pill beside "1 of 99". `truncate max-w-[70%]` or `whitespace-nowrap` with
the pill allowed to shrink.

**U9. Home: the widest card is the least urgent one.** With a loop date set, cards
sort by urgency and the seventh card spans both columns (`src/components/Home.tsx:87`),
so the biggest card on the page is the one that needs the least work. Cosmetic; either
span the *first* card when sorted (`sm:first:col-span-2` under `loopDate`) or accept.

**U10. Form controls sit under 16px on phones — unverified on device.** The category
select and the tab buttons compute to 15.75px, the "Your answer" and note textareas
inherit the same, the scratch editor is 13.5px. iOS Safari zooms the page when a
control under 16px takes focus. This Chromium pane cannot reproduce it; worth thirty
seconds on a real iPhone. *Fix if it bites:* `text-base sm:text-sm` on those
controls.

## System-design findings

Lens unchanged. The delta stayed inside the existing shapes: focus sound preferences
ride `useStoredValue` like theme and strict mode; `categoryVerdict` is a pure
function next to `roundStats`, table-tested; the design session moved into
`keyedStore` (S4 of the first review, done); `ProgressBar` became spans for a
stated reason; nothing new touched the backup boundary. All right-sized.

### P2

**S1. Panel height × sticky header** — see U1. Listed here because it is an
interaction between two PRs that each passed review alone, and the fix is one
class.

### P3

**S2. The rating colour triple is now spelled in three places.**
`RatingRadios.tsx:5-7` (text), `CategoryStrength.tsx:9-11` (text) and
`ProgressBar.tsx` (background) each hard-code red/amber/emerald. The
`CategoryStrength` comment says it copies the rating buttons on purpose so "the word
and the bar read as one statement" — which is exactly why it should import the map
rather than re-type it. The light-theme fix (U2) has to land in two files today.
*Do it when fixing U2, not before:* export the text map from `RatingRadios` (or
`controlStyles.ts`) and import it in `CategoryStrength`.

**S3. Focus sound relies on the Settings panel content staying mounted.** The
`AudioContext` lives in `useFocusSound`, called by `FocusSound`, rendered inside the
`<details>` body (`Settings.tsx:81`). It survives closing the panel only because
`<details>` hides its content rather than unmounting it. A future "render the panel
only when open" change — a common tidy-up — kills playback the moment the panel
closes, and nothing today would catch it: `useFocusSound.test.ts` tests the hook in
isolation, `Settings.test.tsx` never plays a sound. *Fix:* one Settings test — pick
White, close the panel, assert the Pause button is still in the document — or lift
the hook to `Settings` (which U5 wants anyway).

**S4. Test output carries 14 jsdom warnings.** `App.test.tsx` prints
`Not implemented: Window's scrollTo() method` fourteen times, from `useHashRoute`'s
`window.scrollTo(0, 0)` on every hash change (`src/hooks/useHashRoute.ts:39`).
`useHashRoute.test.ts` spies it per test; nothing else does. *Fix:* one line in
`src/setupTests.ts`: `window.scrollTo = () => {};`. Green output should be quiet
output, so the next real warning is visible.

**S5. README drift from PR 48.** The font bump, pointer cursor and Browse back-to-top
shipped without a README line; the repo's own rule is that every user-visible change
updates the README in the same commit. One sentence under "Ways to drill → Browse"
covers the button; the other two are not features and need nothing.

## Not findings (checked, fine)

- `categoryVerdict` thresholds (mean < 1.7 Weak, < 2.5 OK, else Solid) over rated
  questions only; a decayed Solid counts as OK via the same `bucket()` the queue uses.
  Documented in the README, matches the code.
- `useFocusSound` teardown: source stopped and disconnected, context closed on
  unmount; `setSound('off')` suspends; volume 0 round-trips through storage.
- `keyedStore` / lap cap: `MAX_LAPS = 64`, `data.test.ts` asserts it stays above the
  number of possible sets.
- `useStoredValue` for sound and volume: `encode` returns `null` at defaults, so an
  untouched preference never writes a key.
- Sticky header background is the body colour in all three themes; the Settings
  popover paints above it (`z-20` header, `z-10` panel inside it).
- Category rows: `aria-pressed` reflects the filter, `aria-label` avoids the name
  being read twice; `<span>` progress bar keeps the button's content phrasing-only.

## Suggested order if acting

1. U1/S1 panel `max-h` + `overflow-y-auto` — one class, unblocks Import/Reset on
   phones.
2. U2 + S2 together — three colour tokens, one exported map, two files.
3. U3 action row — one class or one label.
4. U4 root font `112.5%`, U7 summary padding, S4 scrollTo stub — one line each.
5. U5 + S3 — lift the hook, add the indicator and the mount-contract test.
6. U6, U8, U9, S5 — polish and docs.
7. U10 — check on a real iPhone first.
