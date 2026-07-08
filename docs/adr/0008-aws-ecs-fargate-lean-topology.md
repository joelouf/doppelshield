# 8. AWS ECS on Fargate realizes the single-instance topology

Status: Accepted

Date: 2026-07-07

## Context

ADR-0007 fixed the shape of production (one container instance behind an edge
that terminates TLS, applies a coarse rate limit, and is the sole writer of
the trusted client-IP header) but left the substrate open and named the edge
as "currently Cloudflare". Selecting the concrete host surfaced constraints
the abstract shape could not see:

- Cloudflare's free plan cannot express the runbook's edge rule. Its
  rate-limiting rules match on path only (no HTTP method), count per IP over
  a fixed 10-second window, and allow exactly one rule. The rule the runbook
  asks for, a cap on `POST /api/checkUrl`, is not writable there.
- Managed PaaS origins largely cannot be locked. Render restricts inbound IP
  rules for web services to its $499/month tier, and fronting it with a
  second Cloudflare zone produces a double-proxy path whose
  `cf-connecting-ip` behavior is undocumented. AWS App Runner closed to new
  customers in April 2026. Both fail before price is even discussed.
- The two viable finalists were a self-managed VPS with a Cloudflare Tunnel
  sidecar (origin sealed by construction, roughly $6/month, deep
  systems-hardening surface) and AWS ECS on Fargate behind an ALB with AWS
  WAF (roughly $45/month, the pattern enterprise security teams actually
  operate).

The deciding requirement, beyond ADR-0007's invariants, is what this project
exists to demonstrate: layer-correct security decisions in the environment
employers run. That favors the AWS shape; the VPS remains the documented
low-cost fallback via the runbook's platform-switch procedure.

## Decision

Production runs as a single Fargate task in us-east-2 behind an
internet-facing ALB with a regional AWS WAF web ACL. The environment is
expressed in Terraform under `infra/`; the console is for reading, not
writing.

- **Edge.** The ALB terminates TLS (ACM certificate) and redirects HTTP. The
  WAF web ACL carries one rate-based rule scoped to exactly
  `POST /api/checkUrl`, aggregated on the TCP source address. Never
  `FORWARDED_IP`: WAF reads that header's leftmost, client-supplied hop. The
  edge cap sits about 5x above the in-process limit, so the app's limiter
  (ADR-0007's defense-in-depth layer) remains the precise per-client
  enforcer and the edge only absorbs floods.
- **Trusted header.** `CHECKURL_TRUSTED_IP_HEADER=x-forwarded-for`. The ALB
  appends the connecting address to whatever arrives, so spoofed entries
  accumulate on the left while the rightmost hop stays edge-attested,
  matching the rightmost-hop parse in `resolveClientKey`.
- **Origin lock.** The task's security group admits port 3000 only by
  reference to the ALB's security group. The lean subnet layout places the
  task in a public subnet with a public IP used for egress only; the
  documented upgrade seam is private subnets plus a NAT gateway, an additive
  Terraform change with no application or DNS impact. This repeats
  ADR-0007's pattern: correct at current scale, escape path pre-built.
- **No task role.** The container gets no IAM task role at all. The app
  calls no AWS APIs, so the Fargate credentials endpoint has nothing to
  serve, and the SSRF-to-cloud-credentials escalation is removed as a
  category rather than mitigated. Fargate exposes no EC2 instance metadata
  service, and its task endpoints live at 169.254.170.2, inside the
  link-local range the engine already blocks at connect time.
- **Supply chain.** GHCR remains the source of truth. On version tags the
  release workflow assumes a tag-scoped IAM role through GitHub's OIDC
  provider (no long-lived keys exist) and copies the image to ECR
  digest-identical, then fails the mirror job if the digests differ, so no
  mismatched image is ever pinned. The GitHub build attestation verifies
  unchanged against the mirror because it is keyed by digest, not registry.
  The task definition pins that digest.
- **Region.** us-east-2. Full availability and exact price parity with
  us-east-1 for everything in this stack, without inheriting us-east-1's
  control-plane concentration; the October 19-20, 2025 event (see AWS's
  post-event summary at aws.amazon.com/message/101925) is the concrete
  precedent. Nothing here is region-bound: only CloudFront-scoped WAF and
  ACM resources require us-east-1, and this design uses neither.
- **DNS.** The domain is registered at Cloudflare, which requires Cloudflare
  nameservers, so records stay there as plain DNS (gray cloud) pointing at
  the ALB. The proxy is deliberately not in the serving path: exactly one
  edge writes headers.
- **Tooling.** Terraform CE (BUSL-1.1; free for internal production use,
  with IBM as licensor since the 2025 acquisition). OpenTofu was evaluated
  as the MPL-2.0 alternative: it matches every capability this stack uses,
  including S3-native lock files, and adds client-side state encryption,
  which is redundant behind the S3 backend's server-side encryption and
  bucket policy on a state that carries no secrets. The deciding factors
  were ecosystem weight (Terraform runs the majority of 2026 cloud
  deployments and is the keyword hiring pipelines match) and vulnerability
  handling: HashiCorp is a CVE Numbering Authority with numbered security
  bulletins, while OpenTofu advisories carry no CVE IDs and can be missed
  by CVE-feed-driven scanners. State stays format-compatible as long as
  divergent features are avoided, so a later OpenTofu switch remains cheap
  at this scale.

## Consequences

Roughly $45/month against $6 for the VPS runner-up; the difference buys the
managed edge (WAF, ACM, ALB health gating) and the operational surface this
portfolio is meant to exercise (VPC design, security-group referencing, IAM
federation, IaC). The single task keeps ADR-0007's availability trade-off;
the deployment circuit breaker adds automatic rollback to the last healthy
revision, and rolling deploys briefly run two tasks, the overlap the runbook
already accepts.

ECS ignores the image's Docker HEALTHCHECK, so the task definition declares
an equivalent probe and the ALB target group gates deployments on
`GET /api/health`.

The runbook's edge section now describes ALB and WAF; Cloudflare-specific
guidance moves to the emergency platform switch section, which gains the
reverse mapping (proxied DNS, tunnel-sealed origin, `cf-connecting-ip`).
Edge rules remain the one non-portable layer, exactly as ADR-0007 accepted.
