output "alb_dns_name" {
  description = "CNAME target for the Cloudflare records (gray cloud, DNS only)."
  value       = aws_lb.main.dns_name
}

output "acm_validation_records" {
  description = "Create these CNAMEs in Cloudflare (DNS only) to validate the certificate."
  value = {
    for option in aws_acm_certificate.main.domain_validation_options :
    option.domain_name => {
      name  = option.resource_record_name
      type  = option.resource_record_type
      value = option.resource_record_value
    }
  }
}

output "ecr_repository_url" {
  description = "Mirror target; the task definition pins digests from here."
  value       = aws_ecr_repository.main.repository_url
}

output "release_mirror_role_arn" {
  description = "Set as the AWS_RELEASE_ROLE_ARN repository variable so the release workflow can mirror images."
  value       = aws_iam_role.release_mirror.arn
}
