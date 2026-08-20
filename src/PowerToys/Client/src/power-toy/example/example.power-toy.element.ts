import {
  LitElement,
  html,
  customElement,
  property,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { ManifestPowerToy } from "../power-toy.extension.js";

// The power-toys-card wrapper supplies the icon/name header and the enable/disable toggle -
// this element is only ever the body, and decides for itself what "disabled" looks like.
@customElement("power-toys-example-power-toy")
export class ExamplePowerToyElement extends UmbElementMixin(LitElement) {
  @property({ attribute: false })
  manifest?: ManifestPowerToy;

  @property({ type: Boolean })
  enabled = true;

  render() {
    // power-toys-card already greys this out and disables pointer events while
    // disabled - this element doesn't need to do anything with `enabled` itself.
    return html`<p>${this.manifest?.meta.description}</p>`;
  }
}

export default ExamplePowerToyElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-example-power-toy": ExamplePowerToyElement;
  }
}
