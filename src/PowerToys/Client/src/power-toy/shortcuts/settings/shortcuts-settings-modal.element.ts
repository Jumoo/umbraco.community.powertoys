import { LitElement, css, html, customElement, nothing, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { umbExtensionsRegistry } from "@umbraco-cms/backoffice/extension-registry";
import type { UUISelectEvent } from "@umbraco-cms/backoffice/external/uui";
import type { ManifestPowerToy } from "../../power-toy.extension.js";
import type { UmbPowerToyElement } from "../../power-toy-element.interface.js";
import { UMB_POWER_TOY_CONTEXT, type UmbPowerToyContext } from "../../power-toy.context.js";
import type { PowerToysPanelName } from "../../shared/panel/panel.context.js";
import { FIXED_SHORTCUTS, isMac, keysOf, type ShortcutKeys } from "../constants.js";
import {
  ACTION_TYPES,
  isGlobal,
  keyOf,
  sameKeys,
  sectionsInOrder,
  shortcutsIn,
  type CustomShortcut,
  type CustomShortcutAction,
  type CustomShortcutActionType,
  type ShortcutsSettings,
} from "./shortcuts-settings.js";
import { customShortcutLabel } from "./shortcut-label.js";

const PANELS: PowerToysPanelName[] = ["chat", "tasks", "shortcuts"];

// Umbraco's own shortcuts, and keys browsers keep for themselves (a page never sees them)
const UMBRACO_KEYS: ShortcutKeys[] = [
  { key: "s", modifier: true },
  { key: "p", modifier: true },
];
const BROWSER_KEYS: ShortcutKeys[] = [
  { key: "t", modifier: true },
  { key: "w", modifier: true },
  { key: "n", modifier: true },
  { key: "tab", modifier: true },
  { key: "t", modifier: true, shift: true },
  { key: "n", modifier: true, shift: true },
];

type Labelled = { alias: string; name?: string; meta?: { label?: string }; forEntityTypes?: string[] };

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

// Loaded into the shared power-toys-modal. The list is held as pending state until Save.
@customElement("power-toys-shortcuts-settings-modal")
export class ShortcutsSettingsModalElement extends UmbElementMixin(LitElement) implements UmbPowerToyElement {
  @property({ attribute: false })
  manifest?: ManifestPowerToy;

  @state()
  private _shortcuts: CustomShortcut[] = [];

  // The shortcut being added or edited
  @state()
  private _draft?: CustomShortcut;

  @state()
  private _recording = false;

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
    const settings = await this.#context.getSettings<ShortcutsSettings>(this.manifest.alias);
    this._shortcuts = shortcutsIn(settings);
  }

  async save(): Promise<void> {
    if (!this.manifest?.alias) return;
    await this.#context?.saveSettings<ShortcutsSettings>(this.manifest.alias, { shortcuts: this._shortcuts });
  }

  // Editing

  #add() {
    this._draft = { id: newId(), key: "", modifier: false, alt: true, action: { type: "section", target: sectionsInOrder()[0]?.alias ?? "" } };
  }

  #edit(shortcut: CustomShortcut) {
    this._draft = structuredClone(shortcut);
  }

  #remove(shortcut: CustomShortcut) {
    this._shortcuts = this._shortcuts.filter((s) => s.id !== shortcut.id);
  }

  #apply() {
    const draft = this._draft;
    if (!draft || !this.#isComplete(draft)) return;
    const exists = this._shortcuts.some((s) => s.id === draft.id);
    this._shortcuts = exists ? this._shortcuts.map((s) => (s.id === draft.id ? draft : s)) : [...this._shortcuts, draft];
    this._draft = undefined;
  }

  #isComplete(draft: CustomShortcut) {
    const needsTarget = draft.action.type !== "search";
    return !!draft.key && (!!draft.modifier || !!draft.alt) && (!needsTarget || !!draft.action.target);
  }

  #setAction(type: CustomShortcutActionType) {
    if (!this._draft) return;
    const target = this.#targetsFor(type)[0]?.value;
    this._draft = { ...this._draft, action: { type, target } as CustomShortcutAction };
  }

  #setTarget(target: string) {
    if (!this._draft) return;
    this._draft = { ...this._draft, action: { ...this._draft.action, target } as CustomShortcutAction };
  }

  // Records the next key combination pressed. A shortcut needs Ctrl/Cmd or Alt, so typing
  // can't trigger it; Escape stops recording.
  #record() {
    this._recording = true;
    const onKey = (e: KeyboardEvent) => {
      if (["Control", "Meta", "Alt", "Shift"].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      window.removeEventListener("keydown", onKey, true);
      this._recording = false;
      if (e.key === "Escape" || !this._draft) return;
      this._draft = {
        ...this._draft,
        key: keyOf(e),
        modifier: isMac ? e.metaKey : e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
      };
    };
    window.addEventListener("keydown", onKey, true);
  }

  // Targets

  #targetsFor(type: CustomShortcutActionType): Array<{ name: string; value: string }> {
    switch (type) {
      case "section":
        return sectionsInOrder().map((s) => ({ name: this.localize.string(s.meta?.label ?? s.name), value: s.alias }));
      case "panel":
        return PANELS.map((p) => ({ name: this.localize.term(`powerToysShortcuts_panel_${p}`), value: p }));
      case "workspaceAction":
        return this.#manifests("workspaceAction").map((m) => ({
          name: `${this.localize.string(m.meta?.label ?? m.name ?? m.alias)} (${m.alias})`,
          value: m.alias,
        }));
      case "entityAction":
        return this.#manifests("entityAction").map((m) => ({
          name: `${this.localize.string(m.meta?.label ?? m.name ?? m.alias)} - ${(m.forEntityTypes ?? []).join(", ")}`,
          value: m.alias,
        }));
      default:
        return [];
    }
  }

  #manifests(type: string): Labelled[] {
    return [...umbExtensionsRegistry.getByType(type)]
      .map((m) => m as unknown as Labelled)
      .sort((a, b) => this.localize.string(a.meta?.label ?? a.alias).localeCompare(this.localize.string(b.meta?.label ?? b.alias)));
  }

  // Clashes

  #clash(draft: CustomShortcut): string | undefined {
    if (!draft.key) return undefined;
    if (this._shortcuts.some((s) => s.id !== draft.id && sameKeys(s, draft))) return "powerToysShortcuts_clashCustom";
    if (UMBRACO_KEYS.some((k) => sameKeys(k, draft))) return "powerToysShortcuts_clashUmbraco";
    if (FIXED_SHORTCUTS.some((g) => g.shortcuts.some((k) => sameKeys(k, draft)))) return "powerToysShortcuts_clashRichText";
    if (BROWSER_KEYS.some((k) => sameKeys(k, draft))) return "powerToysShortcuts_clashBrowser";
    return undefined;
  }

  // Rendering

  #renderKeys(keys: ShortcutKeys) {
    if (!keys.key) return html`<span class="hint">${this.localize.term("powerToysShortcuts_noKeys")}</span>`;
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
            <uui-button compact label=${this.localize.term("powerToysShortcuts_edit")} @click=${() => this.#edit(s)}>
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

  #renderTarget(draft: CustomShortcut) {
    const type = draft.action.type;
    if (type === "search") return nothing;

    if (type === "url") {
      return html`<umb-property-layout label=${this.localize.term("powerToysShortcuts_url")} description=${this.localize.term("powerToysShortcuts_urlDescription")}>
        <uui-input
          slot="editor"
          label=${this.localize.term("powerToysShortcuts_url")}
          placeholder="/umbraco/section/content"
          .value=${draft.action.target ?? ""}
          @input=${(e: Event) => this.#setTarget((e.target as HTMLInputElement).value)}
        ></uui-input>
      </umb-property-layout>`;
    }

    const options = this.#targetsFor(type).map((o) => ({ ...o, selected: o.value === draft.action.target }));
    return html`<umb-property-layout label=${this.localize.term(`powerToysShortcuts_target_${type}`)}>
      <uui-select
        slot="editor"
        label=${this.localize.term(`powerToysShortcuts_target_${type}`)}
        .options=${options}
        @change=${(e: UUISelectEvent) => this.#setTarget(e.target.value as string)}
      ></uui-select>
    </umb-property-layout>`;
  }

  #renderEditor() {
    const draft = this._draft;
    if (!draft) return nothing;

    const clash = this.#clash(draft);
    const actionOptions = ACTION_TYPES.map((t) => ({
      name: this.localize.term(`powerToysShortcuts_action_${t}`),
      value: t,
      selected: t === draft.action.type,
    }));

    return html`<uui-box headline=${this.localize.term(this._shortcuts.some((s) => s.id === draft.id) ? "powerToysShortcuts_editShortcut" : "powerToysShortcuts_addShortcut")}>
      <umb-property-layout label=${this.localize.term("powerToysShortcuts_keys")} description=${this.localize.term("powerToysShortcuts_keysDescription")}>
        <div slot="editor" class="recorder">
          ${this.#renderKeys(draft)}
          <uui-button
            look="secondary"
            label=${this.localize.term(this._recording ? "powerToysShortcuts_pressKeysNow" : "powerToysShortcuts_pressKeys")}
            .state=${this._recording ? "waiting" : undefined}
            @click=${this.#record}
          ></uui-button>
        </div>
      </umb-property-layout>
      ${clash
        ? html`<p class="warning"><uui-icon name="icon-alert"></uui-icon> ${this.localize.term(clash)}</p>`
        : nothing}

      <umb-property-layout label=${this.localize.term("powerToysShortcuts_does")}>
        <uui-select
          slot="editor"
          label=${this.localize.term("powerToysShortcuts_does")}
          .options=${actionOptions}
          @change=${(e: UUISelectEvent) => this.#setAction(e.target.value as CustomShortcutActionType)}
        ></uui-select>
      </umb-property-layout>

      ${this.#renderTarget(draft)}

      <umb-property-layout label=${this.localize.term("powerToysShortcuts_label")} description=${this.localize.term("powerToysShortcuts_labelDescription")}>
        <uui-input
          slot="editor"
          label=${this.localize.term("powerToysShortcuts_label")}
          .value=${draft.label ?? ""}
          @input=${(e: Event) => (this._draft = { ...draft, label: (e.target as HTMLInputElement).value || undefined })}
        ></uui-input>
      </umb-property-layout>

      <div class="buttons">
        <uui-button label=${this.localize.term("powerToysShortcuts_cancel")} @click=${() => (this._draft = undefined)}></uui-button>
        <uui-button
          look="primary"
          label=${this.localize.term("powerToysShortcuts_apply")}
          ?disabled=${!this.#isComplete(draft)}
          @click=${this.#apply}
        ></uui-button>
      </div>
    </uui-box>`;
  }

  render() {
    return html`
      <uui-box headline=${this.localize.term("powerToysShortcuts_customHeadline")}>
        <uui-button slot="header-actions" look="secondary" label=${this.localize.term("powerToysShortcuts_addShortcut")} @click=${this.#add}>
          <uui-icon name="icon-add"></uui-icon> ${this.localize.term("powerToysShortcuts_addShortcut")}
        </uui-button>
        <p class="hint">${this.localize.term("powerToysShortcuts_customDescription")}</p>
        ${this.#renderList()}
      </uui-box>
      ${this.#renderEditor()}
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

      .recorder {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--uui-size-space-3);
      }

      .warning {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        margin: 0 0 var(--uui-size-space-3);
        color: var(--uui-color-warning-standalone);
      }

      uui-select,
      uui-input {
        width: 100%;
      }

      .buttons {
        display: flex;
        justify-content: flex-end;
        gap: var(--uui-size-space-2);
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
