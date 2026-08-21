import { LitElement, css, html, customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_POWER_TOY_CONTEXT } from "../power-toy.context.js";
import { DEFAULT_NAVBAR_CLOCK_SETTINGS, withDefaults, type NavbarClockSettings } from "./navbar-clock-settings.js";

const POWER_TOY_ALIAS = "PowerToys.PowerToy.NavbarClock";

// No server round-trip of its own beyond reading settings - enabled/disabled is handled by
// the PowerToyEnabled condition on this header app's manifest; date/time settings come live
// from UmbPowerToyContext.observeSettings, kept fresh whenever the settings modal saves.
@customElement("power-toys-navbar-clock")
export class PowerToysNavbarClockElement extends UmbElementMixin(LitElement) {
  @state()
  private _time = new Date();

  @state()
  private _settings: NavbarClockSettings = DEFAULT_NAVBAR_CLOCK_SETTINGS;

  #interval?: number;

  constructor() {
    super();
    this.consumeContext(UMB_POWER_TOY_CONTEXT, (context) => {
      if (!context) return;
      this.observe(context.observeSettings<NavbarClockSettings>(POWER_TOY_ALIAS), (settings) => {
        this._settings = withDefaults(settings);
      });
    });
  }

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
    const parts = [
      this._settings.showDate ? this.localize.date(this._time, { dateStyle: this._settings.dateStyle }) : "",
      this._settings.showTime ? this.localize.date(this._time, { timeStyle: this._settings.timeStyle }) : "",
    ].filter(Boolean);
    return html`<span>${parts.join(" ")}</span>`;
  }

  static styles = [
    css`
      :host {
        display: inline-flex;
        align-items: center;
        flex-shrink: 0;
        padding: 0 var(--uui-size-space-4);
        font-variant-numeric: tabular-nums;
        color: var(--uui-color-header-contrast);
        white-space: nowrap;
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
