import { LitElement, css, html, customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { ManifestPowerToy } from "../power-toy.extension.js";
import type { UmbPowerToyElement } from "../power-toy-element.interface.js";
import { UMB_POWER_TOY_CONTEXT } from "../power-toy.context.js";
import { POWER_TOY_MODAL } from "../power-toy-modal.token.js";
import { DEFAULT_NAVBAR_CLOCK_SETTINGS, withDefaults, type NavbarClockSettings } from "./navbar-clock-settings.js";

const POWER_TOY_ALIAS = "PowerToys.PowerToy.NavbarClock";

// Overrides the dashboard's default card body (power-toys-default-body) - same
// click-to-configure behaviour, but with a live preview of the clock underneath the
// description, styled like the actual backoffice header, instead of just the description text.
@customElement("power-toys-navbar-clock-body")
export class NavbarClockBodyElement extends UmbElementMixin(LitElement) implements UmbPowerToyElement {
  @property({ attribute: false })
  manifest?: ManifestPowerToy;

  @property({ type: Boolean })
  enabled = true;

  @state()
  private _time = new Date();

  @state()
  private _settings: NavbarClockSettings = DEFAULT_NAVBAR_CLOCK_SETTINGS;

  #modalManager?: typeof UMB_MODAL_MANAGER_CONTEXT.TYPE;
  #interval?: number;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
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

  // Same click-to-configure behaviour as power-toys-default-body - only the card's content
  // differs here, not what clicking it does.
  #onClick = () => {
    const modal = this.manifest?.meta.modal;
    if (!this.enabled || !modal || !this.manifest) return;
    this.#modalManager?.open(this, POWER_TOY_MODAL, {
      data: { manifest: this.manifest },
      modal: modal.size ? { size: modal.size } : undefined,
    });
  };

  #preview(): string {
    const parts = [
      this._settings.showDate ? this.localize.date(this._time, { dateStyle: this._settings.dateStyle }) : "",
      this._settings.showTime ? this.localize.date(this._time, { timeStyle: this._settings.timeStyle }) : "",
    ].filter(Boolean);
    return parts.join(" ");
  }

  render() {
    const clickable = !!this.manifest?.meta.modal;
    return html`
      <div class=${clickable ? "clickable" : ""} @click=${this.#onClick}>
        <p>${this.manifest?.meta.description}</p>
        <div class="preview">${this.#preview()}</div>
      </div>
    `;
  }

  static styles = [
    css`
      .clickable {
        cursor: pointer;
      }

      .preview {
        display: flex;
        justify-content: center;
        padding: var(--uui-size-space-3) var(--uui-size-space-4);
        background: var(--uui-color-header-surface);
        color: var(--uui-color-header-contrast);
        border-radius: var(--uui-border-radius);
        font-variant-numeric: tabular-nums;
      }
    `,
  ];
}

export default NavbarClockBodyElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-navbar-clock-body": NavbarClockBodyElement;
  }
}
