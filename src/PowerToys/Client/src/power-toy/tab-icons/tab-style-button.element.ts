import { css, html, customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import { UMB_ICON_PICKER_MODAL } from "@umbraco-cms/backoffice/icon";
import type { UmbContentTypeModel, UmbPropertyTypeContainerMergedModel } from "@umbraco-cms/backoffice/content-type";
import { TAB_ICONS_CONTEXT, type TabIconsContext } from "./tab-icons.context.js";
import type { TabIcon, TabIconsSettings } from "./tab-icons-settings.js";

// The bit of the content type workspace context this needs. Its own token
// (UMB_CONTENT_TYPE_WORKSPACE_CONTEXT) isn't exported, so this takes the generic workspace
// context and checks for a structure manager before using it.
interface StructureWorkspace {
  structure: {
    getContentTypes(): UmbContentTypeModel[];
    getOwnerContentTypeUnique(): string | undefined;
  };
}

function hasStructure(context: unknown): context is StructureWorkspace {
  return typeof (context as StructureWorkspace | undefined)?.structure?.getContentTypes === "function";
}

// A button on the active tab in the document type designer (see tab-icons.patch.ts) that opens
// Umbraco's own icon picker - the same one the doc type's icon uses - to pick the tab's icon and
// colour together. The pick saves straight away: it's a power toy setting, not part of the doc
// type, so the designer's own Save button isn't involved.
@customElement("power-toys-tab-style-button")
export class TabStyleButtonElement extends UmbLitElement {
  @property({ attribute: false })
  tab?: UmbPropertyTypeContainerMergedModel;

  @state()
  private _settings?: TabIconsSettings;

  @state()
  private _locked = false;

  #context?: TabIconsContext;
  #workspace?: StructureWorkspace;
  #modalManager?: typeof UMB_MODAL_MANAGER_CONTEXT.TYPE;

  constructor() {
    super();

    // The button sits inside the tab's link - keep clicks from navigating to the tab or
    // reaching the tab group.
    this.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    this.consumeContext(TAB_ICONS_CONTEXT, (context) => {
      this.#context = context;
      if (!context) return;
      this.observe(context.observeSettings(), (settings) => (this._settings = settings), "_settings");
      this.observe(context.observeLocked(), (locked) => (this._locked = locked), "_locked");
    });

    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspace = hasStructure(context) ? context : undefined;
    });

    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => (this.#modalManager = context));
  }

  // Same precedence as the editors: the doc type's own tab, then its compositions.
  get #current(): TabIcon | undefined {
    const tabs = this._settings?.tabs ?? {};
    const tab = this.tab;
    if (!tab) return undefined;
    if (tab.ownerId && tabs[tab.ownerId]) return tabs[tab.ownerId];
    return tab.ids.map((id) => tabs[id]).find(Boolean);
  }

  // The doc type's own tab is styled on its own container. A tab it only inherits is styled on
  // the compositions that define it, so it shows on every doc type using them.
  get #targets(): string[] {
    if (!this.tab) return [];
    return this.tab.ownerId ? [this.tab.ownerId] : this.tab.ids;
  }

  #ownerOf(id: string) {
    return this.#workspace?.structure
      .getContentTypes()
      .find((contentType) => contentType.containers.some((container) => container.id === id));
  }

  get #compositionNames(): string[] {
    if (!this.tab || this.tab.ownerId) return [];
    return this.tab.ids.map((id) => this.#ownerOf(id)?.name).filter((name): name is string => !!name);
  }

  async #openPicker() {
    if (!this.tab || !this.#modalManager || this._locked) return;
    const current = this.#current;
    const modal = this.#modalManager.open(this, UMB_ICON_PICKER_MODAL, {
      data: { showEmptyOption: true },
      value: { icon: current?.icon, color: current?.color },
    });
    const value = await modal.onSubmit().catch(() => undefined);
    if (!value) return;
    await this.#save(value.icon || undefined, value.color || undefined);
  }

  // Picking no icon and no colour clears the tab - including a composition's style showing
  // through on the doc type's own tab, since that's what you were looking at.
  async #save(icon: string | undefined, color: string | undefined) {
    if (!this.tab) return;
    if (!icon && !color) {
      const changes: Record<string, null> = {};
      [...this.tab.ids, ...(this.tab.ownerId ? [this.tab.ownerId] : [])].forEach((id) => (changes[id] = null));
      await this.#context?.update(changes);
      return;
    }
    const changes: Record<string, TabIcon> = {};
    this.#targets.forEach((id) => {
      const owner = this.#ownerOf(id);
      changes[id] = {
        icon,
        color,
        contentType: owner?.unique ?? this.#workspace?.structure.getOwnerContentTypeUnique() ?? "",
        contentTypeName: owner?.name ?? "",
        tabName: this.tab?.name ?? "",
      };
    });
    await this.#context?.update(changes);
  }

  render() {
    const icon = this.#current?.icon;
    const compositions = this.#compositionNames;
    const title = this._locked
      ? "Tab icon and colour (locked in appsettings.json)"
      : compositions.length
        ? `Tab icon and colour - set on ${compositions.join(", ")}, so it shows on every document type using it`
        : "Tab icon and colour";
    // With an icon set, the icon itself is the button. Without one, a small "add" button stands
    // in its place. A tab with only a colour still gets the add button, to add an icon.
    return html`
      <button
        class=${icon ? "icon" : "add"}
        title=${title}
        aria-label=${title}
        ?disabled=${this._locked}
        @click=${this.#openPicker}>
        <umb-icon name=${icon ?? "icon-palette"}></umb-icon>
      </button>
    `;
  }

  static styles = [
    css`
      :host {
        display: inline-flex;
        align-items: center;
      }

      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        cursor: pointer;
        font: inherit;
      }

      /* The tab's own icon: looks like the icons on the other tabs (it takes the tab's colour),
         with a hover outline to show it can be clicked. */
      button.icon {
        border: 1px solid transparent;
        border-radius: var(--uui-border-radius);
        background: none;
        color: inherit;
        padding: 2px;
        margin: -3px;
      }

      button.icon:hover:not([disabled]) {
        border-color: var(--uui-color-border-emphasis);
      }

      button.add {
        width: 22px;
        height: 22px;
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        background: var(--uui-color-surface);
        color: var(--uui-color-text-alt);
        font-size: 12px;
      }

      button.add:hover:not([disabled]) {
        border-color: var(--uui-color-border-emphasis);
        color: var(--uui-color-interactive-emphasis);
      }

      button[disabled] {
        cursor: default;
      }
    `,
  ];
}

export default TabStyleButtonElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-tab-style-button": TabStyleButtonElement;
  }
}
