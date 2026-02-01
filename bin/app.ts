import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { GitHubActionsStack } from "../lib/github-actions-stack";
import { AlertsStack } from "../lib/alerts-stack";
import { OrganizationStack } from "../lib/org-stack";
import { SsoStack } from "../lib/sso-stack";

// Configuration - consider moving to environment variables for sensitive values
const config = {
  alertEmail: process.env.ALERT_EMAIL || "sam@hillier.uk",
  existingAccountId: process.env.EXISTING_ACCOUNT_ID || "071300173697",
  organizationRootId: process.env.ORG_ROOT_ID || "r-59ls",
  ssoInstanceArn: process.env.SSO_INSTANCE_ARN || "arn:aws:sso:::instance/ssoins-7535910d8383def2",
  identityStoreId: process.env.IDENTITY_STORE_ID || "d-9c67589b5e",
};

const getEnvironmentConfig = () => {
  const account = process.env.CDK_DEFAULT_ACCOUNT;
  const region = process.env.CDK_DEFAULT_REGION || "eu-west-2";

  if (!account) {
    throw new Error("CDK_DEFAULT_ACCOUNT environment variable is required");
  }

  return { account, region };
};

const app = new cdk.App();
const env = getEnvironmentConfig();

new GitHubActionsStack(app, "github-actions-stack", {
  env,
  description: "OIDC provider and IAM role for GitHub Actions CI/CD",
});

new AlertsStack(app, "alerts-stack", {
  env,
  description: "Infrastructure alerts, budgets, and cost anomaly detection",
  alertEmails: [config.alertEmail],
  budgets: [
    {
      name: "Monthly Budget",
      amount: 10,
      alertThresholds: [50, 80, 100],
    },
  ],
  anomalyDetection: {
    thresholdAmount: 10,
  },
});

const orgStack = new OrganizationStack(app, "org-stack", {
  env,
  description: "Organisation structure for CS2.TEAM",
  organizationRootId: config.organizationRootId,
  existingAccountId: config.existingAccountId,
});

new SsoStack(app, "sso-stack", {
  env,
  description: "SSO setup for CS2.TEAM organization",
  ssoInstanceArn: config.ssoInstanceArn,
  identityStoreId: config.identityStoreId,
  accountId: orgStack.accountId,
});
