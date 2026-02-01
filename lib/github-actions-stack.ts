import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import { applyStandardTags } from "./tags";

export class GitHubActionsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create OIDC Provider for GitHub Actions
    const oidcProvider = new iam.OpenIdConnectProvider(this, "GitHubOidcProvider", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
    });

    // Create the GitHub Actions Role with a fixed role name
    const role = new iam.Role(this, "GitHubActionsRole", {
      roleName: "GitHubActionsRole",
      assumedBy: new iam.WebIdentityPrincipal(
        oidcProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
            "token.actions.githubusercontent.com:sub": "repo:SamHillierDev/aws-infra:ref:refs/heads/main",
          },
        }
      ),
      description: "Role for GitHub Actions to deploy CDK via OIDC",
      maxSessionDuration: cdk.Duration.hours(1),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("PowerUserAccess"),
      ],
    });

    new cdk.CfnOutput(this, "RoleArn", {
      value: role.roleArn,
      description: "GitHub Actions Role ARN",
    });

    applyStandardTags(this);
  }
}
