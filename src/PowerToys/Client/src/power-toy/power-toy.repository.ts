import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";
import { client } from "../api/client.gen.js";
import { PowerToysService } from "../api/sdk.gen.js";

// Talks to the shared PowerToys.{alias}.Enabled / PowerToys.{alias}.Settings endpoints -
// the bit any power toy needs, regardless of what it actually does.
export class UmbPowerToyRepository extends UmbControllerBase {
  // Global contexts call this as the backoffice boots, which can be before the entry point's
  // onInit has run configureClient. Configure it here too (it's idempotent), so those first
  // calls don't go out unauthenticated.
  #clientReady: Promise<void>;

  constructor(host: UmbControllerHost) {
    super(host);
    this.#clientReady = this.getContext(UMB_AUTH_CONTEXT).then((auth) => auth?.configureClient(client));
  }

  async isEnabled(alias: string): Promise<boolean> {
    await this.#clientReady;
    const { data } = await PowerToysService.getEnabled({ path: { alias } });
    return data ?? true;
  }

  async setEnabled(alias: string, enabled: boolean): Promise<void> {
    await this.#clientReady;
    await PowerToysService.setEnabled({ path: { alias }, body: enabled });
  }

  /** Whether the enabled flag comes from an appsettings.json override and can't be changed here. */
  async isEnabledLocked(alias: string): Promise<boolean> {
    await this.#clientReady;
    const { data } = await PowerToysService.getEnabledLocked({ path: { alias } });
    return data ?? false;
  }

  async getSettings<T>(alias: string): Promise<T | null> {
    await this.#clientReady;
    const { data } = await PowerToysService.getSettings({ path: { alias } });
    return (data as T) ?? null;
  }

  async saveSettings<T>(alias: string, settings: T): Promise<void> {
    await this.#clientReady;
    await PowerToysService.saveSettings({ path: { alias }, body: settings });
  }

  /** Whether the settings come from an appsettings.json override and can't be changed here. */
  async isSettingsLocked(alias: string): Promise<boolean> {
    await this.#clientReady;
    const { data } = await PowerToysService.getSettingsLocked({ path: { alias } });
    return data ?? false;
  }

  async getEnvironmentName(): Promise<string | null> {
    try {
      await this.#clientReady;
      const { data } = await PowerToysService.getEnvironmentName();
      return data ?? null;
    } catch {
      return null;
    }
  }

  async getVersion(): Promise<string | null> {
    try {
      await this.#clientReady;
      const { data } = await PowerToysService.getVersion();
      return data ?? null;
    } catch {
      return null;
    }
  }
}

export default UmbPowerToyRepository;
