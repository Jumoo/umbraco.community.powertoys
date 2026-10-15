import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import { UMB_POWER_TOY_CONTEXT } from "../power-toy.context.js";

/**
 * Follows a power toy's enabled flag. The shared enabled state starts out true until its first
 * fetch lands, so this waits for a real answer before reporting, rather than letting something
 * like a hub connection start for a power toy that's off.
 */
export class PowerToyEnabledController extends UmbControllerBase {
  constructor(host: UmbControllerHost, alias: string, callback: (enabled: boolean) => void) {
    super(host, `PowerToyEnabled_${alias}`);

    this.consumeContext(UMB_POWER_TOY_CONTEXT, (context) => {
      if (!context) return;
      let known = false;
      context.isEnabled(alias).then((enabled) => {
        known = true;
        callback(enabled);
      });
      this.observe(
        context.observeEnabled(alias),
        (enabled) => {
          if (known) callback(enabled);
        },
        "_enabled"
      );
    });
  }
}
