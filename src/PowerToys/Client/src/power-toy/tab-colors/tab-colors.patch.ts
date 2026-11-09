import { html } from "@umbraco-cms/backoffice/external/lit";
import { encodeFolderName } from "@umbraco-cms/backoffice/router";
import type { UmbPropertyTypeContainerMergedModel } from "@umbraco-cms/backoffice/content-type";
import "./tab-color-swatch.element.js";

// There's no extension point for tabs in v17, and the elements that draw them aren't exported,
// so this wraps their updated() on the registered class and colours the tabs after each render.
// It leans on internals (the tag names, the content editor's _tabs state, the data attributes
// on each uui-tab) - if any of them go missing, painting just does nothing.
//
// - umb-content-workspace-view-edit: the "contentEditor" workspace view kind, shared by the
//   document, media, blueprint and member editors. Its tabs carry data-mark="content-tab:tab/<name>"
//   but no id, so ids come from the element's _tabs (the merged tab models).
// - umb-content-type-design-editor: the doc type designer. Its tabs carry data-umb-tab-id.
const CONTENT_EDITOR_TAG = "umb-content-workspace-view-edit";
const DESIGN_EDITOR_TAG = "umb-content-type-design-editor";
const PATCHED = Symbol.for("PowerToys.TabColors.Patched");
const PATCHED_INNER = Symbol.for("PowerToys.TabColors.PatchedInner");
const STYLED = "data-powertoys-tab-color";

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

let colors = new Map<string, string>();
let enabled = false;
const live = new Set<PatchedElement>();

/**
 * Swaps the colour map (container id -> colour) and repaints every editor on screen. `on` is
 * whether the power toy is switched on, which decides whether the designer shows its picker.
 */
export function setTabColors(next: Map<string, string>, on: boolean) {
  colors = next;
  const toggled = enabled !== on;
  enabled = on;
  live.forEach((element) => {
    if (!element.isConnected) {
      live.delete(element);
      return;
    }
    // The designer's picker is part of its render, so switching on or off needs a re-render.
    if (toggled && element.localName === DESIGN_EDITOR_TAG) element.requestUpdate();
    paint(element);
  });
}

export function installTabColorsPatch() {
  patch(CONTENT_EDITOR_TAG);
  patch(DESIGN_EDITOR_TAG);
  patchDesignerTabInner();
}

// The designer's renderTabInner() is a public method (unlike everything in the content editor),
// so the colour picker goes in through that: whatever Umbraco renders for the active tab, with a
// swatch next to it. Lit composes the two templates, no DOM poking needed. Left out in sort mode,
// where the tab shows a drag handle and sort order box instead.
function patchDesignerTabInner() {
  customElements.whenDefined(DESIGN_EDITOR_TAG).then((ctor) => {
    const proto = ctor.prototype as Record<string | symbol, unknown>;
    if (proto[PATCHED_INNER]) return;
    const original = proto.renderTabInner as RenderTabInner | undefined;
    if (typeof original !== "function") {
      console.warn(`Power Toys: ${DESIGN_EDITOR_TAG} has no renderTabInner(), so Tab Colors can't add its picker.`);
      return;
    }
    proto.renderTabInner = function (
      this: PatchedElement,
      tab: UmbPropertyTypeContainerMergedModel,
      tabActive: boolean,
      ownedTab: boolean,
    ) {
      const inner = original.call(this, tab, tabActive, ownedTab);
      if (!enabled || !tabActive || this._sortModeActive) return inner;
      // An owned active tab renders .tab-inner (the name box), which pulls itself right with a
      // negative margin - push the swatch back out by the same amount so it doesn't overlap.
      return html`<div style="display: flex; align-items: center; gap: var(--uui-size-space-2)">
        ${inner}<power-toys-tab-color-swatch
          .tab=${tab}
          style=${ownedTab ? "margin-left: var(--uui-size-space-3)" : ""}></power-toys-tab-color-swatch>
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
      console.warn(`Power Toys: ${tag} has no updated() to hook, so Tab Colors can't apply.`);
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
  if (!root) return;
  if (element.localName === CONTENT_EDITOR_TAG) {
    paintContentEditor(element, root);
  } else {
    root.querySelectorAll<HTMLElement>("uui-tab[data-umb-tab-id]").forEach((tab) => {
      applyColor(tab, colors.get(tab.dataset.umbTabId ?? ""));
    });
  }
}

function paintContentEditor(element: PatchedElement, root: ShadowRoot) {
  const models = element._tabs;
  if (!Array.isArray(models)) return;

  const tabsByMark = new Map<string, HTMLElement>();
  root.querySelectorAll<HTMLElement>('uui-tab[data-mark^="content-tab:tab/"]').forEach((tab) => {
    tabsByMark.set(tab.dataset.mark ?? "", tab);
  });

  models.forEach((model) => {
    const tab = tabsByMark.get(`content-tab:tab/${encodeFolderName(model.name ?? "")}`);
    if (tab) applyColor(tab, colorFor(model));
  });
}

// A tab merged from compositions has one id per content type that defines it. The doc type's
// own tab wins, then whichever composition has a colour - so a composition's colour shows on
// every doc type using it, and each can still override it.
function colorFor(model: UmbPropertyTypeContainerMergedModel): string | undefined {
  if (model.ownerId && colors.has(model.ownerId)) return colors.get(model.ownerId);
  return model.ids.map((id) => colors.get(id)).find(Boolean);
}

function applyColor(tab: HTMLElement, color: string | undefined) {
  if (color && CSS.supports("color", color)) {
    PROPERTIES.forEach((property) => tab.style.setProperty(property, color));
    tab.setAttribute(STYLED, "");
  } else if (tab.hasAttribute(STYLED)) {
    PROPERTIES.forEach((property) => tab.style.removeProperty(property));
    tab.removeAttribute(STYLED);
  }
}
