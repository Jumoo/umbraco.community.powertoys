import type {
  ManifestElement,
  ManifestWithDynamicConditions,
} from "@umbraco-cms/backoffice/extension-api";
import type { UmbPowerToyElement } from "./power-toy-element.interface.js";

export interface ManifestPowerToy
  extends ManifestElement<UmbPowerToyElement>,
    ManifestWithDynamicConditions<UmbExtensionConditionConfig> {
  type: "powerToy";
  meta: MetaPowerToy;
}

export interface MetaPowerToy {
  /** Label shown on the tool's card in the dashboard. */
  label: string;
  /** Optional longer description shown under the label. */
  description?: string;
  /** uui-icon name, e.g. 'icon-wand'. */
  icon?: string;
}

declare global {
  interface UmbExtensionManifestMap {
    umbPowerToyManifest: ManifestPowerToy;
  }
}
