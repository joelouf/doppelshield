resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/doppelshield"
  retention_in_days = 30
}

resource "aws_sns_topic" "alerts" {
  name = "doppelshield-alerts"
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_log_metric_filter" "ssrf_blocked" {
  name           = "ssrf-blocked"
  log_group_name = aws_cloudwatch_log_group.app.name
  pattern        = "{ $.event = \"ssrf_blocked\" }"

  metric_transformation {
    name          = "SsrfBlocked"
    namespace     = "DoppelShield"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_metric_alarm" "ssrf_spike" {
  alarm_name          = "doppelshield-ssrf-spike"
  alarm_description   = "Sustained burst of SSRF-blocked scans; someone is probing"
  namespace           = "DoppelShield"
  metric_name         = "SsrfBlocked"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 20
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "doppelshield-alb-5xx"
  alarm_description   = "ALB-generated 5xx responses"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HTTPCode_ELB_5XX_Count"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 5
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
}

resource "aws_cloudwatch_metric_alarm" "target_unhealthy" {
  alarm_name          = "doppelshield-target-unhealthy"
  alarm_description   = "The single task has failed its health checks for three minutes"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "UnHealthyHostCount"
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 3
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.app.arn_suffix
  }
}

resource "aws_budgets_budget" "monthly" {
  name         = "doppelshield-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.alert_email]
  }
}

resource "aws_budgets_budget" "daily" {
  name         = "doppelshield-daily"
  budget_type  = "COST"
  limit_amount = tostring(var.daily_budget_usd)
  limit_unit   = "USD"
  time_unit    = "DAILY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }
}

resource "aws_cloudwatch_metric_alarm" "log_ingestion" {
  alarm_name          = "doppelshield-log-ingestion"
  alarm_description   = "Unusual CloudWatch Logs ingestion into the app log group"
  namespace           = "AWS/Logs"
  metric_name         = "IncomingBytes"
  statistic           = "Sum"
  period              = 3600
  evaluation_periods  = 1
  threshold           = 524288000
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LogGroupName = aws_cloudwatch_log_group.app.name
  }
}
