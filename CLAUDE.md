# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm run test         # Run Jest tests
npm run synth        # Synthesize CloudFormation templates
npm run diff         # Show pending changes vs deployed
npx cdk deploy --all # Deploy all stacks
npx cdk deploy <stack-name>  # Deploy specific stack
```

Stack names: `github-actions-stack`, `alerts-stack`, `org-stack`, `sso-stack`

## Architecture

This is an AWS CDK v2 TypeScript project managing AWS Organizations, SSO, and infrastructure alerts.

### Stack Dependencies

```
github-actions-stack (independent)
alerts-stack (independent)
org-stack (independent) ──► sso-stack (depends on org-stack.accountId)
```

### Stacks

- **github-actions-stack**: OIDC provider + IAM role for GitHub Actions CI/CD. Restricts to `main` branch of `SamHillierDev/aws-infra`.
- **alerts-stack**: SNS topic, AWS Budgets, Cost Anomaly Detection. Supports email/SMS subscriptions and emergency user monitoring via EventBridge.
- **org-stack**: AWS Organizations OU structure. Can use existing account or create new one.
- **sso-stack**: IAM Identity Center permission sets (Developer/Admin/ReadOnly) and group assignments.

### Configuration

All sensitive IDs are configurable via environment variables in `bin/app.ts`:
- `ALERT_EMAIL`, `EXISTING_ACCOUNT_ID`, `ORG_ROOT_ID`, `SSO_INSTANCE_ARN`, `IDENTITY_STORE_ID`

Default region: `eu-west-2`

### Tagging

All stacks use `applyStandardTags()` from `lib/tags.ts` which applies `Environment` and `Project` tags.

## CI/CD

GitHub Actions workflow (`.github/workflows/deploy.yml`) deploys on push to `main`:
1. Build TypeScript
2. Run `cdk diff`
3. Deploy all stacks via OIDC authentication
