variable "aws_region" {
  description = "Deployment region. us-east-2 per ADR-0008."
  type        = string
  default     = "us-east-2"
}

variable "domain_name" {
  description = "Public apex domain served by the ALB."
  type        = string
  default     = "doppelshield.com"
}

variable "image_digest" {
  description = "Digest of the release image to run, as sha256:<hex>. Deploys pin this, never a tag."
  type        = string

  validation {
    condition     = can(regex("^sha256:[0-9a-f]{64}$", var.image_digest))
    error_message = "Must be a full image digest of the form sha256:<64 hex chars>."
  }
}

variable "github_repository" {
  description = "GitHub repository (owner/name) allowed to assume the release-mirror role via OIDC."
  type        = string
  default     = "joelouf/doppelshield"
}

variable "alert_email" {
  description = "Address for CloudWatch alarm and budget notifications."
  type        = string
}

variable "container_port" {
  description = "Port the container listens on."
  type        = number
  default     = 3000
}

variable "task_cpu" {
  description = "Fargate task CPU units (256 = 0.25 vCPU)."
  type        = number
  default     = 256
}

variable "task_memory" {
  description = "Fargate task memory in MiB."
  type        = number
  default     = 1024
}

variable "waf_rate_limit" {
  description = "Requests per source IP per window that trip the edge rate rule on POST /api/checkUrl. Deliberately ~5x the in-process limit so the app's limiter stays the precise enforcer (ADR-0007) and the edge only absorbs floods."
  type        = number
  default     = 100
}

variable "waf_rate_window_seconds" {
  description = "Evaluation window for the edge rate rule. WAF accepts 60, 120, 300, or 600."
  type        = number
  default     = 60

  validation {
    condition     = contains([60, 120, 300, 600], var.waf_rate_window_seconds)
    error_message = "WAF evaluation windows must be 60, 120, 300, or 600 seconds."
  }
}

variable "monthly_budget_usd" {
  description = "Monthly cost budget for the account; alert thresholds fire against it."
  type        = number
  default     = 60
}

variable "daily_budget_usd" {
  description = "Daily spend that trips the same-day alert. Baseline is ~$1.50/day, so this catches a several-times-normal spike."
  type        = number
  default     = 10
}
