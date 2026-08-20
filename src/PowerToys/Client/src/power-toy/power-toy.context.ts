import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { UmbPowerToyRepository } from "./power-toy.repository.js";

// The one thing every power toy needs, so individual power toys don't each have
// to build their own "am I enabled" / "get and save my settings" plumbing:
// provided once above the dashboard, consumed by the card and by power toys themselves.
export class UmbPowerToyContext extends UmbContextBase {
  #repository: UmbPowerToyRepository;

  constructor(host: UmbControllerHost) {
    super(host, UMB_POWER_TOY_CONTEXT);
    this.#repository = new UmbPowerToyRepository(host);
  }

  isEnabled(alias: string): Promise<boolean> {
    return this.#repository.isEnabled(alias);
  }

  setEnabled(alias: string, enabled: boolean): Promise<void> {
    return this.#repository.setEnabled(alias, enabled);
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
