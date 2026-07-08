resource "aws_organizations_policy" "region_lock" {
  name        = "doppelshield-region-lock"
  description = "Deny actions outside the allowed regions; global services exempted"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "DenyOutsideAllowedRegions"
        Effect   = "Deny"
        Resource = "*"
        NotAction = [
          "a4b:*",
          "account:*",
          "aws-portal:*",
          "billing:*",
          "budgets:*",
          "ce:*",
          "cloudfront:*",
          "cur:*",
          "globalaccelerator:*",
          "health:*",
          "iam:*",
          "identitystore:*",
          "importexport:*",
          "notifications:*",
          "notifications-contacts:*",
          "organizations:*",
          "pricing:*",
          "route53:*",
          "route53domains:*",
          "shield:*",
          "sso:*",
          "sso-directory:*",
          "sts:*",
          "support:*",
          "tax:*",
          "trustedadvisor:*",
          "waf:*",
        ]
        Condition = {
          StringNotEquals = {
            "aws:RequestedRegion" = var.allowed_regions
          }
        }
      }
    ]
  })
}

resource "aws_organizations_policy" "cost_and_tamper" {
  name        = "doppelshield-cost-guardrails"
  description = "Deny pricey compute and protect the guardrails"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "DenyExpensiveCompute"
        Effect   = "Deny"
        Resource = "*"
        Action = [
          "ec2:RunInstances",
          "ec2:RequestSpotInstances",
          "ec2:RequestSpotFleet",
          "sagemaker:*",
          "bedrock:*",
          "redshift:*",
          "redshift-serverless:*",
          "elasticmapreduce:*",
          "glue:*",
        ]
      },
      {
        Sid      = "ProtectGuardrailsAndKeys"
        Effect   = "Deny"
        Resource = "*"
        Action = [
          "organizations:LeaveOrganization",
          "cloudtrail:StopLogging",
          "cloudtrail:DeleteTrail",
          "cloudtrail:UpdateTrail",
          "cloudtrail:PutEventSelectors",
          "servicequotas:RequestServiceQuotaIncrease",
          "iam:CreateUser",
          "iam:CreateAccessKey",
          "iam:CreateLoginProfile",
        ]
      }
    ]
  })
}

resource "aws_organizations_policy_attachment" "region_lock_sandbox" {
  policy_id = aws_organizations_policy.region_lock.id
  target_id = var.sandbox_ou_id
}

resource "aws_organizations_policy_attachment" "cost_and_tamper_sandbox" {
  policy_id = aws_organizations_policy.cost_and_tamper.id
  target_id = var.sandbox_ou_id
}

resource "aws_organizations_policy_attachment" "region_lock_production" {
  count     = var.enforce_on_production ? 1 : 0
  policy_id = aws_organizations_policy.region_lock.id
  target_id = var.production_ou_id
}

resource "aws_organizations_policy_attachment" "cost_and_tamper_production" {
  count     = var.enforce_on_production ? 1 : 0
  policy_id = aws_organizations_policy.cost_and_tamper.id
  target_id = var.production_ou_id
}
