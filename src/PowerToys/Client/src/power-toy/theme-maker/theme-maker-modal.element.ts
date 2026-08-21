import { LitElement, css, html, customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { ManifestTheme } from "@umbraco-cms/backoffice/themes";
import type { ManifestPowerToy } from "../power-toy.extension.js";
import type { UmbPowerToyElement } from "../power-toy-element.interface.js";
import { THEME_MAKER_CONTEXT, type ThemeMakerContext, CUSTOM_THEME_ALIAS_PREFIX } from "./theme-maker.context.js";
import { THEME_MAKER_EDITOR_MODAL } from "./theme-maker-editor-modal.token.js";
import { DEFAULT_THEME_MAKER_SETTINGS, withDefaults, type ThemeMakerSettings, type CustomTheme } from "./theme-maker-settings.js";

// Loaded into the shared power-toys-modal - lists every installed theme (baseline, survives
// unregistering) for reference, a list of custom themes with a delete button each, and an
// "Add theme" button. Pending changes are kept local until the modal's Save button calls
// save(), which is when they're persisted and applied.
@customElement("power-toys-theme-maker-modal")
export class ThemeMakerModalElement extends UmbElementMixin(LitElement) implements UmbPowerToyElement {
  @property({ attribute: false })
  manifest?: ManifestPowerToy;

  @state()
  private _installedThemes: ManifestTheme[] = [];

  @state()
  private _settings: ThemeMakerSettings = DEFAULT_THEME_MAKER_SETTINGS;

  #context?: ThemeMakerContext;
  #modalManager?: typeof UMB_MODAL_MANAGER_CONTEXT.TYPE;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
    this.consumeContext(THEME_MAKER_CONTEXT, (context) => {
      this.#context = context;
      if (!context) return;
      this.observe(context.observeInstalledThemes(), (themes) => {
        this._installedThemes = [...themes].sort((a, b) => this.#label(a).localeCompare(this.#label(b)));
      });
      this.observe(context.observeSettings(), (settings) => {
        this._settings = withDefaults(settings);
      });
    });
  }

  async save(): Promise<void> {
    await this.#context?.save(this._settings);
  }

  #label(theme: ManifestTheme): string {
    return this.localize.string(theme.name);
  }

  #onToggleTheme = (alias: string, enabled: boolean) => {
    const disabledThemes = enabled
      ? this._settings.disabledThemes.filter((a) => a !== alias)
      : [...this._settings.disabledThemes, alias];
    this._settings = { ...this._settings, disabledThemes };
  };

  #onRemoveTheme = (alias: string) => {
    this._settings = {
      ...this._settings,
      customThemes: this._settings.customThemes.filter((theme) => theme.alias !== alias),
    };
  };

  async #onAddTheme() {
    if (!this.#modalManager) return;
    const value = await this.#modalManager
      .open(this, THEME_MAKER_EDITOR_MODAL, {})
      .onSubmit()
      .catch(() => undefined);
    if (!value) return;

    this._settings = {
      ...this._settings,
      customThemes: [
        ...this._settings.customThemes,
        { alias: `${CUSTOM_THEME_ALIAS_PREFIX}${crypto.randomUUID()}`, ...value },
      ],
    };
  }

  async #onEditTheme(theme: CustomTheme) {
    if (!this.#modalManager) return;
    const value = await this.#modalManager
      .open(this, THEME_MAKER_EDITOR_MODAL, { data: { name: theme.name, colors: theme.colors } })
      .onSubmit()
      .catch(() => undefined);
    if (!value) return;

    this._settings = {
      ...this._settings,
      customThemes: this._settings.customThemes.map((t) => (t.alias === theme.alias ? { ...t, ...value } : t)),
    };
  }

  render() {
    return html`
      <uui-box class="info-box">
        <p class="note">
          Note: if the Environment Indicator power toy is enabled, it will overwrite any theme's header colour
          with its own environment colour while a match is active.
        </p>
      </uui-box>

      <uui-box>
        <div slot="headline">Installed Themes</div>
        ${this._installedThemes.length
          ? html`
              <uui-ref-list>
                ${this._installedThemes.map((theme) => {
                  const enabled = !this._settings.disabledThemes.includes(theme.alias);
                  return html`
                    <uui-ref-node
                      class=${enabled ? "" : "removed"}
                      .name=${this.#label(theme)}
                      .detail=${theme.alias}>
                      <uui-icon slot="icon" name="icon-palette"></uui-icon>
                      <uui-toggle
                        slot="actions"
                        label="Show this theme"
                        label-position="left"
                        .checked=${enabled}
                        @change=${(e: Event) => this.#onToggleTheme(theme.alias, (e.target as HTMLInputElement).checked)}>
                      </uui-toggle>
                    </uui-ref-node>
                  `;
                })}
              </uui-ref-list>
            `
          : html`<p class="note">No themes found.</p>`}
      </uui-box>

      <uui-box>
        <div slot="headline">Custom Themes</div>
        ${this._settings.customThemes.length
          ? html`
              <uui-ref-list>
                ${this._settings.customThemes.map(
                  (theme) => html`
                    <uui-ref-node .name=${theme.name} .detail=${theme.alias}>
                      <uui-icon slot="icon" name="icon-palette"></uui-icon>
                      <uui-button
                        slot="actions"
                        compact
                        label="Edit"
                        @click=${() => this.#onEditTheme(theme)}>
                        <uui-icon name="icon-edit"></uui-icon>
                      </uui-button>
                      <uui-button
                        slot="actions"
                        compact
                        label="Remove"
                        @click=${() => this.#onRemoveTheme(theme.alias)}>
                        <uui-icon name="icon-trash"></uui-icon>
                      </uui-button>
                    </uui-ref-node>
                  `,
                )}
              </uui-ref-list>
            `
          : ""}
        <uui-button look="placeholder" label="Add theme" @click=${() => this.#onAddTheme()}>
          <uui-icon name="icon-add"></uui-icon>
          Add theme
        </uui-button>
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

      uui-button[look="placeholder"] {
        width: 100%;
        margin-top: var(--uui-size-space-3);
      }

      uui-ref-node.removed {
        opacity: 0.5;
      }

      .note {
        color: var(--uui-color-text-alt);
        font-style: italic;
      }

      .info-box .note {
        margin: 0;
      }
    `,
  ];
}

export default ThemeMakerModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-theme-maker-modal": ThemeMakerModalElement;
  }
}
