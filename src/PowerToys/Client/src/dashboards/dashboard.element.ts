import {
  LitElement,
  css,
  html,
  customElement,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { UmbExtensionElementInitializer } from "@umbraco-cms/backoffice/extension-api";
import type { ManifestPowerToy } from "../power-toy/power-toy.extension.js";
import "../power-toy/power-toy-card.element.js";
import "../power-toy/power-toy-default-body.element.js";

@customElement("power-toys-dashboard")
export class PowerToysDashboardElement extends UmbElementMixin(LitElement) {
  // UmbPowerToyContext is provided globally (see power-toy/manifest.ts's globalContext
  // entry) so it's reachable from anywhere - not just descendants of this dashboard.

  #renderPowerToy = (ext: UmbExtensionElementInitializer) => html`
    <power-toys-card .manifest=${ext.manifest as ManifestPowerToy}>${ext.component}</power-toys-card>
  `;

  render() {
    return html`
      <div id="power-toys">
        <umb-extension-slot
          type="powerToy"
          default-element="power-toys-default-body"
          .renderMethod=${this.#renderPowerToy}>
          <uui-box>
            <p>No Power Toys have been registered yet.</p>
          </uui-box>
        </umb-extension-slot>
      </div>
    `;
  }

  static styles = [
    css`
      :host {
        display: block;
        padding: var(--uui-size-layout-1);
      }

      #power-toys {
        display: grid;
        gap: var(--uui-size-layout-1);
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        align-items: start;
      }
    `,
  ];
}

export default PowerToysDashboardElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-dashboard": PowerToysDashboardElement;
  }
}
