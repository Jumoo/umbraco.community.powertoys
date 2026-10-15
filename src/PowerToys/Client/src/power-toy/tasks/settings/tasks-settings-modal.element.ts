import { LitElement, css, html, customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { ManifestPowerToy } from "../../power-toy.extension.js";
import type { UmbPowerToyElement } from "../../power-toy-element.interface.js";
import { UMB_POWER_TOY_CONTEXT, type UmbPowerToyContext } from "../../power-toy.context.js";
import { DEFAULT_TASKS_SETTINGS, withDefaults, type TasksSettings } from "./tasks-settings.js";

// Loaded into the shared power-toys-modal. Held as pending state until Save persists it.
@customElement("power-toys-tasks-settings-modal")
export class TasksSettingsModalElement extends UmbElementMixin(LitElement) implements UmbPowerToyElement {
  @property({ attribute: false })
  manifest?: ManifestPowerToy;

  @state()
  private _settings: TasksSettings = DEFAULT_TASKS_SETTINGS;

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
    const settings = await this.#context.getSettings<TasksSettings>(this.manifest.alias);
    this._settings = withDefaults(settings);
  }

  async save(): Promise<void> {
    if (!this.manifest?.alias) return;
    await this.#context?.saveSettings(this.manifest.alias, this._settings);
  }

  #onChange = <K extends keyof TasksSettings>(key: K, value: TasksSettings[K]) => {
    this._settings = { ...this._settings, [key]: value };
  };

  render() {
    const off = !this._settings.reviewsEnabled;

    return html`
      <uui-box headline=${this.localize.term("powerToysTasks_settingsReviews")}>
        <umb-property-layout
          label=${this.localize.term("powerToysTasks_settingsReviewsEnabled")}
          description=${this.localize.term("powerToysTasks_settingsReviewsDescription")}
          orientation="horizontal">
          <uui-toggle
            slot="editor"
            label=${this.localize.term("powerToysTasks_settingsReviewsEnabled")}
            .checked=${this._settings.reviewsEnabled}
            @change=${(e: Event) => this.#onChange("reviewsEnabled", (e.target as HTMLInputElement).checked)}>
          </uui-toggle>
        </umb-property-layout>

        <umb-property-layout
          label=${this.localize.term("powerToysTasks_settingsReminderGroup")}
          description=${this.localize.term("powerToysTasks_settingsReminderGroupDescription")}>
          <umb-user-group-input
            slot="editor"
            .max=${1}
            ?readonly=${off}
            .selection=${this._settings.reminderGroupKey ? [this._settings.reminderGroupKey] : []}
            @change=${(e: Event) =>
              this.#onChange("reminderGroupKey", (e.target as unknown as { selection: string[] }).selection[0] ?? null)}>
          </umb-user-group-input>
        </umb-property-layout>

        <umb-property-layout
          label=${this.localize.term("powerToysTasks_settingsReminderHours")}
          description=${this.localize.term("powerToysTasks_settingsReminderHoursDescription")}>
          <uui-input
            slot="editor"
            type="number"
            min="1"
            label=${this.localize.term("powerToysTasks_settingsReminderHours")}
            ?disabled=${off}
            .value=${String(this._settings.reminderHours)}
            @change=${(e: Event) =>
              this.#onChange("reminderHours", Math.max(1, Number((e.target as HTMLInputElement).value) || 1))}>
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

      uui-input {
        width: 100%;
      }
    `,
  ];
}

export default TasksSettingsModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-tasks-settings-modal": TasksSettingsModalElement;
  }
}
