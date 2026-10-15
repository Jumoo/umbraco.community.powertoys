import { UmbConditionBase } from "@umbraco-cms/backoffice/extension-registry";
import type {
  UmbConditionConfigBase,
  UmbConditionControllerArguments,
  UmbExtensionCondition,
} from "@umbraco-cms/backoffice/extension-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { TASKS_CONTEXT } from "../tasks.context.js";

export type ReviewsEnabledConditionConfig = UmbConditionConfigBase<"PowerToys.Condition.ReviewsEnabled">;

// Shows an extension only while content reviews are on: the Tasks power toy is enabled and
// reviews are switched on in its settings
export class ReviewsEnabledCondition extends UmbConditionBase<ReviewsEnabledConditionConfig> implements UmbExtensionCondition {
  constructor(host: UmbControllerHost, args: UmbConditionControllerArguments<ReviewsEnabledConditionConfig>) {
    super(host, args);

    this.consumeContext(TASKS_CONTEXT, (context) => {
      if (!context) {
        this.permitted = false;
        return;
      }
      this.observe(context.reviewsEnabled, (enabled) => (this.permitted = enabled), "_reviewsEnabled");
    });
  }
}

export default ReviewsEnabledCondition;

declare global {
  interface UmbExtensionConditionConfigMap {
    ReviewsEnabledConditionConfig: ReviewsEnabledConditionConfig;
  }
}
