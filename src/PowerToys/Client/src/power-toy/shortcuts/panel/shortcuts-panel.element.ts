import { css, customElement, html, nothing, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { SHORTCUTS_CONTEXT } from "../shortcuts.context.js";
import { FIXED_SHORTCUTS, keysOf, type ShortcutEntry } from "../constants.js";
import "../../shared/panel/panel-layout.element.js";
import { customShortcutLabel } from "../settings/shortcut-label.js";

// Labels Umbraco registers as a localisation key it doesn't define, so they arrive as the raw
// key. Umbraco 17's save and publish shortcut does this (content_saveAndPublishShortcut).
const MISSING_LABELS: Record<string, string> = {
  content_saveAndPublishShortcut: "powerToysShortcuts_saveAndPublish",
};

// "area_key" with no spaces: a localisation key that didn't resolve when it was registered
const UNRESOLVED_KEY = /^[a-z][A-Za-z]*_[A-Za-z0-9]+$/;

// The keyboard shortcuts panel docked beside the backoffice: what works on the screen you're on,
// then the keys that work everywhere
@customElement("power-toys-shortcuts-panel")
export class ShortcutsPanelElement extends UmbLitElement {
  @state()
  private _current: ShortcutEntry[] = [];

  @state()
  private _custom: ShortcutEntry[] = [];

  constructor() {
    super();

    this.consumeContext(SHORTCUTS_CONTEXT, (context) => {
      if (!context) return;
      this.observe(context.current, (current) => (this._current = current), "_current");
      this.observe(
        context.globalCustom,
        (custom) => (this._custom = custom.map((s) => ({ ...s, label: customShortcutLabel(s) }))),
        "_custom"
      );
    });
  }

  // A "#key" label is localised; a raw key that never resolved gets another go, then ours
  #label(label: string) {
    if (!UNRESOLVED_KEY.test(label)) return this.localize.string(label);

    const term = this.localize.term(label);
    if (term !== label) return term;

    const ours = MISSING_LABELS[label];
    return ours ? this.localize.term(ours) : label;
  }

  #renderList(shortcuts: ShortcutEntry[]) {
    return html`<dl>
      ${shortcuts.map(
        (s) => html`<div class="row">
          <dt>${this.#label(s.label)}</dt>
          <dd>
            ${keysOf(s).map((key, i) => html`${i > 0 ? html`<span class="plus">+</span>` : nothing}<kbd>${key}</kbd>`)}
          </dd>
        </div>`
      )}
    </dl>`;
  }

  override render() {
    return html`
      <power-toys-panel-layout headline=${this.localize.term("powerToysShortcuts_title")} icon="icon-keyboard">
        <div class="layout">
          <uui-box headline=${this.localize.term("powerToysShortcuts_thisScreen")}>
            ${this._current.length
              ? this.#renderList(this._current)
              : html`<p class="empty">${this.localize.term("powerToysShortcuts_noneHere")}</p>`}
          </uui-box>

          ${this._custom.length
            ? html`<uui-box headline=${this.localize.term("powerToysShortcuts_yourShortcuts")}>${this.#renderList(this._custom)}</uui-box>`
            : nothing}

          ${FIXED_SHORTCUTS.map(
            (group) => html`<uui-box headline=${this.localize.string(group.group)}>${this.#renderList(group.shortcuts)}</uui-box>`
          )}
        </div>
      </power-toys-panel-layout>
    `;
  }

  static override styles = css`
    :host {
      display: block;
      height: 100%;
    }

    .layout {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-layout-1);
    }

    dl {
      margin: 0;
    }

    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-4);
      padding: var(--uui-size-space-2) 0;
    }

    .row + .row {
      border-top: 1px solid var(--uui-color-divider);
    }

    dt {
      margin: 0;
    }

    dd {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      margin: 0;
      flex: none;
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

    .empty {
      margin: 0;
      color: var(--uui-color-text-alt);
    }
  `;
}

export default ShortcutsPanelElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-shortcuts-panel": ShortcutsPanelElement;
  }
}
