output "region_lock_policy_id" {
  description = "Region-lock SCP id."
  value       = aws_organizations_policy.region_lock.id
}

output "cost_guardrails_policy_id" {
  description = "Cost-and-tamper SCP id."
  value       = aws_organizations_policy.cost_and_tamper.id
}

output "enforced_on_production" {
  description = "Whether the guardrail SCPs are attached to the Production OU yet."
  value       = var.enforce_on_production
}
