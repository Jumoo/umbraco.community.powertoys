import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { PowerToysService } from "../../api/sdk.gen.js";

// Talks to the shared PowerToys.*.Enabled / PowerToys.*.Settings backup endpoint - a flat
// key/value snapshot of every power toy's state, regardless of what each one actually stores.
export class UmbPowerToysBackupRepository extends UmbControllerBase {
  constructor(host: UmbControllerHost) {
    super(host);
  }

  async getBackup(): Promise<Record<string, string>> {
    const { data } = await PowerToysService.getBackup();
    return (data as Record<string, string>) ?? {};
  }

  async restoreBackup(values: Record<string, string>): Promise<void> {
    await PowerToysService.restoreBackup({ body: values });
  }
}

export default UmbPowerToysBackupRepository;
