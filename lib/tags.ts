import * as cdk from "aws-cdk-lib";

export interface StandardTags {
  Environment: "dev" | "staging" | "prod";
  Project: string;
}

export const DEFAULT_TAGS: StandardTags = {
  Environment: "prod",
  Project: "example-project",
};

export function applyStandardTags(
  scope: any,
  tags: Partial<StandardTags> = {}
) {
  const finalTags = { ...DEFAULT_TAGS, ...tags };

  Object.entries(finalTags).forEach(([key, value]) => {
    if (value) {
      cdk.Tags.of(scope).add(key, value);
    }
  });
} 