import type { ManifestPowerToy } from "./power-toy.extension.js";

export interface UmbPowerToyElement extends HTMLElement {
  manifest?: ManifestPowerToy;
}
