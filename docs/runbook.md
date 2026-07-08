# Deployment runbook

Operational procedures for DoppelShield's production topology: one container
instance behind an edge proxy, per [ADR-0007](adr/0007-single-instance-container-topology.md),
realized as a Fargate task behind an ALB with AWS WAF, per
[ADR-0008](adr/0008-aws-ecs-fargate-lean-topology.md). The deployable
artifact is the image the release workflow publishes to
`ghcr.io/joelouf/doppelshield`. Deploy by digest, never by mutable tag. On
version tags the workflow also mirrors the image digest-identical into ECR,
which is what the task definition pins.

## Release

1. Merge to `main` through CI (all gates green on Node 24).
2. Move the `[Unreleased]` entries in CHANGELOG.md under a new version heading,
   bump `version` in package.json to match, and commit.
3. Tag and push: `git tag vX.Y.Z && git push origin vX.Y.Z`.
4. The Release workflow builds the image, fails on fixable HIGH/CRITICAL scan
   findings, pushes to GHCR with an SBOM and provenance attached, and records
   a GitHub attestation. Verify it:

   ```bash
   gh attestation verify oci://ghcr.io/joelouf/doppelshield:X.Y.Z --owner joelouf
   ```

   A version is released once, never re-cut: the ECR repository is
   immutable-tagged, and a rebuild produces a new digest (the provenance
   attestation embeds run metadata), so re-pushing an existing tag fails the
   mirror job with `ImageTagAlreadyExistsException`. Ship a fix as a new patch
   version. To genuinely replace one, first
   `aws ecr batch-delete-image --repository-name doppelshield --image-ids imageTag=X.Y.Z`,
   then re-run.

## Deploy

1. Pin the digest from the release (`docker buildx imagetools inspect
ghcr.io/joelouf/doppelshield:X.Y.Z` shows it) as `image_digest` in
   `infra/terraform.tfvars`, then `terraform plan` and `terraform apply`
   from `infra/` (Terraform mechanics in [infra/README.md](../infra/README.md)).
   The task definition references the ECR mirror of the same digest; the
   release workflow fails if the mirrored digest differs from GHCR's.
2. Set the environment (see `.env.example` for every tunable). The two that
   are deployment-critical:
   - `NEXT_PUBLIC_SITE_URL`: **build-time** value, baked into the published
     image via the workflow's default build arg. A different public domain
     requires rebuilding with `--build-arg NEXT_PUBLIC_SITE_URL=…`.
   - `CHECKURL_TRUSTED_IP_HEADER`: the header the edge sets:
     `x-forwarded-for` (AWS ALB, the production edge; safe because the ALB
     appends and `resolveClientKey` reads the rightmost hop),
     `cf-connecting-ip` (Cloudflare), `x-real-ip` (nginx). The task
     definition in `infra/ecs.tf` sets the production value.
3. Health checks: the ALB target group and the task-definition probe both
   target `GET /api/health`. ECS ignores the image's own HEALTHCHECK, which
   is why the task definition declares its twin.
4. Edge configuration (AWS, per ADR-0008; expressed in `infra/`, not the console):
   - TLS terminates at the ALB with the ACM certificate; port 80 only
     redirects. The Cloudflare DNS records stay gray cloud (DNS only) so
     exactly one edge writes headers.
   - The WAF rate-based rule caps `POST /api/checkUrl` per source IP at
     roughly 5x the in-process limit; the in-process limiter remains the
     precise per-client enforcer (defense-in-depth).
   - The origin lock is the task security group admitting port 3000 only by
     reference to the ALB security group, so the trusted-header contract
     cannot be bypassed by a direct connection to the task.

## Post-deploy verification

Run all three before calling a deploy done:

```bash
# 1. Health and headers: expect 200, CSP with a nonce, HSTS, nosniff.
curl -sI https://<domain>/ | grep -iE 'content-security-policy|strict-transport|x-content-type'
curl -s https://<domain>/api/health   # {"status":"ok"}

# 2. Scan round-trip: expect a CheckResult JSON with apiVersion 1.
curl -s -X POST https://<domain>/api/checkUrl \
  -H 'content-type: application/json' -d '{"url":"https://example.com"}'

# 3. Header-spoof test: forged client-IP entries must NOT defeat rate limiting.
# The ALB appends the real client address to x-forwarded-for, so spoofed
# values pile up leftward and resolveClientKey reads the rightmost,
# edge-attested hop. If rotation defeats the 429, the edge is not appending
# as expected; stop and fix the edge config.
for i in $(seq 1 25); do
  curl -s -o /dev/null -w '%{http_code}\n' -X POST https://<domain>/api/checkUrl \
    -H 'content-type: application/json' -H "x-forwarded-for: 203.0.113.$i" \
    -d '{"url":"https://example.com"}'
done   # expect 429s near the configured limit despite the rotating header
```

## Rollback

Point `image_digest` in `infra/terraform.tfvars` back at the previous digest
and `terraform apply`; ECS also keeps numbered task-definition revisions as
a second revert path, and the deployment circuit breaker rolls a failed
deploy back automatically. There is no database and no migration state; the
only state lost is in-memory rate-limit counters, which reset harmlessly.
Keep the last two release digests noted in `terraform.tfvars` comments for a
one-step revert.

## Emergency platform switch

The artifact is a standard OCI image with env-only configuration, so a switch
is configuration work:

1. Stand up the container on the new host from the same GHCR digest.
2. Set the same environment variables; update `CHECKURL_TRUSTED_IP_HEADER` if
   the edge changes (see the table in step 2 above).
3. Re-author the edge layer (rate-limit rule, origin lockdown) on the new
   provider; edge rules are the one non-portable layer (ADR-0007).
4. Run the post-deploy verification, then move DNS.

Cloudflare mapping, if that switch is ever exercised: any container host
runs the image unchanged behind proxied DNS (orange cloud, TLS mode Full
(strict)); `CHECKURL_TRUSTED_IP_HEADER=cf-connecting-ip`; seal the origin
with a Cloudflare Tunnel (or a host firewall on Cloudflare's published IP
ranges). Note the free plan's rate rules match path only, per IP, over a
fixed 10-second window (no HTTP method matching), so the in-process limiter
carries more of the enforcement there.
