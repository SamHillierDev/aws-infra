import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as organizations from 'aws-cdk-lib/aws-organizations';
import { applyStandardTags } from './tags';

export interface OrganizationStackProps extends cdk.StackProps {
  existingAccountId?: string;
}

export class OrganizationStack extends cdk.Stack {
  public readonly accountIdOutput: cdk.CfnOutput;
  public readonly accountId: string;
  constructor(scope: Construct, id: string, props: OrganizationStackProps) {
    super(scope, id, props);

    // Create Organizational Unit
    const projectOU = new organizations.CfnOrganizationalUnit(this, 'ProjectCS2TEAM', {
      name: 'Project-CS2TEAM',
      parentId: 'r-59ls',
    });

    let accountId: string;
    if (props.existingAccountId) {
      accountId = props.existingAccountId;
    } else {
      const account = new organizations.CfnAccount(this, 'Account', {
        accountName: 'ProductionAccount',
        email: 'admin@cs2.team',
        parentIds: [projectOU.ref],
        roleName: 'OrganizationAccountAccessRole',
      });
      account.addDependency(projectOU);
      accountId = account.ref;
    }
    this.accountId = accountId;

    // Output the account ID for reference
    this.accountIdOutput = new cdk.CfnOutput(this, 'OrganizationAccountId', {
      value: accountId,
      description: 'Production Account ID',
    });

    applyStandardTags(this);
  }
} 