import {
  LitElement,
  css,
  html,
  customElement,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";

@customElement("power-toys-dashboard")
export class PowerToysDashboardElement extends UmbElementMixin(LitElement) {
  render() {
    return html`
      <div id="power-toys">
        <umb-extension-slot type="powerToy">
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
