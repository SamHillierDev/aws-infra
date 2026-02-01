import * as cdk from 'aws-cdk-lib';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as ce from 'aws-cdk-lib/aws-ce';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventsTargets from 'aws-cdk-lib/aws-events-targets';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

import { applyStandardTags } from './tags';

export interface BudgetConfig {
  name: string;
  amount: number;
  unit?: 'USD' | 'GBP' | 'EUR';
  timeUnit?: 'DAILY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  alertThresholds?: number[];
}

export interface AnomalyDetectionConfig {
  enabled?: boolean;
  monitorType?: 'DIMENSIONAL' | 'CUSTOM';
  monitorDimension?: 'SERVICE' | 'LINKED_ACCOUNT' | 'LINKED_ACCOUNT_SERVICE';
  thresholdAmount?: number;
  frequency?: 'DAILY' | 'IMMEDIATE' | 'WEEKLY';
}

export interface EmergencyUserMonitoringConfig {
  enabled?: boolean;
  userName: string;
}

export interface AlertsStackProps extends cdk.StackProps {
  alertEmails?: string[];
  alertPhoneNumbers?: string[];
  budgets?: BudgetConfig[];
  anomalyDetection?: AnomalyDetectionConfig;
  emergencyUserMonitoring?: EmergencyUserMonitoringConfig;
}

export class AlertsStack extends cdk.Stack {
  public readonly alertTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: AlertsStackProps = {}) {
    super(scope, id, props);

    this.alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: 'infrastructure-alerts',
      displayName: 'Infrastructure Alerts',
    });

    this.subscribeEmails(props.alertEmails);
    this.subscribePhoneNumbers(props.alertPhoneNumbers);

    if (props.emergencyUserMonitoring?.enabled !== false && props.emergencyUserMonitoring?.userName) {
      this.createEmergencyMonitoringRule(props.emergencyUserMonitoring.userName);
    }

    this.createCostAnomalyTopicPolicy();

    if (props.budgets && props.budgets.length > 0) {
      props.budgets.forEach((budgetConfig) => {
        this.createBudget(budgetConfig);
      });
    }

    if (props.anomalyDetection?.enabled !== false) {
      this.createAnomalyDetection(props.anomalyDetection);
    }

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: this.alertTopic.topicArn,
      description: 'ARN of the SNS topic for alerts',
      exportName: 'InfrastructureAlertTopicArn',
    });

    applyStandardTags(this);
  }

  private subscribeEmails(emails?: string[]): void {
    if (!emails || emails.length === 0) return;

    emails.forEach((email) => {
      this.alertTopic.addSubscription(
        new snsSubscriptions.EmailSubscription(email)
      );
    });
  }

  private subscribePhoneNumbers(phoneNumbers?: string[]): void {
    if (!phoneNumbers || phoneNumbers.length === 0) return;

    phoneNumbers.forEach((phoneNumber) => {
      this.alertTopic.addSubscription(
        new snsSubscriptions.SmsSubscription(phoneNumber)
      );
    });
  }

  private createEmergencyMonitoringRule(userName: string): events.Rule {
    const rule = new events.Rule(this, 'EmergencyMonitoringRule', {
      ruleName: 'emergency-user-monitoring',
      description: `Monitors all API and console activity for IAM user ${userName}`,
      eventPattern: {
        source: ['aws.cloudtrail'],
        detailType: [
          'AWS API Call via CloudTrail',
          'AWS Console Sign In via CloudTrail',
        ],
        detail: {
          userIdentity: {
            type: ['IAMUser'],
            userName: [userName],
          },
        },
      },
    });

    rule.addTarget(
      new eventsTargets.SnsTopic(this.alertTopic, {
        message: events.RuleTargetInput.fromObject({
          subject: `ALERT: Emergency Admin Activity - ${events.EventField.fromPath('$.detail.eventName')}`,
          message: [
            'Emergency admin user activity detected:',
            '',
            `Event: ${events.EventField.fromPath('$.detail.eventName')}`,
            `Time: ${events.EventField.fromPath('$.time')}`,
            `User: ${events.EventField.fromPath('$.detail.userIdentity.userName')}`,
            `Source IP: ${events.EventField.fromPath('$.detail.sourceIPAddress')}`,
            `User Agent: ${events.EventField.fromPath('$.detail.userAgent')}`,
            `Region: ${events.EventField.fromPath('$.detail.awsRegion')}`,
            `Request ID: ${events.EventField.fromPath('$.detail.requestID')}`,
          ].join('\n'),
        }),
      })
    );

    new cdk.CfnOutput(this, 'MonitoredUserName', {
      value: userName,
      description: 'IAM user name being monitored for emergency access',
    });

    return rule;
  }

  private createCostAnomalyTopicPolicy(): void {
    new sns.CfnTopicPolicy(this, 'CostAnomalyTopicPolicy', {
      topics: [this.alertTopic.topicArn],
      policyDocument: {
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: 'costalerts.amazonaws.com',
            },
            Action: 'SNS:Publish',
            Resource: this.alertTopic.topicArn,
            Condition: {
              StringEquals: {
                'aws:SourceAccount': this.account,
              },
            },
          },
        ],
      },
    });
  }

  private createBudget(config: BudgetConfig): budgets.CfnBudget {
    const thresholds = config.alertThresholds || [50, 80, 100];
    const unit = config.unit || 'USD';
    const timeUnit = config.timeUnit || 'MONTHLY';

    const logicalId = `Budget${config.name.replace(/[^a-zA-Z0-9]/g, '')}`;

    return new budgets.CfnBudget(this, logicalId, {
      budget: {
        budgetName: config.name,
        budgetLimit: {
          amount: config.amount,
          unit,
        },
        timeUnit,
        budgetType: 'COST',
      },
      notificationsWithSubscribers: thresholds.flatMap((threshold) => [
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [
            {
              subscriptionType: 'SNS',
              address: this.alertTopic.topicArn,
            },
          ],
        },
        {
          notification: {
            notificationType: 'FORECASTED',
            comparisonOperator: 'GREATER_THAN',
            threshold,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [
            {
              subscriptionType: 'SNS',
              address: this.alertTopic.topicArn,
            },
          ],
        },
      ]),
    });
  }

  private createAnomalyDetection(config?: AnomalyDetectionConfig): void {
    const monitorType = config?.monitorType ?? 'DIMENSIONAL';
    const monitorDimension = config?.monitorDimension ?? 'SERVICE';
    const thresholdAmount = config?.thresholdAmount ?? 50;
    const frequency = config?.frequency ?? 'IMMEDIATE';

    const monitor = new ce.CfnAnomalyMonitor(this, 'CostAnomalyMonitor', {
      monitorName: 'cost-anomaly-monitor',
      monitorType,
      monitorDimension: monitorType === 'DIMENSIONAL' ? monitorDimension : undefined,
    });

    new ce.CfnAnomalySubscription(this, 'CostAnomalySubscription', {
      subscriptionName: 'cost-anomaly-alerts',
      monitorArnList: [monitor.attrMonitorArn],
      subscribers: [
        {
          type: 'SNS',
          address: this.alertTopic.topicArn,
        },
      ],
      frequency,
      threshold: thresholdAmount,
    });

    new cdk.CfnOutput(this, 'AnomalyMonitorArn', {
      value: monitor.attrMonitorArn,
      description: 'ARN of the Cost Anomaly Monitor',
    });
  }
}
