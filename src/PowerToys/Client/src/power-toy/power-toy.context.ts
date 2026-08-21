import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { UmbBasicState, UmbBooleanState } from "@umbraco-cms/backoffice/observable-api";
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

  // Same idea, but for settings - lets a power toy's own element push a live update (via
  // saveSettings) that another already-running element (e.g. a header app) can react to
  // immediately, without a reload.
  #settingsStates = new Map<string, UmbBasicState<unknown>>();

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

  async saveSettings<T>(alias: string, settings: T): Promise<void> {
    await this.#repository.saveSettings(alias, settings);
    this.#settingsState<T>(alias).setValue(settings);
  }

  /** Observable settings for a power toy - fetched once, then kept live by saveSettings. */
  observeSettings<T>(alias: string): Observable<T | null> {
    return this.#settingsState<T>(alias).asObservable();
  }

  #settingsState<T>(alias: string): UmbBasicState<T | null> {
    let state = this.#settingsStates.get(alias);
    if (!state) {
      state = new UmbBasicState<unknown>(null);
      this.#settingsStates.set(alias, state);
      this.#repository.getSettings<T>(alias).then((settings) => state?.setValue(settings));
    }
    return state as UmbBasicState<T | null>;
  }

  getEnvironmentName(): Promise<string | null> {
    return this.#repository.getEnvironmentName();
  }
}

export const UMB_POWER_TOY_CONTEXT = new UmbContextToken<UmbPowerToyContext>("UmbPowerToyContext");

export default UmbPowerToyContext;
