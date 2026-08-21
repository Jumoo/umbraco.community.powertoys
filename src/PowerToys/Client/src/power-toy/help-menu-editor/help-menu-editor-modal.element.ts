import { LitElement, css, html, customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { ManifestMenuItem } from "@umbraco-cms/backoffice/menu";
import type { ManifestPowerToy } from "../power-toy.extension.js";
import type { UmbPowerToyElement } from "../power-toy-element.interface.js";
import { HELP_MENU_EDITOR_CONTEXT, type HelpMenuEditorContext, CUSTOM_LINK_ALIAS_PREFIX } from "./help-menu-editor.context.js";
import { HELP_MENU_ADD_LINK_MODAL } from "./help-menu-add-link-modal.token.js";
import { DEFAULT_HELP_MENU_EDITOR_SETTINGS, withDefaults, type HelpMenuEditorSettings } from "./help-menu-editor-settings.js";

// Loaded into the shared power-toys-modal - lists every built-in help menu item (baseline,
// survives unregistering) with a toggle per row, a list of custom links with a delete button
// each, and an "Add link" button. Pending changes are kept local until the modal's Save
// button calls save(), which is when they're persisted and applied.
@customElement("power-toys-help-menu-editor-modal")
export class HelpMenuEditorModalElement extends UmbElementMixin(LitElement) implements UmbPowerToyElement {
  @property({ attribute: false })
  manifest?: ManifestPowerToy;

  @state()
  private _items: ManifestMenuItem[] = [];

  @state()
  private _settings: HelpMenuEditorSettings = DEFAULT_HELP_MENU_EDITOR_SETTINGS;

  #context?: HelpMenuEditorContext;
  #modalManager?: typeof UMB_MODAL_MANAGER_CONTEXT.TYPE;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
    this.consumeContext(HELP_MENU_EDITOR_CONTEXT, (context) => {
      this.#context = context;
      if (!context) return;
      this.observe(context.observeAvailableItems(), (items) => {
        this._items = [...items].sort((a, b) => this.#label(a).localeCompare(this.#label(b)));
      });
      this.observe(context.observeSettings(), (settings) => {
        this._settings = withDefaults(settings);
      });
    });
  }

  async save(): Promise<void> {
    await this.#context?.save(this._settings);
  }

  #label(item: ManifestMenuItem): string {
    return this.localize.string(item.meta?.label ?? item.name);
  }

  #onDisableHelpMenu = (disableHelpMenu: boolean) => {
    this._settings = { ...this._settings, disableHelpMenu };
  };

  #onToggleItem = (alias: string, enabled: boolean) => {
    const disabledItems = enabled
      ? this._settings.disabledItems.filter((a) => a !== alias)
      : [...this._settings.disabledItems, alias];
    this._settings = { ...this._settings, disabledItems };
  };

  #onRemoveLink = (alias: string) => {
    this._settings = {
      ...this._settings,
      customLinks: this._settings.customLinks.filter((link) => link.alias !== alias),
    };
  };

  async #onAddLink() {
    if (!this.#modalManager) return;
    const value = await this.#modalManager
      .open(this, HELP_MENU_ADD_LINK_MODAL, {})
      .onSubmit()
      .catch(() => undefined);
    if (!value) return;

    this._settings = {
      ...this._settings,
      customLinks: [
        ...this._settings.customLinks,
        { alias: `${CUSTOM_LINK_ALIAS_PREFIX}${crypto.randomUUID()}`, ...value },
      ],
    };
  }

  render() {
    return html`
      <uui-box>
        <div slot="headline">Help Menu</div>
        <umb-property-layout label="Disable the help menu completely" orientation="horizontal">
          <uui-toggle
            slot="editor"
            .checked=${this._settings.disableHelpMenu}
            @change=${(e: Event) => this.#onDisableHelpMenu((e.target as HTMLInputElement).checked)}>
          </uui-toggle>
        </umb-property-layout>
        <p class="note">Hides the help icon at the top of the backoffice entirely.</p>
      </uui-box>

      <uui-box ?disabled=${this._settings.disableHelpMenu}>
        <div slot="headline">Built-in Links</div>
        ${this._items.length
          ? html`
              <uui-ref-list>
                ${this._items.map((item) => {
                  const enabled = !this._settings.disabledItems.includes(item.alias);
                  return html`
                    <uui-ref-node
                      class=${enabled ? "" : "removed"}
                      .name=${this.#label(item)}
                      .detail=${item.alias}>
                      <uui-icon slot="icon" name=${item.meta?.icon ?? "icon-link"}></uui-icon>
                      <uui-toggle
                        slot="actions"
                        label="Show this link"
                        label-position="left"
                        ?disabled=${this._settings.disableHelpMenu}
                        .checked=${enabled}
                        @change=${(e: Event) => this.#onToggleItem(item.alias, (e.target as HTMLInputElement).checked)}>
                      </uui-toggle>
                    </uui-ref-node>
                  `;
                })}
              </uui-ref-list>
            `
          : html`<p class="note">No help menu links found.</p>`}
      </uui-box>

      <uui-box ?disabled=${this._settings.disableHelpMenu}>
        <div slot="headline">Custom Links</div>
        ${this._settings.customLinks.length
          ? html`
              <uui-ref-list>
                ${this._settings.customLinks.map(
                  (link) => html`
                    <uui-ref-node .name=${link.name} .detail=${link.href}>
                      <uui-icon slot="icon" name=${link.icon}></uui-icon>
                      <uui-button
                        slot="actions"
                        compact
                        label="Remove"
                        @click=${() => this.#onRemoveLink(link.alias)}>
                        <uui-icon name="icon-trash"></uui-icon>
                      </uui-button>
                    </uui-ref-node>
                  `,
                )}
              </uui-ref-list>
            `
          : ""}
        <uui-button
          look="placeholder"
          label="Add link"
          ?disabled=${this._settings.disableHelpMenu}
          @click=${() => this.#onAddLink()}>
          <uui-icon name="icon-add"></uui-icon>
          Add link
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

      uui-box[disabled] {
        opacity: 0.5;
        pointer-events: none;
      }

      uui-ref-node.removed {
        opacity: 0.5;
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

export default HelpMenuEditorModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-help-menu-editor-modal": HelpMenuEditorModalElement;
  }
}
