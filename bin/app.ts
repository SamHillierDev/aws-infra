import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { OrganizationStack } from "../lib/org-stack";
import { SsoStack } from "../lib/sso-stack";
import { GitHubActionsStack } from "../lib/github-actions-stack";

const app = new cdk.App();

new GitHubActionsStack(app, "github-actions-stack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "eu-west-2",
  },
  description: "Sets up OIDC provider and IAM role for GitHub Actions CI/CD integration",
});

const orgStack = new OrganizationStack(app, "org-stack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "eu-west-2",
  },
  description: "Organisation structure for CS2.TEAM",
  existingAccountId: "071300173697",
});

new SsoStack(app, "sso-stack", {
  ssoInstanceArn: "arn:aws:sso:::instance/ssoins-7535910d8383def2",
  accountId: orgStack.accountId,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "eu-west-2",
  },
  description: "SSO setup for CS2.TEAM organization",
});
