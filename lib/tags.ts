import * as cdk from "aws-cdk-lib";
import { IConstruct } from "constructs";

export interface StandardTags {
  Environment: "dev" | "staging" | "prod";
  Project: string;
}

export const DEFAULT_TAGS: StandardTags = {
  Environment: "prod",
  Project: "aws-infra",
};

export function applyStandardTags(
  scope: IConstruct,
  tags: Partial<StandardTags> = {}
): void {
  const finalTags = { ...DEFAULT_TAGS, ...tags };

  Object.entries(finalTags).forEach(([key, value]) => {
    if (value) {
      cdk.Tags.of(scope).add(key, value);
    }
  });
} 