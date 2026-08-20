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

  async getSettings<T>(alias: string): Promise<T | null> {
    const { data } = await PowerToysService.getSettings({ path: { alias } });
    return (data as T) ?? null;
  }

  async saveSettings<T>(alias: string, settings: T): Promise<void> {
    await PowerToysService.saveSettings({ path: { alias }, body: settings });
  }
}

export default UmbPowerToyRepository;
