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
      <uui-box headline="Power Toys">
        <p>No tools have been added yet.</p>
      </uui-box>
    `;
  }

  static styles = [
    css`
      :host {
        display: block;
        padding: var(--uui-size-layout-1);
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
