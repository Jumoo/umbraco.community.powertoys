import { html, nothing } from "@umbraco-cms/backoffice/external/lit";
import { encodeFolderName } from "@umbraco-cms/backoffice/router";
import type { UmbPropertyTypeContainerMergedModel } from "@umbraco-cms/backoffice/content-type";
import type { TabStyle } from "./tab-icons-settings.js";
import "./tab-style-button.element.js";

// There's no extension point for tabs in v17, and the elements that draw them aren't exported,
// so this wraps their updated() on the registered class and styles the tabs after each render.
// It leans on internals (the tag names, each element's _tabs state, the data attributes on each
// uui-tab) - if any of them go missing, painting just does nothing.
//
// - umb-content-workspace-view-edit: the "contentEditor" workspace view kind, shared by the
//   document, media, blueprint and member editors. Its tabs carry data-mark="content-tab:tab/<name>"
//   but no id, so ids come from the element's _tabs (the merged tab models).
// - umb-content-type-design-editor: the doc type designer. Its tabs carry
//   data-umb-tab-id (ownerId ?? ids[0]); the merged models are in its _tabs too.
const CONTENT_EDITOR_TAG = "umb-content-workspace-view-edit";
const DESIGN_EDITOR_TAG = "umb-content-type-design-editor";
const PATCHED = Symbol.for("PowerToys.TabIcons.Patched");
const PATCHED_INNER = Symbol.for("PowerToys.TabIcons.PatchedInner");
const STYLED = "data-powertoys-tab-color";
const ICON_LABEL = "data-powertoys-tab-icon";

const PROPERTIES = [
  "--uui-tab-text",
  "--uui-tab-text-hover",
  "--uui-tab-text-active",
  // The bar under the active tab, and its hover state.
  "--uui-color-current",
  "--uui-color-current-emphasis",
];

type PatchedElement = HTMLElement & {
  _tabs?: Array<UmbPropertyTypeContainerMergedModel>;
  _sortModeActive?: boolean;
  requestUpdate(): void;
};

type RenderTabInner = (tab: UmbPropertyTypeContainerMergedModel, tabActive: boolean, ownedTab: boolean) => unknown;

let styles = new Map<string, TabStyle>();
let enabled = false;
const live = new Set<PatchedElement>();

/**
 * Swaps the style map (container id -> resolved colour and icon) and repaints every editor on
 * screen. `on` is whether the power toy is switched on, which decides whether the designer
 * shows its picker.
 */
export function setTabStyles(next: Map<string, TabStyle>, on: boolean) {
  styles = next;
  enabled = on;
  live.forEach((element) => {
    if (!element.isConnected) {
      live.delete(element);
      return;
    }
    // The designer draws icons and its picker in its own render, so it needs a re-render;
    // updated() then repaints the colours. The content editor is painted straight away.
    if (element.localName === DESIGN_EDITOR_TAG) element.requestUpdate();
    else paint(element);
  });
}

/**
 * A tab merged from compositions has one id per content type that defines it. The doc type's
 * own tab wins, then whichever composition has a style - so a composition's style shows on
 * every doc type using it, and each can still override it.
 */
export function styleFor(model: UmbPropertyTypeContainerMergedModel, map: Map<string, TabStyle> = styles) {
  if (model.ownerId && map.has(model.ownerId)) return map.get(model.ownerId);
  return model.ids.map((id) => map.get(id)).find(Boolean);
}

export function installTabIconsPatch() {
  patch(CONTENT_EDITOR_TAG);
  patch(DESIGN_EDITOR_TAG);
  patchDesignerTabInner();
}

// The designer's renderTabInner() is a public method (unlike everything in the content editor),
// so the icon and picker go in through that, around whatever Umbraco renders for the tab. Lit
// composes the templates, no DOM poking needed. The picker is only on the active tab, and
// neither is added in sort mode, where the tab shows a drag handle and sort order box instead.
function patchDesignerTabInner() {
  customElements.whenDefined(DESIGN_EDITOR_TAG).then((ctor) => {
    const proto = ctor.prototype as Record<string | symbol, unknown>;
    if (proto[PATCHED_INNER]) return;
    const original = proto.renderTabInner as RenderTabInner | undefined;
    if (typeof original !== "function") {
      console.warn(`Power Toys: ${DESIGN_EDITOR_TAG} has no renderTabInner(), so Tab Icons can't add its picker.`);
      return;
    }
    proto.renderTabInner = function (
      this: PatchedElement,
      tab: UmbPropertyTypeContainerMergedModel,
      tabActive: boolean,
      ownedTab: boolean,
    ) {
      const inner = original.call(this, tab, tabActive, ownedTab);
      if (!enabled || this._sortModeActive) return inner;
      const icon = styleFor(tab)?.icon;
      const picker = tabActive;
      if (!icon && !picker) return inner;
      // An owned active tab renders .tab-inner (the name box), which pulls itself right with a
      // negative margin - push the button back out by the same amount so it doesn't overlap.
      return html`<div style="display: flex; align-items: center; gap: var(--uui-size-space-2)">
        ${icon ? html`<umb-icon name=${icon}></umb-icon>` : nothing}${inner}${picker
          ? html`<power-toys-tab-style-button
              .tab=${tab}
              style=${ownedTab ? "margin-left: var(--uui-size-space-3)" : ""}></power-toys-tab-style-button>`
          : nothing}
      </div>`;
    };
    proto[PATCHED_INNER] = true;
  });
}

// Both elements are lazy-loaded, so wait for them to be defined rather than expecting them now.
function patch(tag: string) {
  customElements.whenDefined(tag).then((ctor) => {
    const proto = ctor.prototype as Record<string | symbol, unknown>;
    if (proto[PATCHED]) return;
    const original = proto.updated as ((changed: unknown) => void) | undefined;
    if (typeof original !== "function") {
      console.warn(`Power Toys: ${tag} has no updated() to hook, so Tab Icons can't apply.`);
      return;
    }
    proto.updated = function (this: PatchedElement, changed: unknown) {
      original.call(this, changed);
      live.add(this);
      paint(this);
    };
    proto[PATCHED] = true;
  });
}

function paint(element: PatchedElement) {
  const root = element.shadowRoot;
  const models = element._tabs;
  if (!root || !Array.isArray(models)) return;

  if (element.localName === CONTENT_EDITOR_TAG) {
    const tabsByMark = new Map<string, HTMLElement>();
    root.querySelectorAll<HTMLElement>('uui-tab[data-mark^="content-tab:tab/"]').forEach((tab) => {
      tabsByMark.set(tab.dataset.mark ?? "", tab);
    });
    models.forEach((model) => {
      const tab = tabsByMark.get(`content-tab:tab/${encodeFolderName(model.name ?? "")}`);
      if (!tab) return;
      const style = styleFor(model);
      applyColor(tab, style?.color);
      applyIconLabel(tab, style?.icon);
    });
  } else {
    const tabsById = new Map<string, HTMLElement>();
    root.querySelectorAll<HTMLElement>("uui-tab[data-umb-tab-id]").forEach((tab) => {
      tabsById.set(tab.dataset.umbTabId ?? "", tab);
    });
    models.forEach((model) => {
      const tab = tabsById.get(model.ownerId ?? model.ids[0]);
      if (tab) applyColor(tab, styleFor(model)?.color);
    });
  }
}

function applyColor(tab: HTMLElement, color: string | undefined) {
  if (color) {
    PROPERTIES.forEach((property) => tab.style.setProperty(property, color));
    tab.setAttribute(STYLED, "");
  } else if (tab.hasAttribute(STYLED)) {
    PROPERTIES.forEach((property) => tab.style.removeProperty(property));
    tab.removeAttribute(STYLED);
  }
}

// uui-tab's own icon slot stacks the icon above the name, which would make the tab bar taller.
// Instead this fills the tab's default slot with icon + name in a row: uui-tab only draws its
// label attribute while that slot is empty, so the name has to come along. The span is appended
// after Lit's own content in the tab (the validation badge, in the "extra" slot), so Lit leaves
// it alone on re-render.
function applyIconLabel(tab: HTMLElement, icon: string | undefined) {
  let label = tab.querySelector<HTMLElement>(`:scope > [${ICON_LABEL}]`);
  if (!icon) {
    label?.remove();
    return;
  }
  if (!label) {
    label = document.createElement("span");
    label.setAttribute(ICON_LABEL, "");
    label.style.cssText = "display: inline-flex; align-items: center; gap: var(--uui-size-space-2);";
    label.append(document.createElement("umb-icon"), document.createElement("span"));
    tab.append(label);
  }
  const [iconElement, text] = [label.children[0] as HTMLElement & { name?: string }, label.children[1]];
  if (iconElement.name !== icon) iconElement.name = icon;
  text.textContent = tab.getAttribute("label") ?? "";
}
