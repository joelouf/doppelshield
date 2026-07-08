# 10. Automated ECS deploy on release, Terraform owns infrastructure

Status: Accepted

Date: 2026-07-08

## Context

The release workflow builds, scans, signs, and mirrors the image to ECR on a
`v*` tag ([ADR-0008](0008-aws-ecs-fargate-lean-topology.md)), but rolling that
image onto the running Fargate task was a manual step: edit `image_digest` in
the gitignored `infra/terraform.tfvars`, then `terraform apply` from a laptop.
That path has three weaknesses. It needs long-lived AWS credentials on a
developer machine, which the release pipeline already avoids by using GitHub
OIDC. Hand-copying a digest and applying locally is error prone. And because the
deployed digest lives in a gitignored file, there is no auditable record of what
is in production. Merging to `main` does not deploy, so the running task silently
lags the released code.

Two options close the gap. Option A runs `terraform apply` inside CI, which keeps
Terraform as the single source of truth but requires a broad role with state
access and reconciles the entire stack on every deploy. Option B splits
responsibilities: Terraform owns the infrastructure and the initial task
definition, and a narrowly scoped deploy step promotes images.

## Decision

Adopt Option B. A `deploy` job in the release workflow, gated by a GitHub
`production` environment with a required-reviewer approval, assumes a dedicated
`doppelshield-deploy` role through GitHub OIDC. That role's trust is scoped to
`repo:<owner>/<repo>:environment:production`, so it is assumable only from an
approved production deployment, not from an arbitrary branch or tag. The job
registers a new task-definition revision pinning the just-released ECR digest,
rolls the one service, waits for steady state, and fails if the deployment
circuit breaker rolls the change back.

The service ignores `task_definition` changes (`lifecycle.ignore_changes`), so a
later `terraform apply` no longer reverts a pipeline deploy. The `image_digest`
variable becomes the bootstrap image used on first apply; thereafter the pipeline
promotes images. The deploy role's permissions are minimal: register and describe
task definitions, update and describe the single service, and pass only the
task-execution role (with an `iam:PassedToService` condition).

## Consequences

Deploys no longer require local credentials, and the human gate is enforced twice
over: by the environment's required reviewers in GitHub and by the OIDC trust
scope in AWS. The deploy role is least privilege, with no Terraform state access
and no broad administrative reach, which is a smaller blast radius than a
CI-runs-terraform role. Every deploy is visible in the Actions and Environments
views, and a rolled-back deploy fails the job loudly rather than passing silently.

The trade-offs: image promotion now lives outside Terraform, so `terraform apply`
changes infrastructure but not the running image; app deploys and infra changes
are two separate flows, and the runbook documents a manual CLI fallback for when
the pipeline is unavailable. The `image_digest` in tfvars is the bootstrap value,
not the live one, so the deployed image is read from ECS or inferred from the
release tag rather than from git. The required-reviewer gate is a GitHub
Environment setting; without it configured, a `v*` tag deploys without a manual
approval (still only from the production environment).
