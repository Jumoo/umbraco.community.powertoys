import type { ManifestPowerToy } from "./power-toy.extension.js";

export interface UmbPowerToyElement extends HTMLElement {
  manifest?: ManifestPowerToy;
  /** Set by the card wrapper from the enable/disable toggle. The power toy decides what to do with it. */
  enabled?: boolean;
}
