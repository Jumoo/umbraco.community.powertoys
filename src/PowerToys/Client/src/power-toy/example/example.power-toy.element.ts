import {
  LitElement,
  css,
  html,
  customElement,
  property,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { ManifestPowerToy } from "../power-toy.extension.js";

@customElement("power-toys-example-power-toy")
export class ExamplePowerToyElement extends UmbElementMixin(LitElement) {
  @property({ attribute: false })
  manifest?: ManifestPowerToy;

  render() {
    return html`
      <uui-box headline=${this.manifest?.meta.label ?? "Example"}>
        <p>${this.manifest?.meta.description}</p>
      </uui-box>
    `;
  }

  static styles = [css``];
}

export default ExamplePowerToyElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-example-power-toy": ExamplePowerToyElement;
  }
}
