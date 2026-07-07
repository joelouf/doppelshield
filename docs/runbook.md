# Deployment runbook

Operational procedures for DoppelShield's production topology: one container
instance behind an edge proxy, per [ADR-0007](adr/0007-single-instance-container-topology.md).
The deployable artifact is the image the release workflow publishes to
`ghcr.io/joelouf/doppelshield` — deploy by digest, never by mutable tag.

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

## Deploy

1. Pin the digest from the release (`docker buildx imagetools inspect
ghcr.io/joelouf/doppelshield:X.Y.Z` shows it) and point the host at
   `ghcr.io/joelouf/doppelshield@sha256:…`.
2. Set the environment (see `.env.example` for every tunable). The two that
   are deployment-critical:
   - `NEXT_PUBLIC_SITE_URL` — **build-time** value, baked into the published
     image via the workflow's default build arg. A different public domain
     requires rebuilding with `--build-arg NEXT_PUBLIC_SITE_URL=…`.
   - `CHECKURL_TRUSTED_IP_HEADER` — the header the edge sets:
     `cf-connecting-ip` (Cloudflare), `x-real-ip` (nginx),
     `x-forwarded-for` (AWS ALB/App Runner; safe because ALB appends and
     `resolveClientKey` reads the rightmost hop).
3. Health checks: point the platform's probe (and any uptime monitor) at
   `GET /api/health`. The image's own HEALTHCHECK already uses it.
4. Edge configuration (Cloudflare):
   - Proxy the DNS record (orange cloud); TLS mode Full (strict).
   - Rate-limiting rule on `POST /api/checkUrl` as the global cap; the
     in-process limiter remains as defense-in-depth.
   - Lock the origin to Cloudflare's IP ranges (host firewall or Cloudflare
     Tunnel) so the trusted-header contract cannot be bypassed by a direct
     connection to the origin.

## Post-deploy verification

Run all three before calling a deploy done:

```bash
# 1. Health and headers: expect 200, CSP with a nonce, HSTS, nosniff.
curl -sI https://<domain>/ | grep -iE 'content-security-policy|strict-transport|x-content-type'
curl -s https://<domain>/api/health   # {"status":"ok"}

# 2. Scan round-trip: expect a CheckResult JSON with apiVersion 1.
curl -s -X POST https://<domain>/api/checkUrl \
  -H 'content-type: application/json' -d '{"url":"https://example.com"}'

# 3. Header-spoof test: a forged client-IP header must NOT reach the app.
# Send bursts with a spoofed header; if rotation defeats the 429, the edge is
# not overwriting the trusted header — stop and fix the edge config.
for i in $(seq 1 25); do
  curl -s -o /dev/null -w '%{http_code}\n' -X POST https://<domain>/api/checkUrl \
    -H 'content-type: application/json' -H "cf-connecting-ip: 203.0.113.$i" \
    -d '{"url":"https://example.com"}'
done   # expect 429s near the configured limit despite the rotating header
```

## Rollback

Point the host back at the previous image digest and redeploy. There is no
database and no migration state; the only state lost is in-memory rate-limit
counters, which reset harmlessly. Keep the last two release digests noted in
the deploy tooling/host config for a one-step revert.

## Emergency platform switch

The artifact is a standard OCI image with env-only configuration, so a switch
is configuration work:

1. Stand up the container on the new host from the same GHCR digest.
2. Set the same environment variables; update `CHECKURL_TRUSTED_IP_HEADER` if
   the edge changes (see the table in step 2 above).
3. Re-author the edge layer (rate-limit rule, origin lockdown) on the new
   provider — edge rules are the one non-portable layer (ADR-0007).
4. Run the post-deploy verification, then move DNS.

AWS mapping, if that switch is ever exercised: App Runner or ECS Fargate run
the image unchanged; stdout JSON logs land in CloudWatch via the `awslogs`
driver; the ALB/App Runner health check targets `/api/health`;
`CHECKURL_TRUSTED_IP_HEADER=x-forwarded-for`; add an ECR login/tag step to the
release workflow (OIDC-federated role, no static keys) to mirror the image.
