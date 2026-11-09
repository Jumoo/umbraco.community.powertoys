import { LitElement, css, html, customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { ManifestPowerToy } from "../power-toy.extension.js";
import type { UmbPowerToyElement } from "../power-toy-element.interface.js";
import { TAB_ICONS_CONTEXT, type TabIconsContext } from "./tab-icons.context.js";
import {
  DEFAULT_TAB_ICONS_SETTINGS,
  resolveTabColor,
  withDefaults,
  type TabIconsSettings,
} from "./tab-icons-settings.js";

// Tabs are styled in the document type designer itself (see tab-style-button.element.ts), so
// this is just the list of everything styled so far - the one place to clear a style left
// behind by a tab that was deleted, or added and then discarded. Removals stay local until the
// shared modal's Save button calls save().
@customElement("power-toys-tab-icons-modal")
export class TabIconsModalElement extends UmbElementMixin(LitElement) implements UmbPowerToyElement {
  @property({ attribute: false })
  manifest?: ManifestPowerToy;

  @state()
  private _settings: TabIconsSettings = DEFAULT_TAB_ICONS_SETTINGS;

  #context?: TabIconsContext;

  constructor() {
    super();
    this.consumeContext(TAB_ICONS_CONTEXT, (context) => {
      this.#context = context;
      if (!context) return;
      this.observe(context.observeSettings(), (settings) => {
        this._settings = withDefaults(settings);
      });
    });
  }

  async save(): Promise<void> {
    await this.#context?.save(this._settings);
  }

  #remove(id: string) {
    const tabs = { ...this._settings.tabs };
    delete tabs[id];
    this._settings = { ...this._settings, tabs };
  }

  #renderTabs() {
    const entries = Object.entries(this._settings.tabs).sort(
      ([, a], [, b]) => a.contentTypeName.localeCompare(b.contentTypeName) || a.tabName.localeCompare(b.tabName),
    );
    if (!entries.length) return html`<p class="note">No tabs have an icon or colour yet.</p>`;
    return entries.map(([id, tab]) => {
      const color = resolveTabColor(tab.color);
      return html`
        <div class="row">
          <span class="preview" style=${color ? `--uui-icon-color: ${color}; color: ${color}` : ""}>
            ${tab.icon ? html`<umb-icon name=${tab.icon}></umb-icon>` : html`<span class="dot"></span>`}
          </span>
          <span class="name">${tab.contentTypeName} <span class="sep">›</span> ${tab.tabName}</span>
          <uui-button compact label="Remove" @click=${() => this.#remove(id)}>
            <uui-icon name="icon-trash"></uui-icon>
          </uui-button>
        </div>
      `;
    });
  }

  render() {
    return html`
      <uui-box>
        <p class="note">
          Pick a tab's icon and colour in the document type designer, from the button on the selected tab. A tab
          that comes from a composition is styled on the composition, so it shows on every document type using it.
        </p>
      </uui-box>

      <uui-box>
        <div slot="headline">Styled Tabs</div>
        ${this.#renderTabs()}
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

      .row {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-3);
        min-height: 36px;
      }

      .preview {
        flex: 0 0 20px;
        display: inline-flex;
        justify-content: center;
        font-size: 18px;
      }

      .dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: currentColor;
      }

      .name {
        flex: 1 1 auto;
        font-weight: 700;
      }

      .sep {
        color: var(--uui-color-text-alt);
        font-weight: 400;
      }

      .note {
        margin: 0;
        color: var(--uui-color-text-alt);
        font-style: italic;
      }
    `,
  ];
}

export default TabIconsModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-tab-icons-modal": TabIconsModalElement;
  }
}
