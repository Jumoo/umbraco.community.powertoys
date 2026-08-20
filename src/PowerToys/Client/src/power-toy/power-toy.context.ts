import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { UmbBooleanState } from "@umbraco-cms/backoffice/observable-api";
import type { Observable } from "@umbraco-cms/backoffice/external/rxjs";
import { UmbPowerToyRepository } from "./power-toy.repository.js";

// The one thing every power toy needs, so individual power toys don't each have
// to build their own "am I enabled" / "get and save my settings" plumbing:
// provided once above the dashboard, consumed by the card and by power toys themselves.
export class UmbPowerToyContext extends UmbContextBase {
  #repository: UmbPowerToyRepository;

  // One boolean state per alias, shared between every consumer (card, conditions, header
  // apps, ...) that wants to react live to a power toy's enabled state, rather than each
  // polling the API themselves.
  #enabledStates = new Map<string, UmbBooleanState<boolean>>();

  constructor(host: UmbControllerHost) {
    super(host, UMB_POWER_TOY_CONTEXT);
    this.#repository = new UmbPowerToyRepository(host);
  }

  isEnabled(alias: string): Promise<boolean> {
    return this.#repository.isEnabled(alias);
  }

  async setEnabled(alias: string, enabled: boolean): Promise<void> {
    await this.#repository.setEnabled(alias, enabled);
    this.#enabledState(alias).setValue(enabled);
  }

  /** Observable enabled state for a power toy - fetched once, then kept live by setEnabled. */
  observeEnabled(alias: string): Observable<boolean> {
    return this.#enabledState(alias).asObservable();
  }

  #enabledState(alias: string): UmbBooleanState<boolean> {
    let state = this.#enabledStates.get(alias);
    if (!state) {
      state = new UmbBooleanState(true);
      this.#enabledStates.set(alias, state);
      this.#repository.isEnabled(alias).then((enabled) => state?.setValue(enabled));
    }
    return state;
  }

  getSettings<T>(alias: string): Promise<T | null> {
    return this.#repository.getSettings<T>(alias);
  }

  saveSettings<T>(alias: string, settings: T): Promise<void> {
    return this.#repository.saveSettings(alias, settings);
  }
}

export const UMB_POWER_TOY_CONTEXT = new UmbContextToken<UmbPowerToyContext>("UmbPowerToyContext");

export default UmbPowerToyContext;
