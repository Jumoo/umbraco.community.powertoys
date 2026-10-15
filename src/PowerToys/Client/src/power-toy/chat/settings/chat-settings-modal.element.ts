import { LitElement, css, html, customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { ManifestPowerToy } from "../../power-toy.extension.js";
import type { UmbPowerToyElement } from "../../power-toy-element.interface.js";
import { UMB_POWER_TOY_CONTEXT, type UmbPowerToyContext } from "../../power-toy.context.js";
import { CONTENT_ACTIVITY_EVENTS, DEFAULT_CHAT_SETTINGS, withDefaults, type ChatSettings } from "./chat-settings.js";

// Loaded into the shared power-toys-modal. Held as pending state until Save persists it.
@customElement("power-toys-chat-settings-modal")
export class ChatSettingsModalElement extends UmbElementMixin(LitElement) implements UmbPowerToyElement {
  @property({ attribute: false })
  manifest?: ManifestPowerToy;

  @state()
  private _settings: ChatSettings = DEFAULT_CHAT_SETTINGS;

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
    const settings = await this.#context.getSettings<ChatSettings>(this.manifest.alias);
    this._settings = withDefaults(settings);
  }

  async save(): Promise<void> {
    if (!this.manifest?.alias) return;
    await this.#context?.saveSettings(this.manifest.alias, this._settings);
  }

  #onChange = <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => {
    this._settings = { ...this._settings, [key]: value };
  };

  #onEventChange(event: string, checked: boolean) {
    const events = this._settings.activityEvents.filter((e) => e !== event);
    this.#onChange("activityEvents", checked ? [...events, event] : events);
  }

  render() {
    return html`
      <uui-box headline=${this.localize.term("powerToysChat_settingsActivity")}>
        <umb-property-layout
          label=${this.localize.term("powerToysChat_settingsActivityEnabled")}
          description=${this.localize.term("powerToysChat_settingsActivityDescription")}
          orientation="horizontal">
          <uui-toggle
            slot="editor"
            label=${this.localize.term("powerToysChat_settingsActivityEnabled")}
            .checked=${this._settings.activityEnabled}
            @change=${(e: Event) => this.#onChange("activityEnabled", (e.target as HTMLInputElement).checked)}>
          </uui-toggle>
        </umb-property-layout>

        <umb-property-layout label=${this.localize.term("powerToysChat_settingsActivityEvents")}>
          <div slot="editor" class="events">
            ${CONTENT_ACTIVITY_EVENTS.map(
              (event) => html`<uui-toggle
                label=${this.localize.term(`powerToysChat_event${event}`)}
                ?disabled=${!this._settings.activityEnabled}
                .checked=${this._settings.activityEvents.includes(event)}
                @change=${(e: Event) => this.#onEventChange(event, (e.target as HTMLInputElement).checked)}
                >${this.localize.term(`powerToysChat_event${event}`)}</uui-toggle
              >`
            )}
          </div>
        </umb-property-layout>

        <umb-property-layout
          label=${this.localize.term("powerToysChat_settingsCollapseMinutes")}
          description=${this.localize.term("powerToysChat_settingsCollapseMinutesDescription")}>
          <uui-input
            slot="editor"
            type="number"
            min="0"
            label=${this.localize.term("powerToysChat_settingsCollapseMinutes")}
            ?disabled=${!this._settings.activityEnabled}
            .value=${String(this._settings.collapseMinutes)}
            @change=${(e: Event) =>
              this.#onChange("collapseMinutes", Math.max(0, Number((e.target as HTMLInputElement).value) || 0))}>
          </uui-input>
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

      .events {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-2);
      }

      uui-input {
        width: 100%;
      }
    `,
  ];
}

export default ChatSettingsModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-chat-settings-modal": ChatSettingsModalElement;
  }
}
