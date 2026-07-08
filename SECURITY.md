# Security Policy

## Supported versions

Security fixes are applied to the versions marked below. Older lines do not receive patches.

| Version | Supported |
| ------- | --------- |
| 1.x     | yes       |
| < 1.0   | no        |

## Reporting a vulnerability

Please report suspected vulnerabilities privately through GitHub private vulnerability
reporting. Open the Security tab on github.com/joelouf/doppelshield, choose "Report a
vulnerability", and submit your report there. Do not open a public issue or pull request for a
security report.

Include enough detail to reproduce: affected version, environment, the URL or input that
triggered the behavior, the steps you took, and the impact you observed. A proof of concept
helps, but is not required.

## Response window

Reporters can expect an acknowledgement within 72 hours and an initial assessment within 7 days.
If a fix is warranted, the disclosure timeline is agreed with the reporter, who is kept updated as
the fix progresses.

## Disclosure policy

DoppelShield follows coordinated disclosure. Please allow a reasonable window to ship a fix before
any public write-up. Reporters who want credit are named in the advisory, and a joint advisory can
be coordinated on request.

## Threat model

The system's assets, trust boundaries, attacker capabilities, control mapping, and accepted
residual risks are documented in [docs/threat-model.md](docs/threat-model.md).

## Vulnerability exceptions

Findings a scanner reports but that do not affect the shipped image are recorded as
machine-readable OpenVEX statements under `security/vex/`, each paired with an architecture
decision record that explains the analysis and sets a re-review trigger. Current statements:

- `security/vex/cve-2026-12151-undici.openvex.json` (CVE-2026-12151, undici): `not_affected`. The
  runtime image is distroless and carries no npm, so the npm-vendored undici the advisory scans is
  not present in the artifact, and the application opens no WebSocket, which is the only path the
  flaw affects. See [ADR-0009](docs/adr/0009-distroless-runtime-retires-undici-finding.md).
