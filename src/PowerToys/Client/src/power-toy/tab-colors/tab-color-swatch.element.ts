import { css, html, customElement, property, state, nothing } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import type { UUIInputEvent, UUIPopoverContainerElement } from "@umbraco-cms/backoffice/external/uui";
import type { UmbContentTypeModel, UmbPropertyTypeContainerMergedModel } from "@umbraco-cms/backoffice/content-type";
import { V13_ICON_COLORS } from "../icon-colors/icon-colors-settings.js";
import { TAB_COLORS_CONTEXT, type TabColorsContext } from "./tab-colors.context.js";
import type { TabColor, TabColorsSettings } from "./tab-colors-settings.js";

interface Owner {
  unique: string;
  name: string;
}

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

// A colour dot added to the active tab in the document type designer (see tab-colors.patch.ts).
// Picking a colour saves it straight away - it's a power toy setting, not part of the doc type,
// so the designer's own Save button doesn't need to be involved.
@customElement("power-toys-tab-color-swatch")
export class TabColorSwatchElement extends UmbLitElement {
  @property({ attribute: false })
  tab?: UmbPropertyTypeContainerMergedModel;

  @state()
  private _settings?: TabColorsSettings;

  @state()
  private _locked = false;

  #context?: TabColorsContext;
  #workspace?: StructureWorkspace;

  constructor() {
    super();

    // The swatch sits inside the tab's link - keep clicks (on the dot, or anywhere in the
    // popover) from navigating to the tab or reaching the tab group.
    this.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    this.consumeContext(TAB_COLORS_CONTEXT, (context) => {
      this.#context = context;
      if (!context) return;
      this.observe(context.observeSettings(), (settings) => (this._settings = settings), "_settings");
      this.observe(context.observeLocked(), (locked) => (this._locked = locked), "_locked");
    });

    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspace = hasStructure(context) ? context : undefined;
    });
  }

  get #color(): string | undefined {
    const tabs = this._settings?.tabs ?? {};
    const tab = this.tab;
    if (!tab) return undefined;
    if (tab.ownerId && tabs[tab.ownerId]) return tabs[tab.ownerId].color;
    return tab.ids.map((id) => tabs[id]?.color).find(Boolean);
  }

  // The doc type's own tab is coloured on its own container. A tab it only inherits is coloured
  // on the compositions that define it - same as the settings modal.
  get #targets(): string[] {
    if (!this.tab) return [];
    return this.tab.ownerId ? [this.tab.ownerId] : this.tab.ids;
  }

  #ownerOf(id: string): Owner | undefined {
    const type = this.#workspace?.structure
      .getContentTypes()
      .find((contentType) => contentType.containers.some((container) => container.id === id));
    return type ? { unique: type.unique, name: type.name } : undefined;
  }

  get #compositionNames(): string[] {
    if (!this.tab || this.tab.ownerId) return [];
    return this.tab.ids.map((id) => this.#ownerOf(id)?.name).filter((name): name is string => !!name);
  }

  async #setColor(color: string) {
    if (!this.tab || !CSS.supports("color", color)) return;
    const changes: Record<string, TabColor> = {};
    this.#targets.forEach((id) => {
      const owner = this.#ownerOf(id);
      changes[id] = {
        color,
        contentType: owner?.unique ?? this.#workspace?.structure.getOwnerContentTypeUnique() ?? "",
        contentTypeName: owner?.name ?? "",
        tabName: this.tab?.name ?? "",
      };
    });
    await this.#context?.update(changes);
  }

  // Clears the colour you can see, wherever it comes from - including a composition's colour
  // showing through on the doc type's own tab.
  async #clearColor() {
    if (!this.tab) return;
    const changes: Record<string, null> = {};
    [...this.tab.ids, ...(this.tab.ownerId ? [this.tab.ownerId] : [])].forEach((id) => (changes[id] = null));
    await this.#context?.update(changes);
    this.#closePopover();
  }

  #closePopover() {
    this.shadowRoot?.querySelector<UUIPopoverContainerElement>("#popover")?.hidePopover();
  }

  #renderPopover(color: string | undefined) {
    const compositions = this.#compositionNames;
    return html`
      <uui-popover-container id="popover" placement="bottom-start">
        <umb-popover-layout>
          <div class="panel">
            <div class="swatches">
              ${V13_ICON_COLORS.map(
                (swatch) => html`
                  <button
                    class="swatch ${swatch.color.toLowerCase() === color?.toLowerCase() ? "selected" : ""}"
                    title=${swatch.name}
                    aria-label=${swatch.name}
                    style="background: ${swatch.color}"
                    @click=${() => {
                      this.#setColor(swatch.color);
                      this.#closePopover();
                    }}></button>
                `,
              )}
            </div>
            <uui-input
              label="Colour"
              placeholder="#hex or any CSS colour"
              .value=${color ?? ""}
              @change=${(e: UUIInputEvent) => this.#setColor(String(e.target.value ?? "").trim())}>
            </uui-input>
            ${color
              ? html`<uui-button look="secondary" label="Remove colour" @click=${this.#clearColor}></uui-button>`
              : nothing}
            ${compositions.length
              ? html`<p class="note">
                  Colours this tab on every document type that uses ${compositions.join(", ")}.
                </p>`
              : nothing}
          </div>
        </umb-popover-layout>
      </uui-popover-container>
    `;
  }

  render() {
    const color = this.#color;
    if (this._locked) {
      return color ? html`<span class="dot" style="background: ${color}" title="Tab colour (locked)"></span>` : nothing;
    }
    return html`
      <button
        class="dot ${color ? "" : "empty"}"
        style=${color ? `background: ${color}` : ""}
        title="Tab colour"
        aria-label="Tab colour"
        popovertarget="popover"
        @click=${() => this.shadowRoot?.querySelector<UUIPopoverContainerElement>("#popover")?.togglePopover()}></button>
      ${this.#renderPopover(color)}
    `;
  }

  static styles = [
    css`
      :host {
        display: inline-flex;
        align-items: center;
      }

      .dot {
        width: 14px;
        height: 14px;
        padding: 0;
        border: 1px solid var(--uui-color-border-emphasis);
        border-radius: 50%;
        cursor: pointer;
      }

      span.dot {
        cursor: default;
      }

      .dot.empty {
        background: repeating-conic-gradient(var(--uui-color-border) 0 25%, transparent 0 50%) 50% / 6px 6px;
      }

      .panel {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-4);
        width: 220px;
        color: var(--uui-color-text);
        cursor: default;
      }

      .swatches {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: var(--uui-size-space-2);
      }

      .swatch {
        aspect-ratio: 1;
        padding: 0;
        border: none;
        border-radius: var(--uui-border-radius);
        cursor: pointer;
      }

      .swatch.selected {
        outline: 2px solid var(--uui-color-focus);
        outline-offset: 1px;
      }

      .note {
        margin: 0;
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
        font-style: italic;
        white-space: normal;
        text-align: left;
      }
    `,
  ];
}

export default TabColorSwatchElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-tab-color-swatch": TabColorSwatchElement;
  }
}
