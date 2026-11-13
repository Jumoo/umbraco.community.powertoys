import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { PowerToyEnabledController } from "../shared/power-toy-enabled.js";
import { RIGHT_CLICK_POWER_TOY_ALIAS } from "./constants.js";

const BUNDLE = "umb-entity-actions-bundle";

// The elements that carry an entity's "..." actions: tree and menu items, collection cards,
// refs and table rows, and the header above a section's sidebar menu.
const ITEM_HOSTS = new Set([
  "UUI-MENU-ITEM",
  "UMB-ENTITY-COLLECTION-ITEM-CARD",
  "UMB-ENTITY-COLLECTION-ITEM-REF",
  "UUI-TABLE-ROW",
]);

// Right-clicks here keep the browser's menu, so copy and paste still work
const TEXT_ENTRY = /^(input|textarea|select|uui-input|uui-textarea)$/i;

/**
 * Opens an item's entity actions ("...") menu when the item is right-clicked, the way the
 * backoffice trees worked before Umbraco 14. Shift + right-click keeps the browser's own menu.
 *
 * Umbraco has no API for opening an item's actions, so this finds the item's actions bundle
 * and clicks its "..." button, the same as the user would.
 */
export class RightClickContext extends UmbContextBase {
  constructor(host: UmbControllerHost) {
    super(host, RIGHT_CLICK_CONTEXT);

    new PowerToyEnabledController(this, RIGHT_CLICK_POWER_TOY_ALIAS, (enabled) => {
      if (enabled) {
        document.addEventListener("contextmenu", this.#onContextMenu);
      } else {
        document.removeEventListener("contextmenu", this.#onContextMenu);
      }
    });
  }

  override destroy() {
    document.removeEventListener("contextmenu", this.#onContextMenu);
    super.destroy();
  }

  #onContextMenu = (event: MouseEvent) => {
    if (event.shiftKey || event.defaultPrevented) return;

    const path = event.composedPath().filter((el): el is HTMLElement => el instanceof HTMLElement);

    for (const el of path) {
      // Inside an open actions menu, or typing in a field: leave the browser menu alone
      if (el.tagName === "UUI-POPOVER-CONTAINER" || TEXT_ENTRY.test(el.tagName)) return;

      const bundle = this.#bundleFor(el);
      if (bundle === undefined) continue;

      // The innermost item decides: one without a menu doesn't fall through to its parent's
      const button = bundle && this.#menuButton(bundle);
      if (!button) return;

      event.preventDefault();
      button.click();
      return;
    }
  };

  /**
   * The actions bundle of the item `el` is, `null` when it's an item without one, or
   * `undefined` when `el` isn't an item at all.
   */
  #bundleFor(el: HTMLElement): HTMLElement | null | undefined {
    if (ITEM_HOSTS.has(el.tagName)) {
      if (el.hasAttribute("disabled")) return null;
      if (el.tagName === "UUI-TABLE-ROW") return this.#tableRowBundle(el);
      return el.querySelector<HTMLElement>(`:scope > ${BUNDLE}`);
    }

    // The header above a section's sidebar menu, e.g. "Content"
    if (el.id === "header") {
      const host = (el.getRootNode() as ShadowRoot).host;
      if (host?.tagName === "UMB-SECTION-SIDEBAR-MENU-WITH-ENTITY-ACTIONS") {
        return el.querySelector<HTMLElement>(`:scope > ${BUNDLE}`);
      }
    }

    return undefined;
  }

  // Table views put the bundle inside a column view element in one of the row's cells
  #tableRowBundle(row: HTMLElement): HTMLElement | null {
    for (const cell of row.children) {
      for (const child of cell.children) {
        const bundle = child.shadowRoot?.querySelector<HTMLElement>(BUNDLE) ?? null;
        if (bundle) return bundle;
      }
    }
    return null;
  }

  /**
   * The "..." button of a bundle's actions menu. A bundle with a single action shows that
   * action as its own button instead of a menu, and there's nothing to open then.
   */
  #menuButton(bundle: HTMLElement): HTMLElement | null {
    const dropdown = bundle.shadowRoot
      ?.querySelector("umb-entity-actions-dropdown")
      ?.shadowRoot?.querySelector("umb-dropdown");
    return dropdown?.shadowRoot?.querySelector<HTMLElement>("#dropdown-button") ?? null;
  }
}

export const RIGHT_CLICK_CONTEXT = new UmbContextToken<RightClickContext>("PowerToys.Context.RightClick");

export { RightClickContext as api };
export default RightClickContext;
