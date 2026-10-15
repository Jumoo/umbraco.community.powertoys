import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { UmbArrayState } from "@umbraco-cms/backoffice/observable-api";
import { PowerToyEnabledController } from "../shared/power-toy-enabled.js";
import { UMB_POWER_TOYS_PANEL_CONTEXT, type PowerToysPanelContext } from "../shared/panel/panel.context.js";
import { SHORTCUTS_POWER_TOY_ALIAS, type ShortcutEntry } from "./constants.js";

// Elements where typing "?" means a question mark, not "show the shortcuts"
const TEXT_ENTRY = /^(input|textarea|select|uui-input|uui-textarea|umb-input-.*)$/i;

/**
 * The shortcuts registered on the workspaces open right now, and the "?" key that shows them.
 * Workspaces report their shortcuts as they open and close; a workspace opened over another
 * (in a modal) is on top, and its shortcuts are the ones that work, so those are shown.
 */
export class ShortcutsContext extends UmbContextBase {
  #enabled = false;
  #panel?: PowerToysPanelContext;

  // Open workspaces, oldest first, each with the shortcuts it registered
  #stack: Array<{ id: symbol; shortcuts: ShortcutEntry[] }> = [];

  #current = new UmbArrayState<ShortcutEntry>([], (s) => `${s.modifier}${s.shift}${s.alt}${s.key}`);
  public readonly current = this.#current.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, SHORTCUTS_CONTEXT);

    this.consumeContext(UMB_POWER_TOYS_PANEL_CONTEXT, (panel) => (this.#panel = panel));

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

  #onKeyDown = (e: KeyboardEvent) => {
    if (!this.#enabled || e.key !== "?" || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;

    // Leave "?" alone while someone is typing
    const target = e.composedPath()[0] as HTMLElement | undefined;
    if (target && (TEXT_ENTRY.test(target.tagName) || target.isContentEditable)) return;

    e.preventDefault();
    this.#panel?.toggle("shortcuts");
  };

  override destroy() {
    window.removeEventListener("keydown", this.#onKeyDown);
    super.destroy();
  }
}

export const SHORTCUTS_CONTEXT = new UmbContextToken<ShortcutsContext>("PowerToys.Context.Shortcuts");

export { ShortcutsContext as api };
export default ShortcutsContext;
