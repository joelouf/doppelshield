# Infrastructure

Terraform definition of the production environment described in
[ADR-0008](../docs/adr/0008-aws-ecs-fargate-lean-topology.md): a single
Fargate task in us-east-2 behind an ALB with a WAF rate rule, running the
release image pinned by digest. Operational procedures (deploy, verification,
rollback) live in [docs/runbook.md](../docs/runbook.md); this file covers only
the Terraform mechanics.

## One-time bootstrap

The state bucket exists outside Terraform (it has to hold the state that
would otherwise describe it):

```bash
aws s3api create-bucket --bucket doppelshield-tfstate-<account-id> \
  --region us-east-2 --create-bucket-configuration LocationConstraint=us-east-2
aws s3api put-bucket-versioning --bucket doppelshield-tfstate-<account-id> \
  --versioning-configuration Status=Enabled
aws s3api put-public-access-block --bucket doppelshield-tfstate-<account-id> \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

Then copy the two local-config templates and fill them in:

```bash
cp backend.hcl.example backend.hcl             # State bucket name
cp terraform.tfvars.example terraform.tfvars   # Image digest, alert email
terraform init -backend-config=backend.hcl
```

State locking uses S3 lock files (`use_lockfile`); there is no DynamoDB
table. Both `backend.hcl` and `terraform.tfvars` are gitignored: not secret,
but account-specific.

## First apply (two phases)

DNS lives on Cloudflare nameservers, so the ACM validation records have to be
created there by hand, and the certificate is created before the value to put
in those records exists. Apply the certificate first, read its records, then
apply the rest:

```bash
terraform apply -target=aws_acm_certificate.main
terraform output acm_validation_records
```

Create each printed record in Cloudflare as a CNAME, **gray cloud (DNS
only)**. Then run the full apply; it blocks on certificate validation until
those records resolve, usually a few minutes:

```bash
terraform apply
```

When it completes, point the site at the load balancer, again gray cloud:

```bash
terraform output alb_dns_name   # CNAME target for the apex and www records
```

A proxied (orange-cloud) record here would put a second edge in front of the
ALB and break the rightmost-hop trust contract (ADR-0008); keep these records
DNS-only.

Finally, wire the release mirror. Set a GitHub repository variable so the
release workflow can push to ECR on the next version tag (until it is set the
mirror job skips and the digest the task pins is never created):

```bash
terraform output release_mirror_role_arn
# GitHub > repo Settings > Secrets and variables > Actions > Variables:
#   - AWS_RELEASE_ROLE_ARN = <ARN>
```

## Deploying a digest

Every deploy is the same change: set `image_digest` in `terraform.tfvars` to
the release digest, then

```bash
terraform plan
terraform apply
```

Rollback is the previous digest and `terraform apply` again; ECS also keeps
numbered task-definition revisions as a second path.

## The upgrade seam

The task currently runs in a public subnet with a public IP for egress,
inbound closed by security groups. Moving to the textbook layout is additive:
private subnets and a NAT gateway in the reserved upper half of the VPC
range, repoint `aws_ecs_service.app` at them, and set
`assign_public_ip = false`. Nothing else changes.
