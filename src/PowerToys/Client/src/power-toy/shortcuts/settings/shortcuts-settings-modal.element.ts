import { LitElement, css, html, customElement, nothing, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { ManifestPowerToy } from "../../power-toy.extension.js";
import type { UmbPowerToyElement } from "../../power-toy-element.interface.js";
import { UMB_POWER_TOY_CONTEXT, type UmbPowerToyContext } from "../../power-toy.context.js";
import { keysOf, type ShortcutKeys } from "../constants.js";
import { isGlobal, shortcutsIn, type CustomShortcut, type ShortcutsSettings } from "./shortcuts-settings.js";
import { customShortcutLabel } from "./shortcut-label.js";
import { SHORTCUT_EDITOR_MODAL } from "./shortcut-editor-modal.token.js";

// Loaded into the shared power-toys-modal. Adding or editing a shortcut opens its own sidebar
// over this one; the list is held as pending state until Save.
@customElement("power-toys-shortcuts-settings-modal")
export class ShortcutsSettingsModalElement extends UmbElementMixin(LitElement) implements UmbPowerToyElement {
  @property({ attribute: false })
  manifest?: ManifestPowerToy;

  @state()
  private _shortcuts: CustomShortcut[] = [];

  #context?: UmbPowerToyContext;
  #modalManager?: typeof UMB_MODAL_MANAGER_CONTEXT.TYPE;

  constructor() {
    super();
    this.consumeContext(UMB_POWER_TOY_CONTEXT, (context) => {
      this.#context = context;
      this.#loadSettings();
    });
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => (this.#modalManager = context));
  }

  async #loadSettings() {
    if (!this.manifest?.alias || !this.#context) return;
    const settings = await this.#context.getSettings<ShortcutsSettings>(this.manifest.alias);
    this._shortcuts = shortcutsIn(settings);
  }

  async save(): Promise<void> {
    if (!this.manifest?.alias) return;
    await this.#context?.saveSettings<ShortcutsSettings>(this.manifest.alias, { shortcuts: this._shortcuts });
  }

  // Opens the editor sidebar, empty to add or with the shortcut to edit, and takes back what
  // it returns. Cancelling it changes nothing.
  async #open(shortcut?: CustomShortcut) {
    if (!this.#modalManager) return;
    const result = await this.#modalManager
      .open(this, SHORTCUT_EDITOR_MODAL, {
        data: { others: this._shortcuts },
        value: shortcut ? structuredClone(shortcut) : undefined,
      })
      .onSubmit()
      .catch(() => undefined);
    if (!result) return;

    const exists = this._shortcuts.some((s) => s.id === result.id);
    this._shortcuts = exists ? this._shortcuts.map((s) => (s.id === result.id ? result : s)) : [...this._shortcuts, result];
  }

  #remove(shortcut: CustomShortcut) {
    this._shortcuts = this._shortcuts.filter((s) => s.id !== shortcut.id);
  }

  #renderKeys(keys: ShortcutKeys) {
    return html`<span class="keys">${keysOf(keys).map((k, i) => html`${i > 0 ? html`<span class="plus">+</span>` : nothing}<kbd>${k}</kbd>`)}</span>`;
  }

  #describe(shortcut: CustomShortcut) {
    const where = isGlobal(shortcut.action) ? "" : ` · ${this.localize.term("powerToysShortcuts_inWorkspaces")}`;
    return `${this.localize.term(`powerToysShortcuts_action_${shortcut.action.type}`)}${where}`;
  }

  #renderList() {
    if (this._shortcuts.length === 0) {
      return html`<p class="hint">${this.localize.term("powerToysShortcuts_noCustom")}</p>`;
    }

    return html`<uui-table>
      <uui-table-head>
        <uui-table-head-cell>${this.localize.term("powerToysShortcuts_keys")}</uui-table-head-cell>
        <uui-table-head-cell>${this.localize.term("powerToysShortcuts_does")}</uui-table-head-cell>
        <uui-table-head-cell></uui-table-head-cell>
      </uui-table-head>
      ${this._shortcuts.map(
        (s) => html`<uui-table-row>
          <uui-table-cell>${this.#renderKeys(s)}</uui-table-cell>
          <uui-table-cell>
            <div>${this.localize.string(customShortcutLabel(s))}</div>
            <div class="hint">${this.#describe(s)}</div>
          </uui-table-cell>
          <uui-table-cell class="actions">
            <uui-button compact label=${this.localize.term("powerToysShortcuts_edit")} @click=${() => this.#open(s)}>
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button compact color="danger" label=${this.localize.term("powerToysShortcuts_delete")} @click=${() => this.#remove(s)}>
              <uui-icon name="icon-trash"></uui-icon>
            </uui-button>
          </uui-table-cell>
        </uui-table-row>`
      )}
    </uui-table>`;
  }

  render() {
    return html`
      <uui-box headline=${this.localize.term("powerToysShortcuts_customHeadline")}>
        <uui-button slot="header-actions" look="secondary" label=${this.localize.term("powerToysShortcuts_addShortcut")} @click=${() => this.#open()}>
          <uui-icon name="icon-add"></uui-icon> ${this.localize.term("powerToysShortcuts_addShortcut")}
        </uui-button>
        <p class="hint">${this.localize.term("powerToysShortcuts_customDescription")}</p>
        ${this.#renderList()}
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

      .hint {
        margin: 0 0 var(--uui-size-space-3);
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
      }

      uui-table-cell .hint {
        margin: 0;
      }

      .actions {
        text-align: right;
        white-space: nowrap;
      }

      .keys {
        display: inline-flex;
        align-items: center;
        gap: var(--uui-size-space-1);
        white-space: nowrap;
      }

      kbd {
        display: inline-block;
        min-width: 1.5em;
        padding: var(--uui-size-space-1) var(--uui-size-space-2);
        border: 1px solid var(--uui-color-border-standalone);
        border-bottom-width: 2px;
        border-radius: var(--uui-border-radius);
        background: var(--uui-color-surface-alt);
        font-family: inherit;
        font-size: var(--uui-type-small-size);
        text-align: center;
      }

      .plus {
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
      }
    `,
  ];
}

export default ShortcutsSettingsModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-shortcuts-settings-modal": ShortcutsSettingsModalElement;
  }
}
