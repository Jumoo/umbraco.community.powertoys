import {
  LitElement,
  html,
  customElement,
  property,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { ManifestPowerToy } from "../power-toy.extension.js";

// Loaded into the shared power-toys-modal when the example's default box is clicked -
// demonstrates a power toy that only declares a manifest, no js/element of its own.
@customElement("power-toys-example-modal")
export class ExampleModalElement extends UmbElementMixin(LitElement) {
  @property({ attribute: false })
  manifest?: ManifestPowerToy;

  render() {
    return html`<p>This is the example power toy's modal content.</p>`;
  }
}

export default ExampleModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-example-modal": ExampleModalElement;
  }
}
