import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ManifestPowerToy } from "./power-toy.extension.js";

export interface PowerToyModalData {
  manifest: ManifestPowerToy;
}

// One generic modal shared by every power toy that uses the default box - it loads
// whatever element the power toy's manifest.meta.modal points at, so a power toy only
// has to declare that element, not a whole modal extension of its own.
export const POWER_TOY_MODAL = new UmbModalToken<PowerToyModalData, undefined>("PowerToys.Modal.PowerToy", {
  modal: {
    type: "sidebar",
    size: "small",
  },
});
