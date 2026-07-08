variable "aws_region" {
  description = "Provider region. us-east-1 for the global/billing services this module manages."
  type        = string
  default     = "us-east-1"
}

variable "alert_email" {
  description = "Address for anomaly, budget, and billing-alarm notifications."
  type        = string
}

variable "sandbox_ou_id" {
  description = "Sandbox OU (holds the Lab account). Guardrail SCPs attach here first for testing."
  type        = string
}

variable "production_ou_id" {
  description = "Workloads/Production OU (holds doppelshield-prod)."
  type        = string
}

variable "enforce_on_production" {
  description = "Attach the guardrail SCPs to the Production OU. Keep false for the first apply, verify nothing breaks in the Lab sandbox, then set true."
  type        = bool
  default     = false
}

variable "lab_account_id" {
  description = "Legacy Lab sandbox account, for its zero-spend budget."
  type        = string
}

variable "allowed_regions" {
  description = "Regions the region-lock SCP permits. us-east-2 runs the workload; us-east-1 is kept for global-service API calls."
  type        = list(string)
  default     = ["us-east-1", "us-east-2"]
}

variable "anomaly_threshold_usd" {
  description = "Minimum anomaly impact that triggers a Cost Anomaly Detection alert. Below the AWS $100 default so small spikes still surface."
  type        = number
  default     = 20
}

variable "anomaly_monitor_arn" {
  description = "ARN of the account's existing default SERVICE anomaly monitor. AWS auto-creates one and allows only one; find it with: aws ce get-anomaly-monitors --region us-east-1"
  type        = string
}

variable "zero_spend_budget_usd" {
  description = "Ceiling for the idle Management and Lab accounts; any spend above this is unexpected and alerts."
  type        = number
  default     = 1
}

variable "billing_alarm_usd" {
  description = "Consolidated estimated-charges ceiling for the payer-level CloudWatch tripwire."
  type        = number
  default     = 120
}

variable "activate_project_cost_tag" {
  description = "Activate the Project cost-allocation tag. Leave false until Project appears under Billing -> Cost Allocation Tags (up to 24h after the first tagged resource bills); activating it earlier fails the apply."
  type        = bool
  default     = false
}
