import { LitElement, css, html, customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";

// Entirely client side - no server round-trip, no settings beyond enabled/disabled
// (handled by the PowerToyEnabled condition on this header app's manifest).
@customElement("power-toys-navbar-clock")
export class PowerToysNavbarClockElement extends UmbElementMixin(LitElement) {
  @state()
  private _time = new Date();

  #interval?: number;

  connectedCallback() {
    super.connectedCallback();
    this._time = new Date();
    this.#interval = window.setInterval(() => {
      this._time = new Date();
    }, 1000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.clearInterval(this.#interval);
  }

  render() {
    return html`<span>${this._time.toLocaleTimeString()}</span>`;
  }

  static styles = [
    css`
      :host {
        display: inline-flex;
        align-items: center;
        padding: 0 var(--uui-size-space-4);
        font-variant-numeric: tabular-nums;
        color: var(--uui-color-header-contrast);
      }
    `,
  ];
}

export default PowerToysNavbarClockElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-navbar-clock": PowerToysNavbarClockElement;
  }
}
