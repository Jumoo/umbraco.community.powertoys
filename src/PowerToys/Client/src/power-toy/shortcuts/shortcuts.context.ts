import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { UmbArrayState } from "@umbraco-cms/backoffice/observable-api";
import { umbExtensionsRegistry } from "@umbraco-cms/backoffice/extension-registry";
import { UMB_MODAL_MANAGER_CONTEXT, UmbModalToken } from "@umbraco-cms/backoffice/modal";
import { UMB_CURRENT_USER_CONTEXT } from "@umbraco-cms/backoffice/current-user";
import { UMB_SECTION_PATH_PATTERN, type ManifestSection } from "@umbraco-cms/backoffice/section";
import { PowerToyEnabledController } from "../shared/power-toy-enabled.js";
import { UMB_POWER_TOYS_PANEL_CONTEXT, type PowerToysPanelContext } from "../shared/panel/panel.context.js";
import { UMB_POWER_TOY_CONTEXT } from "../power-toy.context.js";
import { isMac, SHORTCUTS_POWER_TOY_ALIAS, type ShortcutEntry } from "./constants.js";
import {
  isGlobal,
  keyOf,
  sameKeys,
  shortcutsIn,
  type CustomShortcut,
  type ShortcutsSettings,
} from "./settings/shortcuts-settings.js";

// Elements where typing should type, not trigger a shortcut
const TEXT_ENTRY = /^(input|textarea|select|uui-input|uui-textarea|umb-input-.*)$/i;

// Umbraco's own search modal. Its token isn't exported, so this one opens it by alias.
const SEARCH_MODAL = new UmbModalToken("Umb.Modal.Search");

/**
 * The Keyboard Shortcuts state for the whole backoffice:
 * - the shortcuts registered on the open workspaces (the topmost is the one that works);
 * - the custom shortcuts set up in the power toy's settings, running the global ones itself
 *   (the workspace ones are added to each workspace by the reporter workspace context);
 * - the "?" key that toggles the panel.
 */
export class ShortcutsContext extends UmbContextBase {
  #enabled = false;
  #panel?: PowerToysPanelContext;
  #allowedSections: string[] = [];
  #settings: ShortcutsSettings | null = null;

  // Open workspaces, oldest first, each with the shortcuts it registered
  #stack: Array<{ id: symbol; shortcuts: ShortcutEntry[] }> = [];

  #current = new UmbArrayState<ShortcutEntry>([], (s) => `${s.modifier}${s.shift}${s.alt}${s.key}`);
  public readonly current = this.#current.asObservable();

  #custom = new UmbArrayState<CustomShortcut>([], (s) => s.id);
  /** The custom shortcuts in use: the saved ones, or the section defaults. */
  public readonly custom = this.#custom.asObservable();
  public readonly globalCustom = this.#custom.asObservablePart((list) => list.filter((s) => isGlobal(s.action)));

  constructor(host: UmbControllerHost) {
    super(host, SHORTCUTS_CONTEXT);

    this.consumeContext(UMB_POWER_TOYS_PANEL_CONTEXT, (panel) => (this.#panel = panel));

    this.consumeContext(UMB_CURRENT_USER_CONTEXT, (context) => {
      if (!context) return;
      this.observe(context.allowedSections, (sections) => (this.#allowedSections = sections ?? []), "_allowedSections");
    });

    this.consumeContext(UMB_POWER_TOY_CONTEXT, (context) => {
      if (!context) return;
      this.observe(
        context.observeSettings<ShortcutsSettings>(SHORTCUTS_POWER_TOY_ALIAS),
        (settings) => {
          this.#settings = settings;
          this.#updateCustom();
        },
        "_settings"
      );
    });

    // The defaults follow the sections, which register as packages load
    this.observe(umbExtensionsRegistry.byType("section"), () => this.#updateCustom(), "_sections");

    new PowerToyEnabledController(this, SHORTCUTS_POWER_TOY_ALIAS, (enabled) => {
      this.#enabled = enabled;
      if (enabled) {
        window.addEventListener("keydown", this.#onKeyDown);
      } else {
        window.removeEventListener("keydown", this.#onKeyDown);
      }
    });
  }

  /** A workspace reports its shortcuts; call again whenever they change. */
  set(id: symbol, shortcuts: ShortcutEntry[]) {
    const entry = this.#stack.find((e) => e.id === id);
    if (entry) {
      entry.shortcuts = shortcuts;
    } else {
      this.#stack.push({ id, shortcuts });
    }
    this.#update();
  }

  /** A workspace closed. */
  remove(id: symbol) {
    this.#stack = this.#stack.filter((e) => e.id !== id);
    this.#update();
  }

  #update() {
    this.#current.setValue(this.#stack[this.#stack.length - 1]?.shortcuts ?? []);
  }

  #updateCustom() {
    this.#custom.setValue(shortcutsIn(this.#settings));
  }

  /** Runs a global custom shortcut's action. */
  async run(shortcut: CustomShortcut) {
    const action = shortcut.action;
    switch (action.type) {
      case "section": {
        if (!this.#allowedSections.includes(action.target)) return;
        const section = umbExtensionsRegistry.getByAlias(action.target) as ManifestSection | undefined;
        const pathname = section?.meta?.pathname;
        if (pathname) this.#navigate(UMB_SECTION_PATH_PATTERN.generateAbsolute({ sectionName: pathname }));
        return;
      }
      case "url":
        this.#openUrl(action.target);
        return;
      case "search": {
        const modalManager = await this.getContext(UMB_MODAL_MANAGER_CONTEXT);
        modalManager?.open(this, SEARCH_MODAL);
        return;
      }
      case "panel":
        this.#panel?.toggle(action.target);
        return;
    }
  }

  // An in-backoffice path navigates in place, the way the backoffice's own links do; a link
  // elsewhere opens in a new tab
  #openUrl(url: string) {
    const target = new URL(url, window.location.origin);
    if (target.origin === window.location.origin) {
      this.#navigate(target.pathname + target.search + target.hash);
    } else {
      window.open(target.href, "_blank", "noopener");
    }
  }

  #navigate(path: string) {
    window.history.pushState({}, "", path);
  }

  #onKeyDown = (e: KeyboardEvent) => {
    if (!this.#enabled || e.defaultPrevented) return;

    // Leave keys alone while someone is typing
    const target = e.composedPath()[0] as HTMLElement | undefined;
    if (target && (TEXT_ENTRY.test(target.tagName) || target.isContentEditable)) return;

    if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      this.#panel?.toggle("shortcuts");
      return;
    }

    const pressed = { key: keyOf(e), modifier: isMac ? e.metaKey : e.ctrlKey, shift: e.shiftKey, alt: e.altKey };
    if (!pressed.modifier && !pressed.alt) return;

    const shortcut = this.#custom.getValue().find((s) => isGlobal(s.action) && sameKeys(s, pressed));
    if (!shortcut) return;

    e.preventDefault();
    this.run(shortcut);
  };

  override destroy() {
    window.removeEventListener("keydown", this.#onKeyDown);
    super.destroy();
  }
}

export const SHORTCUTS_CONTEXT = new UmbContextToken<ShortcutsContext>("PowerToys.Context.Shortcuts");

export { ShortcutsContext as api };
export default ShortcutsContext;
