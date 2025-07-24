import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sso from 'aws-cdk-lib/aws-sso';
import * as identitystore from 'aws-cdk-lib/aws-identitystore';
import { applyStandardTags } from './tags';

interface SsoStackProps extends cdk.StackProps {
  ssoInstanceArn: string;
  accountId: string;
}

export class SsoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SsoStackProps) {
    super(scope, id, props);

    // Permission set configs
    const permissionSetConfigs = [
      {
        id: 'DeveloperPermissionSet',
        name: 'Developer',
        description: 'Developer access',
        managedPolicies: ['arn:aws:iam::aws:policy/PowerUserAccess'],
      },
      {
        id: 'AdminPermissionSet',
        name: 'Admin',
        description: 'Admin access',
        managedPolicies: ['arn:aws:iam::aws:policy/AdministratorAccess'],
      },
      {
        id: 'ReadOnlyPermissionSet',
        name: 'ReadOnly',
        description: 'ReadOnly access',
        managedPolicies: ['arn:aws:iam::aws:policy/ReadOnlyAccess'],
      },
    ];

    // Helper to create permission sets
    const createPermissionSet = (cfg: typeof permissionSetConfigs[0]) => {
      return new sso.CfnPermissionSet(this, cfg.id, {
        name: cfg.name,
        description: cfg.description,
        instanceArn: props.ssoInstanceArn,
        sessionDuration: 'PT8H',
        managedPolicies: cfg.managedPolicies,
      });
    };

    // Create permission sets and store in a map
    const permissionSets: Record<string, sso.CfnPermissionSet> = {};
    for (const cfg of permissionSetConfigs) {
      permissionSets[cfg.name] = createPermissionSet(cfg);
    }

    // Helper to create groups
    const createGroup = (id: string, displayName: string, description: string) => {
      return new identitystore.CfnGroup(this, id, {
        displayName,
        description,
        identityStoreId: 'd-9c67589b5e',
      });
    };

    // Groups
    const developerGroup = createGroup('DeveloperGroup', 'Developers', 'Developers group');
    const adminGroup = createGroup('AdminGroup', 'Admins', 'Admins group');
    const readOnlyGroup = createGroup('ReadOnlyGroup', 'ReadOnly', 'ReadOnly group');

    // Helper to create assignments
    const createAssignment = (id: string, permissionSetArn: string, groupId: string) => {
      return new sso.CfnAssignment(this, id, {
        instanceArn: props.ssoInstanceArn,
        permissionSetArn,
        principalId: groupId,
        principalType: 'GROUP',
        targetId: props.accountId,
        targetType: 'AWS_ACCOUNT',
      });
    };

    // Assignments
    createAssignment('DeveloperAssignment', permissionSets['Developer'].attrPermissionSetArn, developerGroup.attrGroupId);
    createAssignment('AdminAssignment', permissionSets['Admin'].attrPermissionSetArn, adminGroup.attrGroupId);
    createAssignment('ReadOnlyAssignment', permissionSets['ReadOnly'].attrPermissionSetArn, readOnlyGroup.attrGroupId);

    // Helper to create outputs
    const createOutput = (id: string, value: string, description: string) => {
      return new cdk.CfnOutput(this, id, {
        value,
        description,
      });
    };

    // Outputs
    createOutput('DeveloperPermissionSetArn', permissionSets['Developer'].attrPermissionSetArn, 'Developer Permission Set ARN');
    createOutput('AdminPermissionSetArn', permissionSets['Admin'].attrPermissionSetArn, 'Admin Permission Set ARN');
    createOutput('ReadOnlyPermissionSetArn', permissionSets['ReadOnly'].attrPermissionSetArn, 'ReadOnly Permission Set ARN');
    applyStandardTags(this);
  }
} 