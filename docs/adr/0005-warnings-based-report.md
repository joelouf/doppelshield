# 5. A warnings based report instead of a numeric risk score

Status: Accepted

Date: 2026-06-30

## Context

The scanner needs to communicate what it found about a URL. An early version
expressed the outcome as a numeric risk score with a scorecard: each signal
contributed points, the points summed, and the total drove a rating.

A single number reads as more precise and more authoritative than the analysis
behind it. The scanner inspects a small, well defined set of conditions:
confusable host characters, mixed script hosts, non ASCII paths, an HTTPS to
HTTP downgrade in the redirect chain, redirect cycles, and reaching the redirect
follow limit. These are categorical findings, not measurements on a continuous
scale. Collapsing them into a weighted sum invents a precision that does not
exist, forces arbitrary weights, and produces scores that two genuinely
different situations can share. For a portfolio piece aimed at a security
audience, a fabricated 0 to 100 number is a credibility liability; it claims
more than the evidence supports.

What the analysis actually yields is a set of named warnings, each with a known
severity, and a single overall judgment with a plain language rationale. That
maps to a warnings based report, not a score.

## Decision

Results are reported as a tone plus a list of findings, with no numeric score
anywhere in the pipeline. The risk scoring path was removed: there is no
scoreUrl function and no scorecard component in the source tree.

Severity is categorical, defined in src/lib/verdict.ts. The SEVERITY map assigns
each warning code either 'flagged' or 'caution': the two homograph impersonation
codes are 'flagged'; mixed script, non ASCII path, HTTPS downgrade, redirect
cycle, and max redirects reached are 'caution'. INFORMATIONAL_CODES holds
punycode_host, which is informational and never elevates the verdict on its own.

verdictFor in src/lib/verdict.ts derives one overall verdict from the warning
set rather than summing anything. If any warning is 'flagged' the verdict tone
is 'flagged' with label FLAGGED. Otherwise, if there are actionable warnings
(any warning that is not in INFORMATIONAL_CODES) the tone is 'caution' with
label REVIEW, and the rationale states how many signals are worth reviewing.
Scan level errors (invalid_input, rate_limited, unavailable, unreachable, and
any other error) resolve to 'indeterminate' with label INDETERMINATE. With no
actionable warnings and no error the tone is 'clear' with label CLEAR, with a
note that distinguishes a bare internationalized domain from an ordinary host.
Each branch returns a human readable note, which is the rationale that replaces a
score.

Findings carry a per row tone, computed in src/lib/findings.ts. findingTone
returns 'neutral' for informational codes, 'danger' when SEVERITY is 'flagged',
and 'caution' otherwise. findingLabel produces the short tag for each code, and
FINDING_DETAIL holds the one line explanation shown next to it.

The presentation in src/components/ScanReport.tsx is driven by tone and
findings, not by a number. ScanReportProps takes a tone (flagged, caution,
clear, or indeterminate), a label, an optional note, and a findings array of
{ label, tone, detail }. The tone selects the band color and verdict badge
through the BAND_BAR and BAND_TONE maps; each finding renders as a FindingRow
whose data-state comes from its tone. The page in src/app/page.tsx wires this
together: it calls verdictFor to get the verdict, maps each warning through
findingLabel, findingTone, and FINDING_DETAIL into a ReportFinding, and passes
verdict.tone, verdict.label, verdict.note, and the findings array to ScanReport.
No score is computed or displayed at any step.

## Consequences

The report says only what the analysis supports: a categorical verdict, a plain
language reason, and a list of named findings each with its own severity. There
are no weights to tune and no invented number to defend. Adding a new signal is a
matter of giving its code a severity in SEVERITY (or adding it to
INFORMATIONAL_CODES), a label and detail in src/lib/findings.ts, and letting
verdictFor classify it; nothing has to be rebalanced against a total.

The trade off is that consumers who want a single sortable metric do not get one.
Two FLAGGED results cannot be ranked against each other by the report itself,
because severity here is a class, not a position on a scale. This is an accepted
trade-off; an honest categorical verdict serves the audience better than a
precise looking number the evidence cannot justify.

Anyone reintroducing a quantitative summary should treat it as a new decision
that supersedes this one, and should weigh it against the credibility cost that
motivated the removal. The invariant to preserve is that the verdict and the
report remain driven by tone and findings: severity stays categorical in
src/lib/verdict.ts, and ScanReport keeps taking a tone and a findings list rather
than a numeric input.
