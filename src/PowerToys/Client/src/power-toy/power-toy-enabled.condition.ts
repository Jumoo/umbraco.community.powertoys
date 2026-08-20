import { UmbConditionBase } from "@umbraco-cms/backoffice/extension-registry";
import type {
  UmbConditionConfigBase,
  UmbConditionControllerArguments,
  UmbExtensionCondition,
} from "@umbraco-cms/backoffice/extension-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UMB_POWER_TOY_CONTEXT } from "./power-toy.context.js";

export interface PowerToyEnabledConditionConfig extends UmbConditionConfigBase<"PowerToys.Condition.PowerToyEnabled"> {
  /** The alias of the power toy that must be enabled for the extension to be permitted. */
  match: string;
}

// Lets any manifest across Umbraco - not just power toys themselves - gate on a power
// toy's enabled state, e.g. a header app that should only appear while its power toy is on.
export class PowerToyEnabledCondition
  extends UmbConditionBase<PowerToyEnabledConditionConfig>
  implements UmbExtensionCondition
{
  constructor(host: UmbControllerHost, args: UmbConditionControllerArguments<PowerToyEnabledConditionConfig>) {
    super(host, args);

    this.consumeContext(UMB_POWER_TOY_CONTEXT, (context) => {
      if (!context) {
        this.permitted = false;
        return;
      }
      this.observe(
        context.observeEnabled(this.config.match),
        (enabled) => {
          this.permitted = enabled;
        },
        "observePowerToyEnabled",
      );
    });
  }
}

export default PowerToyEnabledCondition;

declare global {
  interface UmbExtensionConditionConfigMap {
    PowerToyEnabledConditionConfig: PowerToyEnabledConditionConfig;
  }
}
