import {
  LitElement,
  css,
  html,
  customElement,
  property,
  repeat,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import { UmbSorterController } from "@umbraco-cms/backoffice/sorter";
import type { ManifestPowerToy } from "../power-toy.extension.js";
import type { UmbPowerToyElement } from "../power-toy-element.interface.js";
import {
  ENVIRONMENT_INDICATOR_CONTEXT,
  type EnvironmentIndicatorContext,
} from "./environment-indicator.context.js";
import { ENVIRONMENT_ADD_EDIT_MODAL } from "./environment-add-edit-modal.token.js";
import {
  DEFAULT_ENVIRONMENT_INDICATOR_SETTINGS,
  withDefaults,
  type EnvironmentDefinition,
  type EnvironmentIndicatorSettings,
} from "./environment-indicator-settings.js";

// Loaded into the shared power-toys-modal - a list of environments (name/pattern/colour),
// each editable or removable, plus a toggle for showing the matched name in the header.
// Pending changes are kept local until the modal's Save button calls save().
@customElement("power-toys-environment-indicator-modal")
export class EnvironmentIndicatorModalElement extends UmbElementMixin(LitElement) implements UmbPowerToyElement {
  @property({ attribute: false })
  manifest?: ManifestPowerToy;

  @state()
  private _settings: EnvironmentIndicatorSettings = DEFAULT_ENVIRONMENT_INDICATOR_SETTINGS;

  #context?: EnvironmentIndicatorContext;
  #modalManager?: typeof UMB_MODAL_MANAGER_CONTEXT.TYPE;

  #sorter = new UmbSorterController<EnvironmentDefinition>(this, {
    getUniqueOfElement: (element) => element.id,
    getUniqueOfModel: (modelEntry) => modelEntry.alias,
    identifier: "Jumoo.SorterIdentifier.EnvironmentIndicator",
    itemSelector: "uui-ref-node",
    containerSelector: "uui-ref-list",
    onChange: ({ model }) => {
      this._settings = { ...this._settings, environments: model };
    },
  });

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
    this.consumeContext(ENVIRONMENT_INDICATOR_CONTEXT, (context) => {
      this.#context = context;
      if (!context) return;
      this.observe(context.observeSettings(), (settings) => {
        this._settings = withDefaults(settings);
        this.#sorter.setModel(this._settings.environments);
      });
    });
  }

  async save(): Promise<void> {
    await this.#context?.save(this._settings);
  }

  #onShowNameChange = (showNameInHeader: boolean) => {
    this._settings = { ...this._settings, showNameInHeader };
  };

  #onRemove = (alias: string) => {
    this._settings = {
      ...this._settings,
      environments: this._settings.environments.filter((environment) => environment.alias !== alias),
    };
    this.#sorter.setModel(this._settings.environments);
  };

  async #onAdd() {
    if (!this.#modalManager) return;
    const value = await this.#modalManager
      .open(this, ENVIRONMENT_ADD_EDIT_MODAL, {})
      .onSubmit()
      .catch(() => undefined);
    if (!value) return;

    this._settings = {
      ...this._settings,
      environments: [...this._settings.environments, { alias: crypto.randomUUID(), ...value }],
    };
    this.#sorter.setModel(this._settings.environments);
  }

  async #onEdit(environment: EnvironmentDefinition) {
    if (!this.#modalManager) return;
    const value = await this.#modalManager
      .open(this, ENVIRONMENT_ADD_EDIT_MODAL, { value: environment })
      .onSubmit()
      .catch(() => undefined);
    if (!value) return;

    this._settings = {
      ...this._settings,
      environments: this._settings.environments.map((existing) =>
        existing.alias === environment.alias ? { ...existing, ...value } : existing,
      ),
    };
    this.#sorter.setModel(this._settings.environments);
  }

  render() {
    return html`
      <uui-box>
        <div slot="headline">Environments</div>
        ${this._settings.environments.length
          ? html`
              <uui-ref-list>
                ${repeat(
                  this._settings.environments,
                  (environment) => environment.alias,
                  (environment) => html`
                    <uui-ref-node
                      id=${environment.alias}
                      .name=${environment.name}
                      .detail=${environment.pattern}
                      @open=${() => this.#onEdit(environment)}>
                      <span slot="icon" class="swatch" style="background-color: ${environment.color}"></span>
                      <uui-button
                        slot="actions"
                        compact
                        label="Remove"
                        @click=${(e: Event) => {
                          e.stopPropagation();
                          this.#onRemove(environment.alias);
                        }}>
                        <uui-icon name="icon-trash"></uui-icon>
                      </uui-button>
                    </uui-ref-node>
                  `,
                )}
              </uui-ref-list>
            `
          : html`<p class="note">No environments configured yet.</p>`}
        <uui-button look="placeholder" label="Add environment" @click=${() => this.#onAdd()}>
          <uui-icon name="icon-add"></uui-icon>
          Add environment
        </uui-button>
      </uui-box>

      <uui-box>
        <div slot="headline">Header</div>
        <umb-property-layout label="Show environment name in header" orientation="horizontal">
          <uui-toggle
            slot="editor"
            .checked=${this._settings.showNameInHeader}
            @change=${(e: Event) => this.#onShowNameChange((e.target as HTMLInputElement).checked)}>
          </uui-toggle>
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

      uui-ref-node {
        cursor: pointer;
      }

      uui-ref-node.umb-sorter-placeholder {
        opacity: 0.2;
      }

      .swatch {
        display: inline-block;
        width: var(--uui-size-6);
        height: var(--uui-size-6);
        border-radius: 50%;
        border: 1px solid var(--uui-color-border);
      }

      uui-button[look="placeholder"] {
        width: 100%;
        margin-top: var(--uui-size-space-3);
      }

      .note {
        color: var(--uui-color-text-alt);
        font-style: italic;
      }
    `,
  ];
}

export default EnvironmentIndicatorModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-environment-indicator-modal": EnvironmentIndicatorModalElement;
  }
}
