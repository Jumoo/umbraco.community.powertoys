import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { UmbStringState } from "@umbraco-cms/backoffice/observable-api";

/** The panels that can open in the docked side panel. */
export type PowerToysPanelName = "chat" | "tasks";

/**
 * Which power toy's panel is open in the side panel docked beside the backoffice, if any.
 * One at a time: opening another replaces it. The header buttons toggle it; the panel itself
 * renders it.
 */
export class PowerToysPanelContext extends UmbContextBase {
  #active = new UmbStringState(undefined);
  public readonly active = this.#active.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, UMB_POWER_TOYS_PANEL_CONTEXT);
  }

  isOpen(name: PowerToysPanelName) {
    return this.#active.asObservablePart((active) => active === name);
  }

  open(name: PowerToysPanelName) {
    this.#active.setValue(name);
  }

  /** Closes the panel, or only the named one if given. */
  close(name?: PowerToysPanelName) {
    if (name && this.#active.getValue() !== name) return;
    this.#active.setValue(undefined);
  }

  toggle(name: PowerToysPanelName) {
    if (this.#active.getValue() === name) {
      this.close();
    } else {
      this.open(name);
    }
  }
}

export const UMB_POWER_TOYS_PANEL_CONTEXT = new UmbContextToken<PowerToysPanelContext>("PowerToys.Context.Panel");

export { PowerToysPanelContext as api };
export default PowerToysPanelContext;
