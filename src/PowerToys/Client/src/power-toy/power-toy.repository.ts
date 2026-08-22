import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { PowerToysService } from "../api/sdk.gen.js";

// Talks to the shared PowerToys.{alias}.Enabled / PowerToys.{alias}.Settings endpoints -
// the bit any power toy needs, regardless of what it actually does.
export class UmbPowerToyRepository extends UmbControllerBase {
  constructor(host: UmbControllerHost) {
    super(host);
  }

  async isEnabled(alias: string): Promise<boolean> {
    const { data } = await PowerToysService.getEnabled({ path: { alias } });
    return data ?? true;
  }

  async setEnabled(alias: string, enabled: boolean): Promise<void> {
    await PowerToysService.setEnabled({ path: { alias }, body: enabled });
  }

  /** Whether the enabled flag comes from an appsettings.json override and can't be changed here. */
  async isEnabledLocked(alias: string): Promise<boolean> {
    const { data } = await PowerToysService.getEnabledLocked({ path: { alias } });
    return data ?? false;
  }

  async getSettings<T>(alias: string): Promise<T | null> {
    const { data } = await PowerToysService.getSettings({ path: { alias } });
    return (data as T) ?? null;
  }

  async saveSettings<T>(alias: string, settings: T): Promise<void> {
    await PowerToysService.saveSettings({ path: { alias }, body: settings });
  }

  /** Whether the settings come from an appsettings.json override and can't be changed here. */
  async isSettingsLocked(alias: string): Promise<boolean> {
    const { data } = await PowerToysService.getSettingsLocked({ path: { alias } });
    return data ?? false;
  }

  async getEnvironmentName(): Promise<string | null> {
    try {
      const { data } = await PowerToysService.getEnvironmentName();
      return data ?? null;
    } catch {
      return null;
    }
  }
}

export default UmbPowerToyRepository;
