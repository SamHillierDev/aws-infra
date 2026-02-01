import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { GitHubActionsStack } from "../lib/github-actions-stack";
import { AlertsStack } from "../lib/alerts-stack";
import { OrganizationStack } from "../lib/org-stack";
import { SsoStack } from "../lib/sso-stack";

interface EnvironmentConfig {
  account: string;
  region: string;
}

interface StackConfig {
  description: string;
  existingAccountId?: string;
  ssoInstanceArn?: string;
  accountId?: string;
  alertEmails?: string[];
  alertPhoneNumbers?: string[];
  budgets?: Array<{
    name: string;
    amount: number;
    unit?: 'USD' | 'GBP' | 'EUR';
    timeUnit?: 'DAILY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
    alertThresholds?: number[];
  }>;
  anomalyDetection?: {
    enabled?: boolean;
    thresholdAmount?: number;
    frequency?: 'DAILY' | 'IMMEDIATE' | 'WEEKLY';
  };
  emergencyUserMonitoring?: {
    enabled?: boolean;
    userName: string;
  };
  env?: EnvironmentConfig;
}

const getEnvironmentConfig = (): EnvironmentConfig => {
  const account = process.env.CDK_DEFAULT_ACCOUNT;
  const region = process.env.CDK_DEFAULT_REGION || "eu-west-2";
  
  if (!account) {
    throw new Error("CDK_DEFAULT_ACCOUNT environment variable is required");
  }
  
  return { account, region };
};

const createStack = <T extends cdk.Stack>(
  app: cdk.App,
  stackClass: new (scope: cdk.App, id: string, props?: any) => T,
  stackId: string,
  props: StackConfig
): T => {
  const env = props.env || getEnvironmentConfig();
  return new stackClass(app, stackId, {
    env,
    ...props,
  });
};

const app = new cdk.App();

try {
  createStack(app, GitHubActionsStack, "github-actions-stack", {
    description: "Sets up OIDC provider and IAM role for GitHub Actions CI/CD integration",
  });

  createStack(app, AlertsStack, "alerts-stack", {
    description: "Infrastructure alerts, budgets, and cost anomaly detection",
    alertEmails: ["sam@hillier.uk"],
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

  const orgStack = createStack(app, OrganizationStack, "org-stack", {
    description: "Organisation structure for CS2.TEAM",
    existingAccountId: "071300173697",
  });

  createStack(app, SsoStack, "sso-stack", {
    description: "SSO setup for CS2.TEAM organization",
    ssoInstanceArn: "arn:aws:sso:::instance/ssoins-7535910d8383def2",
    accountId: orgStack.accountId,
  });

} catch (error) {
  console.error("Failed to create CDK app:", error);
  process.exit(1);
}
