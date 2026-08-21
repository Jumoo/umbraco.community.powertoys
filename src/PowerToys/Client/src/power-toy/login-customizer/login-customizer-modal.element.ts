import { LitElement, css, html, customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { UUIInputEvent } from "@umbraco-cms/backoffice/external/uui";
import { UmbMediaPickerInputContext } from "@umbraco-cms/backoffice/media";
import type { ManifestPowerToy } from "../power-toy.extension.js";
import type { UmbPowerToyElement } from "../power-toy-element.interface.js";
import { UMB_POWER_TOY_CONTEXT, type UmbPowerToyContext } from "../power-toy.context.js";
import { PowerToysService } from "../../api/sdk.gen.js";
import {
  DAYS_OF_WEEK,
  DEFAULT_LOGIN_CUSTOMIZER_SETTINGS,
  withDefaults,
  type LoginCustomizerSettings,
} from "./login-customizer-settings.js";

// Loaded into the shared power-toys-modal - a small settings form kept in local pending
// state until Save persists it. Takes effect after the site restarts (PostConfigure only
// runs once at boot), same constraint as uSync's NoNodesViewPath trick.
@customElement("power-toys-login-customizer-modal")
export class LoginCustomizerModalElement extends UmbElementMixin(LitElement) implements UmbPowerToyElement {
  @property({ attribute: false })
  manifest?: ManifestPowerToy;

  @state()
  private _settings: LoginCustomizerSettings = DEFAULT_LOGIN_CUSTOMIZER_SETTINGS;

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
    const settings = await this.#context.getSettings<LoginCustomizerSettings>(this.manifest.alias);
    this._settings = withDefaults(settings);
  }

  async save(): Promise<void> {
    if (!this.manifest?.alias) return;
    await this.#context?.saveSettings(this.manifest.alias, this._settings);
  }

  #onChange = <K extends keyof LoginCustomizerSettings>(key: K, value: LoginCustomizerSettings[K]) => {
    this._settings = { ...this._settings, [key]: value };
  };

  async #pickMedia(key: keyof LoginCustomizerSettings) {
    await this.#mediaPicker.openPicker();
    const [id] = this.#mediaPicker.getSelection();
    if (!id) return;

    const { data: url } = await PowerToysService.getUrl({ path: { id } });
    if (!url) return;

    // ContentSettings.Login*Image are resolved relative to ~/umbraco/ (see
    // BackOfficeGraphicsController.HandleFileRequest), not wwwroot root - so a media URL
    // like "/media/xxx/file.jpg" needs to climb back out of that folder first.
    this.#onChange(key, `../${url.replace(/^\/+/, "")}` as LoginCustomizerSettings[typeof key]);
  }

  #onGreetingChange(day: number, value: string) {
    const greetings = [...this._settings.greetings];
    greetings[day] = value;
    this.#onChange("greetings", greetings);
  }

  #imageRow(label: string, key: "backgroundImage" | "logoImage" | "logoImageAlternative") {
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
        <div slot="headline">Images</div>
        <p class="note">Image paths need to be relative to the /umbraco folder (e.g. ../assets/logo.png).</p>
        ${this.#imageRow("Background Image", "backgroundImage")}
        ${this.#imageRow("Logo Image", "logoImage")}
        ${this.#imageRow("Logo Image Alternative", "logoImageAlternative")}
      </uui-box>

      <uui-box>
        <div slot="headline">Security</div>
        <umb-property-layout label="Allow Password Reset" orientation="horizontal">
          <uui-toggle
            slot="editor"
            .checked=${this._settings.allowPasswordReset}
            @change=${(e: Event) => this.#onChange("allowPasswordReset", (e.target as HTMLInputElement).checked)}>
          </uui-toggle>
        </umb-property-layout>
        <p class="note">
          "Forgot Password" will not display in Umbraco if you do not have SMTP settings in your appsettings.json file.
        </p>
      </uui-box>

      <p class="note">Image and Security changes here take effect after the site restarts.</p>

      <uui-box>
        <div slot="headline">Greeting</div>
        <p class="note">Leave a day blank to keep Umbraco's default greeting for that day.</p>
        ${DAYS_OF_WEEK.map(
          (day, index) => html`
            <umb-property-layout label=${day} orientation="horizontal">
              <uui-input
                slot="editor"
                .value=${this._settings.greetings[index]}
                @input=${(e: UUIInputEvent) => this.#onGreetingChange(index, String(e.target.value ?? ""))}>
              </uui-input>
            </umb-property-layout>
          `,
        )}
        <umb-property-layout label="Instruction" orientation="horizontal">
          <uui-input
            slot="editor"
            .value=${this._settings.instruction}
            @input=${(e: UUIInputEvent) => this.#onChange("instruction", String(e.target.value ?? ""))}>
          </uui-input>
        </umb-property-layout>
      </uui-box>

      <uui-box>
        <div slot="headline">Custom CSS</div>
        <uui-textarea
          rows="6"
          .value=${this._settings.customCss}
          @input=${(e: UUIInputEvent) => this.#onChange("customCss", String(e.target.value ?? ""))}>
        </uui-textarea>
        <p class="note">
          See the
          <a href="https://docs.umbraco.com/umbraco-cms/model-your-content/content-types-and-structure/backoffice/login#custom-css-properties-reference" target="_blank" rel="noopener noreferrer">
            custom CSS properties reference
          </a>
          for the available variables.
        </p>
      </uui-box>

      <p class="note">Greeting and Custom CSS changes appear on the next login screen load (cached briefly - up to 30 days in production).</p>
    `;
  }

  static styles = [
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      uui-input,
      uui-textarea {
        width: 100%;
      }

      uui-textarea {
        font-family: monospace;
      }

      .note {
        color: var(--uui-color-text-alt);
        font-style: italic;
      }
    `,
  ];
}

export default LoginCustomizerModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-login-customizer-modal": LoginCustomizerModalElement;
  }
}
