import { LitElement, css, html, customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { UUISelectEvent } from "@umbraco-cms/backoffice/external/uui";
import type { ManifestPowerToy } from "../power-toy.extension.js";
import type { UmbPowerToyElement } from "../power-toy-element.interface.js";
import { UMB_POWER_TOY_CONTEXT, type UmbPowerToyContext } from "../power-toy.context.js";
import {
  DEFAULT_TOAST_DURATIONS,
  DURATION_OPTIONS,
  TOAST_KINDS,
  withDefaults,
  type ToastDuration,
  type ToastDurationsSettings,
  type ToastKind,
} from "./toast-durations-settings.js";

// Options are keyed by string, since uui-select's values are strings
const keyOf = (value: ToastDuration) => String(value);
const fromKey = (key: string): ToastDuration => (key === "stay" || key === "hide" ? key : Number(key));

@customElement("power-toys-toast-durations-modal")
export class ToastDurationsModalElement extends UmbElementMixin(LitElement) implements UmbPowerToyElement {
  @property({ attribute: false })
  manifest?: ManifestPowerToy;

  @state()
  private _settings: ToastDurationsSettings = DEFAULT_TOAST_DURATIONS;

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
    const settings = await this.#context.getSettings<ToastDurationsSettings>(this.manifest.alias);
    this._settings = withDefaults(settings);
  }

  async save(): Promise<void> {
    if (!this.manifest?.alias) return;
    await this.#context?.saveSettings(this.manifest.alias, this._settings);
  }

  #options(selected: ToastDuration) {
    return DURATION_OPTIONS.map((option) => ({
      name: option.name,
      value: keyOf(option.value),
      selected: option.value === selected,
    }));
  }

  #onChange(kind: ToastKind, key: string) {
    this._settings = { ...this._settings, [kind]: fromKey(key) };
  }

  render() {
    return html`
      <uui-box headline="How long toasts stay on screen">
        <p>
          Applies to toasts that use Umbraco's default of 6 seconds. Toasts that stay until they're
          dismissed, or that a package gives its own time, are left alone. Hovering over a toast
          still keeps it open.
        </p>
        ${TOAST_KINDS.map(
          ({ kind, label, description }) => html`
            <umb-property-layout label=${label} description=${description} orientation="horizontal">
              <uui-select
                slot="editor"
                label=${label}
                .options=${this.#options(this._settings[kind])}
                @change=${(e: UUISelectEvent) => this.#onChange(kind, e.target.value as string)}>
              </uui-select>
            </umb-property-layout>
          `
        )}
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

      p {
        margin-top: 0;
      }

      uui-select {
        width: 100%;
      }
    `,
  ];
}

export default ToastDurationsModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-toast-durations-modal": ToastDurationsModalElement;
  }
}
