import { LitElement, css, html, customElement, property, state, nothing } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { UUIInputEvent } from "@umbraco-cms/backoffice/external/uui";
import { UmbDocumentTypeDetailRepository } from "@umbraco-cms/backoffice/document-type";
import type { ManifestPowerToy } from "../power-toy.extension.js";
import type { UmbPowerToyElement } from "../power-toy-element.interface.js";
import { TAB_COLORS_CONTEXT, type TabColorsContext } from "./tab-colors.context.js";
import { DEFAULT_TAB_COLORS_SETTINGS, withDefaults, type TabColorsSettings } from "./tab-colors-settings.js";

interface TabSource {
  id: string;
  /** The content type that defines the tab - the picked one, or one of its compositions. */
  owner: { unique: string; name: string };
}

/**
 * One tab as the editor shows it. Tabs with the same name merge into one in the editor, so a
 * doc type built from compositions can have a single "Content" tab defined in several places.
 */
interface DocumentTypeTab {
  name: string;
  sources: TabSource[];
}

const DEFAULT_COLOR = "#2196F3";

// Pick a document type, then give any of its tabs (its own or from compositions) a colour. Changes stay local until the
// shared modal's Save button calls save().
@customElement("power-toys-tab-colors-modal")
export class TabColorsModalElement extends UmbElementMixin(LitElement) implements UmbPowerToyElement {
  @property({ attribute: false })
  manifest?: ManifestPowerToy;

  @state()
  private _settings: TabColorsSettings = DEFAULT_TAB_COLORS_SETTINGS;

  @state()
  private _documentType?: { unique: string; name: string; tabs: DocumentTypeTab[] };

  @state()
  private _loading = false;

  #context?: TabColorsContext;
  #repository = new UmbDocumentTypeDetailRepository(this);

  constructor() {
    super();
    this.consumeContext(TAB_COLORS_CONTEXT, (context) => {
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

  #onPickDocumentType = async (event: Event) => {
    const unique = (event.target as HTMLInputElement).value;
    if (!unique) {
      this._documentType = undefined;
      return;
    }
    this._loading = true;
    const sources: Array<TabSource & { name: string }> = [];
    const name = await this.#collectTabs(unique, sources, new Set());
    this._loading = false;
    if (name === undefined) return;
    const tabs: DocumentTypeTab[] = [];
    sources.forEach((source) => {
      const tab = tabs.find((t) => t.name === source.name);
      if (tab) tab.sources.push(source);
      else tabs.push({ name: source.name, sources: [source] });
    });
    this._documentType = { unique, name, tabs };
  };

  // The doc type's own tabs, then each composition's. Sites built on compositions (Clean, for
  // one) often have no tabs of their own at all. A composition's tab is stored against the
  // composition, so its colour shows on every doc type that uses it.
  async #collectTabs(unique: string, tabs: Array<TabSource & { name: string }>, visited: Set<string>): Promise<string | undefined> {
    if (visited.has(unique)) return undefined;
    visited.add(unique);
    const { data } = await this.#repository.requestByUnique(unique);
    if (!data) return undefined;
    data.containers
      .filter((container) => container.type === "Tab")
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((container) =>
        tabs.push({ id: container.id, name: container.name, owner: { unique, name: data.name } }),
      );
    for (const composition of data.compositions) {
      await this.#collectTabs(composition.contentType.unique, tabs, visited);
    }
    return data.name;
  }

  // The colour goes on every container that makes up the merged tab - which also colours that
  // tab on any other doc type sharing one of those compositions.
  #setColor(tab: DocumentTypeTab, color: string) {
    const tabs = { ...this._settings.tabs };
    tab.sources.forEach((source) => {
      tabs[source.id] = {
        color,
        contentType: source.owner.unique,
        contentTypeName: source.owner.name,
        tabName: tab.name,
      };
    });
    this._settings = { ...this._settings, tabs };
  }

  #clearColor(...ids: string[]) {
    const tabs = { ...this._settings.tabs };
    ids.forEach((id) => delete tabs[id]);
    this._settings = { ...this._settings, tabs };
  }

  #renderTab(tab: DocumentTypeTab) {
    const color = tab.sources.map((source) => this._settings.tabs[source.id]?.color).find(Boolean);
    const from = tab.sources.filter((source) => source.owner.unique !== this._documentType?.unique);
    return html`
      <div class="row">
        <span class="name" style=${color ? `color: ${color}` : ""}
          >${tab.name}
          ${from.length
            ? html`<span class="from">from ${from.map((source) => source.owner.name).join(", ")}</span>`
            : nothing}</span
        >
        ${color
          ? html`
              <input
                type="color"
                .value=${color}
                @input=${(e: Event) => this.#setColor(tab, (e.target as HTMLInputElement).value)}>
              </input>
              <uui-input
                class="hex"
                label="Colour"
                .value=${color}
                @input=${(e: UUIInputEvent) => this.#setColor(tab, String(e.target.value ?? ""))}>
              </uui-input>
              <uui-button compact label="Clear colour" @click=${() => this.#clearColor(...tab.sources.map((source) => source.id))}>
                <uui-icon name="icon-trash"></uui-icon>
              </uui-button>
            `
          : html`<uui-button look="secondary" compact label="Add colour" @click=${() => this.#setColor(tab, DEFAULT_COLOR)}>
              Add colour
            </uui-button>`}
      </div>
    `;
  }

  #renderDocumentType() {
    if (this._loading) return html`<uui-loader-bar></uui-loader-bar>`;
    if (!this._documentType) return nothing;
    if (!this._documentType.tabs.length) {
      return html`<p class="note">${this._documentType.name} has no tabs.</p>`;
    }
    return this._documentType.tabs.map((tab) => this.#renderTab(tab));
  }

  #renderColoured() {
    const entries = Object.entries(this._settings.tabs).sort(
      ([, a], [, b]) => a.contentTypeName.localeCompare(b.contentTypeName) || a.tabName.localeCompare(b.tabName),
    );
    if (!entries.length) return html`<p class="note">No tabs have a colour yet.</p>`;
    return entries.map(
      ([id, tab]) => html`
        <div class="row">
          <span class="swatch" style="background: ${tab.color}"></span>
          <span class="name">${tab.contentTypeName} <span class="sep">›</span> ${tab.tabName}</span>
          <uui-button compact label="Clear colour" @click=${() => this.#clearColor(id)}>
            <uui-icon name="icon-trash"></uui-icon>
          </uui-button>
        </div>
      `,
    );
  }

  render() {
    return html`
      <uui-box>
        <div slot="headline">Document Type</div>
        <umb-input-document-type
          documentTypesOnly
          max="1"
          @change=${this.#onPickDocumentType}></umb-input-document-type>
        ${this.#renderDocumentType()}
        ${this._documentType?.tabs.some((tab) =>
          tab.sources.some((source) => source.owner.unique !== this._documentType?.unique),
        )
          ? html`<p class="note">
              A tab that comes from a composition is coloured on the composition, so the colour also shows on
              every other document type that uses it.
            </p>`
          : nothing}
      </uui-box>

      <uui-box>
        <div slot="headline">Coloured Tabs</div>
        ${this.#renderColoured()}
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

      umb-input-document-type {
        margin-bottom: var(--uui-size-space-4);
      }

      .row {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        min-height: 36px;
        margin-bottom: var(--uui-size-space-2);
      }

      .row .name {
        flex: 1 1 auto;
        font-weight: 700;
      }

      .row .from {
        margin-left: var(--uui-size-space-2);
        color: var(--uui-color-text-alt);
        font-weight: 400;
        font-size: var(--uui-type-small-size);
      }

      .row .sep {
        color: var(--uui-color-text-alt);
        font-weight: 400;
      }

      .row input[type="color"] {
        flex: 0 0 auto;
        width: 36px;
        height: 36px;
        padding: 0;
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        background: none;
        cursor: pointer;
      }

      .row .hex {
        flex: 0 0 100px;
      }

      .swatch {
        flex: 0 0 auto;
        width: 20px;
        height: 20px;
        border-radius: var(--uui-border-radius);
      }

      .note {
        color: var(--uui-color-text-alt);
        font-style: italic;
      }
    `,
  ];
}

export default TabColorsModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-tab-colors-modal": TabColorsModalElement;
  }
}
