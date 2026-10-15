import { css, html, customElement, nothing, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { umbExtensionsRegistry } from "@umbraco-cms/backoffice/extension-registry";
import type { UUISelectEvent } from "@umbraco-cms/backoffice/external/uui";
import type { PowerToysPanelName } from "../../shared/panel/panel.context.js";
import { FIXED_SHORTCUTS, isMac, keysOf, type ShortcutKeys } from "../constants.js";
import {
  ACTION_TYPES,
  keyOf,
  sameKeys,
  sectionsInOrder,
  type CustomShortcut,
  type CustomShortcutAction,
  type CustomShortcutActionType,
} from "./shortcuts-settings.js";
import type { ShortcutEditorModalData } from "./shortcut-editor-modal.token.js";

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

// Adds or edits one custom shortcut: its keys, what it does and an optional label. Opened over
// the Keyboard Shortcuts settings; Done hands the shortcut back to them.
@customElement("power-toys-shortcut-editor-modal")
export class ShortcutEditorModalElement extends UmbModalBaseElement<ShortcutEditorModalData, CustomShortcut> {
  @state()
  private _draft: CustomShortcut = {
    id: newId(),
    key: "",
    alt: true,
    action: { type: "section", target: sectionsInOrder()[0]?.alias ?? "" },
  };

  @state()
  private _recording = false;

  #onKey?: (e: KeyboardEvent) => void;

  get #editing() {
    return !!this.value?.id;
  }

  override connectedCallback() {
    super.connectedCallback();
    if (this.value?.id) this._draft = structuredClone(this.value);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.#stopRecording();
  }

  #isComplete(draft: CustomShortcut) {
    const needsTarget = draft.action.type !== "search";
    return !!draft.key && (!!draft.modifier || !!draft.alt) && (!needsTarget || !!draft.action.target);
  }

  #done = () => {
    if (!this.#isComplete(this._draft)) return;
    this.value = this._draft;
    this._submitModal();
  };

  #setAction(type: CustomShortcutActionType) {
    const target = this.#targetsFor(type)[0]?.value;
    this._draft = { ...this._draft, action: { type, target } as CustomShortcutAction };
  }

  #setTarget(target: string) {
    this._draft = { ...this._draft, action: { ...this._draft.action, target } as CustomShortcutAction };
  }

  // Records the next key combination pressed. A shortcut needs Ctrl/Cmd or Alt, so typing
  // can't trigger it; Escape stops recording without closing the dialog.
  #record = () => {
    this.#stopRecording();
    this._recording = true;
    this.#onKey = (e: KeyboardEvent) => {
      if (["Control", "Meta", "Alt", "Shift"].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      this.#stopRecording();
      if (e.key === "Escape") return;
      this._draft = {
        ...this._draft,
        key: keyOf(e),
        modifier: isMac ? e.metaKey : e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
      };
    };
    window.addEventListener("keydown", this.#onKey, true);
  };

  #stopRecording() {
    if (this.#onKey) window.removeEventListener("keydown", this.#onKey, true);
    this.#onKey = undefined;
    this._recording = false;
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
    if ((this.data?.others ?? []).some((s) => s.id !== draft.id && sameKeys(s, draft))) return "powerToysShortcuts_clashCustom";
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

  #renderTarget() {
    const draft = this._draft;
    const type = draft.action.type;
    if (type === "search") return nothing;

    if (type === "url") {
      return html`<umb-property-layout
        label=${this.localize.term("powerToysShortcuts_url")}
        description=${this.localize.term("powerToysShortcuts_urlDescription")}
        orientation="vertical">
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
    return html`<umb-property-layout label=${this.localize.term(`powerToysShortcuts_target_${type}`)} orientation="vertical">
      <uui-select
        slot="editor"
        label=${this.localize.term(`powerToysShortcuts_target_${type}`)}
        .options=${options}
        @change=${(e: UUISelectEvent) => this.#setTarget(e.target.value as string)}
      ></uui-select>
    </umb-property-layout>`;
  }

  override render() {
    const draft = this._draft;
    const clash = this.#clash(draft);
    const actionOptions = ACTION_TYPES.map((t) => ({
      name: this.localize.term(`powerToysShortcuts_action_${t}`),
      value: t,
      selected: t === draft.action.type,
    }));

    return html`
      <umb-body-layout
        headline=${this.localize.term(this.#editing ? "powerToysShortcuts_editShortcut" : "powerToysShortcuts_addShortcut")}>
        <uui-box>
          <umb-property-layout
            label=${this.localize.term("powerToysShortcuts_keys")}
            description=${this.localize.term("powerToysShortcuts_keysDescription")}
            orientation="vertical">
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
          ${clash ? html`<p class="warning"><uui-icon name="icon-alert"></uui-icon> ${this.localize.term(clash)}</p>` : nothing}

          <umb-property-layout label=${this.localize.term("powerToysShortcuts_does")} orientation="vertical">
            <uui-select
              slot="editor"
              label=${this.localize.term("powerToysShortcuts_does")}
              .options=${actionOptions}
              @change=${(e: UUISelectEvent) => this.#setAction(e.target.value as CustomShortcutActionType)}
            ></uui-select>
          </umb-property-layout>

          ${this.#renderTarget()}

          <umb-property-layout
            label=${this.localize.term("powerToysShortcuts_label")}
            description=${this.localize.term("powerToysShortcuts_labelDescription")}
            orientation="vertical">
            <uui-input
              slot="editor"
              label=${this.localize.term("powerToysShortcuts_label")}
              .value=${draft.label ?? ""}
              @input=${(e: Event) => (this._draft = { ...this._draft, label: (e.target as HTMLInputElement).value || undefined })}
            ></uui-input>
          </umb-property-layout>
        </uui-box>

        <div slot="actions">
          <uui-button label=${this.localize.term("powerToysShortcuts_cancel")} @click=${() => this._rejectModal()}></uui-button>
          <uui-button
            look="primary"
            color="positive"
            label=${this.localize.term("powerToysShortcuts_apply")}
            ?disabled=${!this.#isComplete(draft)}
            @click=${this.#done}
          ></uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override styles = css`
    .hint {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
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
  `;
}

export default ShortcutEditorModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-shortcut-editor-modal": ShortcutEditorModalElement;
  }
}
