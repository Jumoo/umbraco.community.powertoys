import type {
  ElementLoaderProperty,
  ManifestElement,
  ManifestWithDynamicConditions,
} from "@umbraco-cms/backoffice/extension-api";
import type { UUIModalSidebarSize } from "@umbraco-cms/backoffice/external/uui";
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
  /**
   * Optional sidebar to open when the default power toy box is clicked.
   * Only used when the power toy doesn't declare its own `js`/`element` - a power toy with
   * its own element decides its own click behaviour. Omit to leave the default box static.
   */
  modal?: MetaPowerToyModal;
}

export interface MetaPowerToyModal {
  /** The element to load into the sidebar. */
  element: ElementLoaderProperty<HTMLElement>;
  /** Sidebar size - defaults to "small". */
  size?: UUIModalSidebarSize;
}

declare global {
  interface UmbExtensionManifestMap {
    umbPowerToyManifest: ManifestPowerToy;
  }
}
