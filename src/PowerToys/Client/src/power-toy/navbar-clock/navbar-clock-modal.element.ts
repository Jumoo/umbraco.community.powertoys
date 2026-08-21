import { LitElement, css, html, customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { UUISelectEvent } from "@umbraco-cms/backoffice/external/uui";
import type { ManifestPowerToy } from "../power-toy.extension.js";
import type { UmbPowerToyElement } from "../power-toy-element.interface.js";
import { UMB_POWER_TOY_CONTEXT, type UmbPowerToyContext } from "../power-toy.context.js";
import {
  DATE_TIME_STYLES,
  DEFAULT_NAVBAR_CLOCK_SETTINGS,
  withDefaults,
  type DateTimeStyle,
  type NavbarClockSettings,
} from "./navbar-clock-settings.js";

const STYLE_OPTIONS = DATE_TIME_STYLES.map((style) => ({ name: style, value: style }));

// Loaded into the shared power-toys-modal - a small settings form kept in local pending
// state until Save persists it (and, via saveSettings, pushes it live to the header app).
@customElement("power-toys-navbar-clock-modal")
export class NavbarClockModalElement extends UmbElementMixin(LitElement) implements UmbPowerToyElement {
  @property({ attribute: false })
  manifest?: ManifestPowerToy;

  @state()
  private _settings: NavbarClockSettings = DEFAULT_NAVBAR_CLOCK_SETTINGS;

  #context?: UmbPowerToyContext;

  constructor() {
    super();
    this.consumeContext(UMB_POWER_TOY_CONTEXT, (context) => {
      this.#context = context;
      this.#loadSettings();
    });
  }

  async #loadSettings() {
    if (!this.manifest?.alias || !this.#context) return;
    const settings = await this.#context.getSettings<NavbarClockSettings>(this.manifest.alias);
    this._settings = withDefaults(settings);
  }

  async save(): Promise<void> {
    if (!this.manifest?.alias) return;
    await this.#context?.saveSettings(this.manifest.alias, this._settings);
  }

  #onChange = <K extends keyof NavbarClockSettings>(key: K, value: NavbarClockSettings[K]) => {
    this._settings = { ...this._settings, [key]: value };
  };

  #options(selected: DateTimeStyle) {
    return STYLE_OPTIONS.map((option) => ({ ...option, selected: option.value === selected }));
  }

  render() {
    return html`
      <uui-box>
        <div slot="headline">Date</div>
        <umb-property-layout label="Show Date" orientation="horizontal">
          <uui-toggle
            slot="editor"
            .checked=${this._settings.showDate}
            @change=${(e: Event) => this.#onChange("showDate", (e.target as HTMLInputElement).checked)}>
          </uui-toggle>
        </umb-property-layout>

        <umb-property-layout label="Date Format" orientation="horizontal">
          <uui-select
            slot="editor"
            .options=${this.#options(this._settings.dateStyle)}
            @change=${(e: UUISelectEvent) => this.#onChange("dateStyle", e.target.value as DateTimeStyle)}>
          </uui-select>
        </umb-property-layout>
      </uui-box>

      <uui-box>
        <div slot="headline">Time</div>
        <umb-property-layout label="Show Time" orientation="horizontal">
          <uui-toggle
            slot="editor"
            .checked=${this._settings.showTime}
            @change=${(e: Event) => this.#onChange("showTime", (e.target as HTMLInputElement).checked)}>
          </uui-toggle>
        </umb-property-layout>

        <umb-property-layout label="Time Format" orientation="horizontal">
          <uui-select
            slot="editor"
            .options=${this.#options(this._settings.timeStyle)}
            @change=${(e: UUISelectEvent) => this.#onChange("timeStyle", e.target.value as DateTimeStyle)}>
          </uui-select>
        </umb-property-layout>
      </uui-box>
    `;
  }

  static styles = [
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      uui-select {
        width: 100%;
      }
    `,
  ];
}

export default NavbarClockModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-navbar-clock-modal": NavbarClockModalElement;
  }
}
