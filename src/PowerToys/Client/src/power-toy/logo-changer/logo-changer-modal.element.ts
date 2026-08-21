import { LitElement, css, html, customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { UUIInputEvent } from "@umbraco-cms/backoffice/external/uui";
import { UmbMediaPickerInputContext } from "@umbraco-cms/backoffice/media";
import type { ManifestPowerToy } from "../power-toy.extension.js";
import type { UmbPowerToyElement } from "../power-toy-element.interface.js";
import { UMB_POWER_TOY_CONTEXT, type UmbPowerToyContext } from "../power-toy.context.js";
import { PowerToysService } from "../../api/sdk.gen.js";
import { DEFAULT_LOGO_CHANGER_SETTINGS, withDefaults, type LogoChangerSettings } from "./logo-changer-settings.js";

// Loaded into the shared power-toys-modal - a small settings form kept in local pending
// state until Save persists it. Takes effect after the site restarts (PostConfigure only
// runs once at boot), same constraint as the Login Customizer power toy.
@customElement("power-toys-logo-changer-modal")
export class LogoChangerModalElement extends UmbElementMixin(LitElement) implements UmbPowerToyElement {
  @property({ attribute: false })
  manifest?: ManifestPowerToy;

  @state()
  private _settings: LogoChangerSettings = DEFAULT_LOGO_CHANGER_SETTINGS;

  #context?: UmbPowerToyContext;

  // One picker context, reused for every image field - it's just used transiently to open
  // the modal and hand back a picked id, not to render/track a persistent selection itself.
  #mediaPicker = new UmbMediaPickerInputContext(this);

  constructor() {
    super();
    this.#mediaPicker.min = 0;
    this.#mediaPicker.max = 1;

    this.consumeContext(UMB_POWER_TOY_CONTEXT, (context) => {
      this.#context = context;
      this.#loadSettings();
    });
  }

  async #loadSettings() {
    if (!this.manifest?.alias || !this.#context) return;
    const settings = await this.#context.getSettings<LogoChangerSettings>(this.manifest.alias);
    this._settings = withDefaults(settings);
  }

  async save(): Promise<void> {
    if (!this.manifest?.alias) return;
    await this.#context?.saveSettings(this.manifest.alias, this._settings);
  }

  #onChange = <K extends keyof LogoChangerSettings>(key: K, value: LogoChangerSettings[K]) => {
    this._settings = { ...this._settings, [key]: value };
  };

  async #pickMedia(key: keyof LogoChangerSettings) {
    await this.#mediaPicker.openPicker();
    const [id] = this.#mediaPicker.getSelection();
    if (!id) return;

    const { data: url } = await PowerToysService.getUrl({ path: { id } });
    if (!url) return;

    // ContentSettings.BackOfficeLogo* are resolved relative to ~/umbraco/ (see
    // BackOfficeGraphicsController.HandleFileRequest), not wwwroot root - so a media URL
    // like "/media/xxx/file.jpg" needs to climb back out of that folder first.
    this.#onChange(key, `../${url.replace(/^\/+/, "")}` as LogoChangerSettings[typeof key]);
  }

  #imageRow(label: string, key: "logo" | "logoAlternative") {
    return html`
      <umb-property-layout label=${label} orientation="horizontal">
        <uui-input
          slot="editor"
          .value=${this._settings[key]}
          placeholder="../media/..."
          @input=${(e: UUIInputEvent) => this.#onChange(key, String(e.target.value ?? ""))}>
          <uui-button
            slot="append"
            compact
            look="primary"
            label="Pick from media"
            @click=${() => this.#pickMedia(key)}>
            <uui-icon name="icon-picture"></uui-icon>
          </uui-button>
        </uui-input>
      </umb-property-layout>
    `;
  }

  render() {
    return html`
      <uui-box>
        <div slot="headline">Logo</div>
        <p class="note">Image paths need to be relative to the /umbraco folder (e.g. ../assets/logo.png).</p>
        ${this.#imageRow("Logo", "logo")} ${this.#imageRow("Logo Alternative", "logoAlternative")}
      </uui-box>

      <p class="note">Changes here take effect after the site restarts.</p>
    `;
  }

  static styles = [
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      uui-input {
        width: 100%;
      }

      .note {
        color: var(--uui-color-text-alt);
        font-style: italic;
      }
    `,
  ];
}

export default LogoChangerModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-logo-changer-modal": LogoChangerModalElement;
  }
}
