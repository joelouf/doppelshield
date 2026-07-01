# 6. Color the verdict surface with a safe, caution, danger, neutral hue triad

Status: Accepted

Date: 2026-06-26

## Context

The scan report carries a single conclusion the reader acts on: the verdict.
An earlier iteration rendered the verdict surface in a monochrome lime palette,
the same single accent used for the rest of the application chrome. That choice
was clean but it underweighted the one element on the page that most needs to
read at a glance. A confirmed impersonation and a clean result looked like
variations on one color, leaning on the text label alone to carry the severity.

For a tool whose entire purpose is to surface deception, the severity of the
verdict should be legible before the words are read. Distinct hues for distinct
outcomes is the long-standing convention for status, and it serves
accessibility: the color reinforces the label rather than standing in for it.
The safe state must also stay coherent with the product's lime identity, so that
"clear" still feels like the brand rather than an unrelated green.

## Decision

The verdict surface uses a four-way hue triad: safe, caution, danger, and
neutral, reversing the earlier monochrome lime treatment of the verdict.

The verdict model lives in `src/lib/verdict.ts`. `verdictFor` returns a
`Verdict` whose `tone` is one of `flagged`, `caution`, `clear`, or
`indeterminate`, derived from the warning set: a flagged-severity homograph
finding yields `flagged`; any other actionable warning yields `caution`; a
clean result yields `clear`; and the error and rate-limit paths yield
`indeterminate`. The `SEVERITY` map in the same file is what distinguishes a
flagged homograph from a caution-level signal.

The rendering lives in `src/components/ScanReport.tsx`. `BAND_BAR` maps the four
tones onto the four palette roles: `flagged -> danger`, `caution -> caution`,
`clear -> safe`, `indeterminate -> neutral`. `badgeStyle` then draws the verdict
badge from those roles: flagged and caution use the filled tokens
(`--ds-danger-fill` / `--ds-caution-fill` with their `--ds-on-*` foregrounds),
clear uses the outlined `--ds-safe`, and indeterminate uses the dimmed neutral
treatment.

The hues are defined in `src/app/globals.css`. `--ds-safe` is aliased to the
lime accent (`--ds-accent`), so the safe state keeps the brand identity, while
`--ds-caution` (amber), `--ds-danger` (red), and `--ds-neutral` (desaturated
sage) are their own distinct hues. Each role carries the bright, soft, fill, and
on-color variants the badge and finding rows draw from.

## Consequences

The verdict now reads by color before it reads by word: a flagged result is red,
a review is amber, a clear result is lime, and an indeterminate scan is neutral,
so severity is legible at a glance and the color reinforces rather than replaces
the text label. Keeping `--ds-safe` aliased to the accent means the safe state
stays on-brand and the general application chrome remains single-accent; only
the status surfaces take on the triad.

The cost is more surface area to keep coherent. Four roles, each with several
variants and an on-color, now have to maintain contrast in every theme, and the
tone-to-role mapping in `BAND_BAR` and `badgeStyle` has to stay in step with the
`tone` values produced in `verdict.ts`. Adding a new verdict tone means touching
both the verdict logic and the rendering map, not one of them.
