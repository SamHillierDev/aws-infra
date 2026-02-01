import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as organizations from 'aws-cdk-lib/aws-organizations';
import { applyStandardTags } from './tags';

export interface OrganizationStackProps extends cdk.StackProps {
  organizationRootId: string;
  existingAccountId?: string;
  accountEmail?: string;
}

export class OrganizationStack extends cdk.Stack {
  public readonly accountIdOutput: cdk.CfnOutput;
  public readonly accountId: string;
  constructor(scope: Construct, id: string, props: OrganizationStackProps) {
    super(scope, id, props);

    // Create Organizational Unit
    const projectOU = new organizations.CfnOrganizationalUnit(this, 'ProjectCS2TEAM', {
      name: 'Project-CS2TEAM',
      parentId: props.organizationRootId,
    });

    let accountId: string;
    if (props.existingAccountId) {
      accountId = props.existingAccountId;
    } else {
      if (!props.accountEmail) {
        throw new Error('accountEmail is required when creating a new account');
      }
      const account = new organizations.CfnAccount(this, 'Account', {
        accountName: 'ProductionAccount',
        email: props.accountEmail,
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