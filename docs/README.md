# Documentation

Reference material lives here, decisions live in [adr/](adr/), and procedures live in the runbook and the infrastructure READMEs. Start with the [architecture overview](architecture.md) for orientation. For a visual walkthrough of each verdict outcome, see the [Screenshots section of the root README](../README.md#screenshots); the images themselves live in [screenshots/](screenshots/).

## Reference

| Document                             | Scope                                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------- |
| [architecture.md](architecture.md)   | Component map, ports and adapters, request lifecycle, detection pipeline, AWS topology.  |
| [api.md](api.md)                     | Full API contract: schema, outcome matrix, warning codes, captured response transcripts. |
| [configuration.md](configuration.md) | Every environment variable: default, bounds, purpose, and deployment guidance.           |
| [threat-model.md](threat-model.md)   | Assets, trust boundaries, attacker capabilities, control mapping, residual risks.        |

## Decisions

Architecture decision records in [adr/](adr/), all accepted:

| ADR                                                           | Decision                                                         |
| ------------------------------------------------------------- | ---------------------------------------------------------------- |
| [0001](adr/0001-uniform-ssrf-error-oracle.md)                 | One uniform failure response, so checkUrl is not an SSRF oracle. |
| [0002](adr/0002-uts39-skeleton-homograph-detection.md)        | UTS #39 style skeleton matching with per-glyph evidence.         |
| [0003](adr/0003-strict-csp-via-nonce.md)                      | Strict CSP via a per-request nonce.                              |
| [0004](adr/0004-framework-agnostic-checkurl-core.md)          | Framework-agnostic engine, thin Next.js adapter.                 |
| [0005](adr/0005-warnings-based-report.md)                     | Categorical warnings instead of a numeric risk score.            |
| [0006](adr/0006-verdict-hue-triad.md)                         | Verdict tones on a safe, caution, danger, neutral hue system.    |
| [0007](adr/0007-single-instance-container-topology.md)        | Single container instance behind an edge.                        |
| [0008](adr/0008-aws-ecs-fargate-lean-topology.md)             | ECS on Fargate behind ALB and WAF realizes that topology.        |
| [0009](adr/0009-distroless-runtime-retires-undici-finding.md) | Distroless runtime; base-image finding retired via OpenVEX.      |
| [0010](adr/0010-automated-ecs-deploy.md)                      | Automated ECS deploy on release; Terraform owns infrastructure.  |

New decisions copy [adr/0000-template.md](adr/0000-template.md) to the next number.

## Operations

| Document                                                       | Scope                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [runbook.md](runbook.md)                                       | Release, deploy, post-deploy verification, rollback, emergency platform switch. |
| [../infra/README.md](../infra/README.md)                       | Terraform mechanics: bootstrap, first apply, deploying a digest, upgrade seam.  |
| [../infra/management/README.md](../infra/management/README.md) | Management-account governance: SCPs, cost detection, budgets.                   |

## Policies and process

| Document                                 | Scope                                                      |
| ---------------------------------------- | ---------------------------------------------------------- |
| [../SECURITY.md](../SECURITY.md)         | Vulnerability reporting, response windows, VEX exceptions. |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Setup, quality gates, testing policy, conventions.         |
| [../CHANGELOG.md](../CHANGELOG.md)       | Release history, Keep a Changelog format.                  |
