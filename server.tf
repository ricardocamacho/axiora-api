terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.90"
    }
  }

  required_version = ">= 1.2.0"
}

provider "aws" {
  region = "us-east-2"
}

variable "aws_account_id" {
  description = "AWS account id"
  type        = string
  default     = "571994632048"
}

variable "aws_default_vpc_id" {
  description = "Default VPC ID"
  type        = string
  default     = "vpc-339e815b"
}

resource "aws_security_group" "axiora_sg" {
  name        = "axiora-sg"
  description = "Allow SSH, HTTP, and HTTPS inbound traffic and all outbound traffic"
  vpc_id      = var.aws_default_vpc_id

  tags = {
    Name = "axiora-sg"
  }
}

resource "aws_vpc_security_group_ingress_rule" "allow_ssh_ipv4" {
  security_group_id = aws_security_group.axiora_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 22
  ip_protocol       = "tcp"
  to_port           = 22
}

resource "aws_vpc_security_group_ingress_rule" "allow_http_ipv4" {
  security_group_id = aws_security_group.axiora_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  ip_protocol       = "tcp"
  to_port           = 80
}

resource "aws_vpc_security_group_ingress_rule" "allow_http_ipv6" {
  security_group_id = aws_security_group.axiora_sg.id
  cidr_ipv6         = "::/0"
  from_port         = 80
  ip_protocol       = "tcp"
  to_port           = 80
}

resource "aws_vpc_security_group_ingress_rule" "allow_https_ipv4" {
  security_group_id = aws_security_group.axiora_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  ip_protocol       = "tcp"
  to_port           = 443
}

resource "aws_vpc_security_group_ingress_rule" "allow_https_ipv6" {
  security_group_id = aws_security_group.axiora_sg.id
  cidr_ipv6         = "::/0"
  from_port         = 443
  ip_protocol       = "tcp"
  to_port           = 443
}

resource "aws_vpc_security_group_egress_rule" "allow_all_traffic_ipv4" {
  security_group_id = aws_security_group.axiora_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1" # semantically equivalent to all ports
}

resource "aws_vpc_security_group_egress_rule" "allow_all_traffic_ipv6" {
  security_group_id = aws_security_group.axiora_sg.id
  cidr_ipv6         = "::/0"
  ip_protocol       = "-1" # semantically equivalent to all ports
}

resource "aws_iam_role" "axiora_ec2_role" {
  name = "axiora-ec2-role"

  # Terraform's "jsonencode" function converts a
  # Terraform expression result to valid JSON syntax.
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_iam_instance_profile" "axiora_ec2_profile" {
  name = "axiora-ec2-profile"
  role = aws_iam_role.axiora_ec2_role.name
}

resource "aws_iam_policy" "axiora_ec2_policy" {
  name        = "axiora-ec2-policy"
  description = "Allow Axiora EC2 to access Axiora resources"
  # Terraform's "jsonencode" function converts a
  # Terraform expression result to valid JSON syntax.
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:Query",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
        ]
        Effect = "Allow"
        Resource = [
          "arn:aws:dynamodb:us-east-2:${var.aws_account_id}:table/axiora-api-prod",
          "arn:aws:dynamodb:us-east-2:${var.aws_account_id}:table/axiora-api-prod/index/SK-PK-index",
        ]
      },
      {
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
        ]
        Effect   = "Allow"
        Resource = "arn:aws:ses:us-east-2:${var.aws_account_id}:identity/hello@codingsquad.co"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "axiora_attach_policy1" {
  role       = aws_iam_role.axiora_ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "axiora_attach_policy2" {
  role       = aws_iam_role.axiora_ec2_role.name
  policy_arn = aws_iam_policy.axiora_ec2_policy.arn
}

resource "aws_instance" "axiora_ec2" {
  ami                  = "ami-0d0f28110d16ee7d6"
  instance_type        = "t2.nano"
  key_name             = "exploring-rsa-kp"
  iam_instance_profile = aws_iam_instance_profile.axiora_ec2_profile.name

  tags = {
    Name = "axiora-ec2"
  }

  vpc_security_group_ids = [aws_security_group.axiora_sg.id]
}

data "aws_subnets" "default_vpc_subnets" {
  filter {
    name   = "vpc-id"
    values = [var.aws_default_vpc_id]
  }
}

data "aws_subnet" "subnets" {
  for_each = toset(data.aws_subnets.default_vpc_subnets.ids)
  id       = each.value
}

resource "aws_lb" "axiora_lb" {
  name               = "axiora-lb"
  load_balancer_type = "application"
  security_groups    = [aws_security_group.axiora_sg.id]
  subnets            = [for subnet in data.aws_subnet.subnets : subnet.id]
}

resource "aws_lb_target_group" "axiora_lb_tg" {
  name     = "axiora-lb-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.aws_default_vpc_id
}

resource "aws_lb_target_group_attachment" "axiora_lb_tg_attachments" {
  target_group_arn = aws_lb_target_group.axiora_lb_tg.arn
  target_id        = aws_instance.axiora_ec2.id
  port             = 80
}

resource "aws_lb_listener" "axiora_lb_listener_http" {
  load_balancer_arn = aws_lb.axiora_lb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.axiora_lb_tg.arn
  }
}

resource "aws_lb_listener" "axiora_lb_listener_https" {
  load_balancer_arn = aws_lb.axiora_lb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = "arn:aws:acm:us-east-2:${var.aws_account_id}:certificate/af05578f-dd55-4942-9a9d-e1843e18dd5f"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.axiora_lb_tg.arn
  }
}

data "aws_route53_zone" "axiora_aws_route53_zone" {
  name         = "axiora.co."
  private_zone = false
}

resource "aws_route53_record" "axiora_api_route53_record" {
  zone_id = data.aws_route53_zone.axiora_aws_route53_zone.zone_id
  name    = "api.axiora.co"
  type    = "A"

  alias {
    name                   = aws_lb.axiora_lb.dns_name
    zone_id                = aws_lb.axiora_lb.zone_id
    evaluate_target_health = false
  }
}
