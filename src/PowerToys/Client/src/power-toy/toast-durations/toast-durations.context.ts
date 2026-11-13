import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import {
  UMB_NOTIFICATION_CONTEXT,
  UmbNotificationHandler,
  type UmbNotificationContext,
} from "@umbraco-cms/backoffice/notification";
import { PowerToyEnabledController } from "../shared/power-toy-enabled.js";
import { UMB_POWER_TOY_CONTEXT } from "../power-toy.context.js";
import {
  TOAST_DURATIONS_POWER_TOY_ALIAS,
  withDefaults,
  type ToastDurationsSettings,
  type ToastKind,
} from "./toast-durations-settings.js";

// How long Umbraco shows a toast when whoever opened it didn't say (6 seconds in v17).
// Read from Umbraco rather than hardcoded, so a change to its default is still recognised.
const UMBRACO_DEFAULT = new UmbNotificationHandler({}).duration;

/**
 * Sets how long each new backoffice toast stays on screen, by its colour.
 *
 * Only toasts on Umbraco's default duration change. Toasts opened to stay until dismissed,
 * and toasts a package gave its own duration, are left as they are.
 */
export class ToastDurationsContext extends UmbContextBase {
  #enabled = false;
  #settings = withDefaults(null);
  #notifications?: UmbNotificationContext;

  // Toasts already seen, so each is only adjusted once, as it arrives
  #seen = new WeakSet<UmbNotificationHandler>();

  constructor(host: UmbControllerHost) {
    super(host, TOAST_DURATIONS_CONTEXT);

    this.consumeContext(UMB_POWER_TOY_CONTEXT, (context) => {
      if (!context) return;
      this.observe(
        context.observeSettings<ToastDurationsSettings>(TOAST_DURATIONS_POWER_TOY_ALIAS),
        (settings) => (this.#settings = withDefaults(settings)),
        "_settings"
      );
    });

    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notifications = context;
      this.#observe();
    });

    new PowerToyEnabledController(this, TOAST_DURATIONS_POWER_TOY_ALIAS, (enabled) => {
      this.#enabled = enabled;
      this.#observe();
    });
  }

  #observe() {
    if (!this.#enabled || !this.#notifications) {
      this.removeUmbControllerByAlias("_notifications");
      return;
    }

    let first = true;
    this.observe(
      this.#notifications.notifications,
      (handlers) => {
        for (const handler of handlers) {
          if (this.#seen.has(handler)) continue;
          this.#seen.add(handler);
          // Toasts already showing when the power toy is switched on keep their timing
          if (!first) this.#adjust(handler);
        }
        first = false;
      },
      "_notifications"
    );
  }

  #adjust(handler: UmbNotificationHandler) {
    if (handler.duration !== UMBRACO_DEFAULT) return;

    const duration = this.#settings[(handler.color || "default") as ToastKind];
    if (duration === undefined) return;

    const toast = handler.element;

    if (duration === "stay") {
      toast.autoClose = null;
    } else if (duration === "hide") {
      // Still added to the page, so screen readers announce it, but never seen. It closes as
      // soon as it has opened, which takes it out of the list again.
      toast.style.visibility = "hidden";
      toast.style.position = "absolute";
      toast.autoClose = 1;
    } else {
      toast.autoClose = duration * 1000;
    }
  }
}

export const TOAST_DURATIONS_CONTEXT = new UmbContextToken<ToastDurationsContext>("PowerToys.Context.ToastDurations");

export { ToastDurationsContext as api };
export default ToastDurationsContext;
