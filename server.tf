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

module "axiora_vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "axiora-vpc"
  cidr = "10.0.0.0/22"

  azs             = ["us-east-2a"]
  private_subnets = ["10.0.1.0/24"]
  public_subnets  = ["10.0.3.0/24"]

  default_security_group_ingress = [
    {
      "cidr_blocks" : "0.0.0.0/0",
      "ipv6_cidr_blocks" : "::/0",
      "from_port" : 22,
      "protocol" : "tcp",
      "to_port" : 22
    },
    {
      "cidr_blocks" : "0.0.0.0/0",
      "ipv6_cidr_blocks" : "::/0",
      "from_port" : 80,
      "protocol" : "tcp",
      "to_port" : 80
    },
    {
      "cidr_blocks" : "0.0.0.0/0",
      "ipv6_cidr_blocks" : "::/0",
      "from_port" : 443,
      "protocol" : "tcp",
      "to_port" : 443
    },
  ]
  default_security_group_egress = [
    {
      "cidr_blocks" : "0.0.0.0/0",
      "ipv6_cidr_blocks" : "::/0",
      "protocol" : "-1",
    },
  ]
}

module "iam_policy" {
  source = "terraform-aws-modules/iam/aws//modules/iam-policy"

  name        = "axiora-iam-policy"
  description = "Axiora IAM policy"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "dynamodb:Query",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem"
      ],
      "Effect": "Allow",
      "Resource": [
        "arn:aws:dynamodb:us-east-2:${var.aws_account_id}:table/axiora-api-prod",
        "arn:aws:dynamodb:us-east-2:${var.aws_account_id}:table/axiora-api-prod/index/SK-PK-index"
      ]
    },
    {
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Effect": "Allow",
      "Resource": "arn:aws:ses:us-east-2:${var.aws_account_id}:identity/hello@codingsquad.co"
    }
  ]
}
EOF
}

module "axiora_ec2_role" {
  source = "terraform-aws-modules/iam/aws//modules/iam-assumable-role"

  role_name         = "axiora-ec2-role"
  role_requires_mfa = false

  create_role             = true
  create_instance_profile = true

  trusted_role_services = ["ec2.amazonaws.com"]

  custom_role_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
    module.iam_policy.arn
  ]
  number_of_custom_role_policy_arns = 2
}

module "ec2_instance" {
  source = "terraform-aws-modules/ec2-instance/aws"

  name                        = "axiora-ec2"
  associate_public_ip_address = true

  instance_type          = "t2.nano"
  key_name               = "exploring-rsa-kp"
  vpc_security_group_ids = [module.axiora_vpc.default_security_group_id]
  subnet_id              = module.axiora_vpc.public_subnets[0]
  iam_instance_profile   = module.axiora_ec2_role.iam_instance_profile_name
}

# resource "aws_lb" "axiora_lb" {
#   name               = "axiora-lb"
#   load_balancer_type = "application"
#   security_groups    = [aws_security_group.axiora_sg.id]
#   subnets            = [for subnet in data.aws_subnet.subnets : subnet.id]
# }

# resource "aws_lb_target_group" "axiora_lb_tg" {
#   name     = "axiora-lb-tg"
#   port     = 80
#   protocol = "HTTP"
#   vpc_id   = var.aws_default_vpc_id
# }

# resource "aws_lb_target_group_attachment" "axiora_lb_tg_attachments" {
#   target_group_arn = aws_lb_target_group.axiora_lb_tg.arn
#   target_id        = aws_instance.axiora_ec2.id
#   port             = 80
# }

# resource "aws_lb_listener" "axiora_lb_listener_http" {
#   load_balancer_arn = aws_lb.axiora_lb.arn
#   port              = "80"
#   protocol          = "HTTP"

#   default_action {
#     type             = "forward"
#     target_group_arn = aws_lb_target_group.axiora_lb_tg.arn
#   }
# }

# resource "aws_lb_listener" "axiora_lb_listener_https" {
#   load_balancer_arn = aws_lb.axiora_lb.arn
#   port              = "443"
#   protocol          = "HTTPS"
#   ssl_policy        = "ELBSecurityPolicy-2016-08"
#   certificate_arn   = "arn:aws:acm:us-east-2:${var.aws_account_id}:certificate/af05578f-dd55-4942-9a9d-e1843e18dd5f"

#   default_action {
#     type             = "forward"
#     target_group_arn = aws_lb_target_group.axiora_lb_tg.arn
#   }
# }

# data "aws_route53_zone" "axiora_aws_route53_zone" {
#   name         = "axiora.co."
#   private_zone = false
# }

# resource "aws_route53_record" "axiora_api_route53_record" {
#   zone_id = data.aws_route53_zone.axiora_aws_route53_zone.zone_id
#   name    = "api.axiora.co"
#   type    = "A"

#   alias {
#     name                   = aws_lb.axiora_lb.dns_name
#     zone_id                = aws_lb.axiora_lb.zone_id
#     evaluate_target_health = false
#   }
# }
