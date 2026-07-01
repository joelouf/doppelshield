# 2. Detect homographs with the UTS-39 skeleton plus per-glyph confusable evidence

Status: Accepted

Date: 2026-06-27

## Context

The product judges whether a hostname is visually deceptive: whether a name
that renders as a familiar Latin brand is in fact built from non-Latin or
otherwise confusable code points (the IDN homograph problem). Two related
questions have to be answered for every host.

First, the decision: does this name collapse onto something it is pretending to
be? A single similarity heuristic per character is not enough, because an
attacker mixes scripts freely and the same rendered word can be assembled from
many different code points. Unicode Technical Standard 39 (Unicode Security
Mechanisms) answers this with the confusable skeleton: map each code point
through a confusables table to its prototype, and two strings are confusable
when their skeletons are equal. Comparing skeletons, rather than raw strings,
folds away the attacker's choice of code points.

Second, the evidence: a verdict that only says "confusable" is not defensible to
the person reading it. For a security audience the report has to show its work,
naming each suspicious glyph, its code point, its script, and the ASCII letter
it imitates, so a reader can confirm the call by eye.

The standard ships a large confusables data file. The engine uses a curated
subset rather than the full table: the entries it carries cover the Latin-imitating
ranges that matter for brand impersonation (Greek, Cyrillic, Armenian,
Cherokee, Coptic, Georgian, Canadian Aboriginal, and related), and a smaller,
auditable map keeps the engine free of unreasoned-about code points.

## Decision

The engine detects homographs by computing a UTS-39 style confusable skeleton
and, in the same pass, emitting per-glyph confusable evidence.

The skeleton transform lives in `src/core/checkurl/confusables.ts`. `asciiSkeleton`
normalizes the input to NFC, replaces each code point with its prototype from the
`CONFUSABLES` map (`src/core/checkurl/confusablesData.ts`), leaving unmapped code
points unchanged, and renormalizes the result to NFC. `CONFUSABLES` is a curated,
hand-maintained `ReadonlyMap<string, string>` from confusable code point to its
ASCII prototype.

Per-glyph evidence is produced by `glyphEvidence` in the same file. For each
non-ASCII code point (deduplicated) it records the character, its `U+XXXX`
code point, its script (via `scriptName`, which tests Unicode script properties
in order), and the ASCII letter it imitates (`imitates`, taken from the same
`CONFUSABLES` map, or null when the glyph maps to nothing).

`analyzeHomograph` in `src/core/checkurl/homograph.ts` orchestrates this per
hostname. It decodes punycode A-labels to Unicode, then for each label computes
the skeleton and the set of scripts present. It raises one of three findings,
in priority order: `homograph_target_impersonation` when the decoded host
matches a known brand target (`matchTarget`), `homograph_whole_script_confusable`
when a single non-native non-Latin script reads as a different ASCII word
(skeleton is pure ASCII, length two or more, differs from the label, and the
script is not native to the TLD per `nativeScriptsForTld`), and
`homograph_mixed_script` when a label mixes scripts that are not a legitimate
Japanese or Korean combination. Bare punycode on its own yields only the
informational `punycode_host` note. Alongside the findings it returns a
`HomographEvidence` record (decoded host, ASCII A-label, full-host skeleton,
the glyph list, and the matched target) whenever any non-ASCII glyph is present.

`src/core/checkurl/urlAnalysis.ts` is the thin integration point: `analyzeHost`
returns the warnings and `homographReport` returns the evidence, both delegating
to `analyzeHomograph`, so the rest of the check pipeline consumes one homograph
analysis.

## Consequences

Comparing skeletons rather than raw strings means the engine is robust to the
attacker's choice of code points: any assembly of glyphs that renders as the
target collapses onto the same skeleton and is caught. Carrying the imitated
letter, script, and code point for every glyph lets the report justify its
verdict glyph by glyph, which is the standard a security reviewer expects.

The curated `CONFUSABLES` map is the accepted trade-off. It is small and
auditable, but it is narrower than the full UTS-39 confusables table, so a
glyph outside the curated ranges will not fold and a novel confusable can be
missed until its mapping is added. Because the map is hand-maintained rather
than generated from a pinned Unicode release, keeping pace with new Unicode
versions is a manual step. Skeleton equality is also deliberately conservative:
it answers visual confusability only, and the layered findings in
`analyzeHomograph` (brand match, whole-script, mixed-script, TLD-native script
allowances) exist to keep legitimate internationalized domains from being
flagged, which is why a bare IDN stays informational rather than becoming a
finding.
