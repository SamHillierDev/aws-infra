import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import { applyStandardTags } from './tags';

export interface BillingStackProps extends cdk.StackProps {
  alertEmails: string[];
  monthlyBudgetAmount: number;
  budgetThresholds?: number[];
}

export class BillingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BillingStackProps) {
    super(scope, id, props);

    // Create budget with both actual and forecast notifications
    const budget = new budgets.CfnBudget(this, 'MonthlyBudget', {
      budget: {
        budgetName: `Monthly Budget`,
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: {
          amount: props.monthlyBudgetAmount,
          unit: 'USD',
        },
      },
      notificationsWithSubscribers: [
        // Actual spending notifications
        ...(props.budgetThresholds || [50, 100]).map((threshold, index) => ({
          notification: {
            comparisonOperator: 'GREATER_THAN',
            notificationType: 'ACTUAL',
            threshold: threshold,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [
            {
              address: props.alertEmails[0],
              subscriptionType: 'EMAIL',
            },
          ],
        })),
        // Forecast notification
        {
          notification: {
            comparisonOperator: 'GREATER_THAN',
            notificationType: 'FORECASTED',
            threshold: 100,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [
            {
              address: props.alertEmails[0],
              subscriptionType: 'EMAIL',
            },
          ],
        },
      ],
    });

    // Outputs
    new cdk.CfnOutput(this, 'BudgetName', {
      value: `Monthly Budget`,
      description: 'Name of the monthly budget',
    });

    applyStandardTags(this);
  }
}
