# Management-account governance

Org-wide cost guardrails, applied from the management account, separate from the prod stack in [`../`](../README.md). The split is deliberate: the prod deploy role has no path into this account, so a compromise of prod cannot edit the SCPs that constrain it.

Everything here is **$0/month**: SCPs, Cost Anomaly Detection, budgets, one billing alarm (inside the free alarm tier), and cost-allocation-tag activation.

## What it manages

- **Two SCPs** (the real-time preventive layer): a region lock (deny outside
  `us-east-2`/`us-east-1`, global services exempted) and a cost-and-tamper
  policy (deny EC2/GPU/pricey services, deny quota increases, deny access-key
  creation, protect CloudTrail and org membership).
- **Cost Anomaly Detection** across the consolidated bill, alerting on spikes
  above a low dollar floor.
- **Zero-spend budgets** on the idle management and Lab accounts.
- **A payer-level `EstimatedCharges` billing alarm** as a coarse backstop.
- **`Project` cost-allocation-tag activation.**

## Apply (two-stage, SCPs tested on Sandbox first)

The region-lock SCP is powerful and the easiest to misconfigure, so it lands on
the Sandbox OU (the Lab account) before the Production OU.

```bash
cp backend.hcl.example backend.hcl
cp terraform.tfvars.example terraform.tfvars   # set alert_email
export AWS_PROFILE=ds-mgmt
terraform init -backend-config=backend.hcl

# Stage 1: SCPs on the Sandbox OU only (enforce_on_production = false).
terraform apply
```

Then verify the Lab account still behaves: sign into it via SSO and confirm you
can list resources in `us-east-2` and reach the console (global services). Once
satisfied, extend to production:

```bash
# Stage 2: set enforce_on_production = true in terraform.tfvars
terraform apply
```

## One-time console steps (no Terraform resource)

- **Receive billing alerts:** management account → Billing and Cost Management
  → Billing Preferences → enable "Receive CloudWatch billing alerts". Until
  this is on, the `EstimatedCharges` alarm has no metric.
- **Confirm the SNS subscription** email for billing alerts.
- **Centralized root credential removal** (recommended, handled in the console
  so the root-credential change is visible): enable centralized root access,
  then remove the root credentials on the prod and Lab member accounts.

## Rollback

Detach a policy by removing its `aws_organizations_policy_attachment` (or set
`enforce_on_production = false`) and `terraform apply`. If an SCP ever locks out
a needed action, an org admin in the management account (never subject to SCPs)
can detach it immediately.
