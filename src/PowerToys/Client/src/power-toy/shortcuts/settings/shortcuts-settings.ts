import { umbExtensionsRegistry } from "@umbraco-cms/backoffice/extension-registry";
import type { ManifestSection } from "@umbraco-cms/backoffice/section";
import type { PowerToysPanelName } from "../../shared/panel/panel.context.js";
import type { ShortcutKeys } from "../constants.js";

/** What a custom shortcut does. */
export type CustomShortcutAction =
  | { type: "section"; target: string } // section alias
  | { type: "url"; target: string } // backoffice path, or a full URL
  | { type: "search"; target?: undefined }
  | { type: "panel"; target: PowerToysPanelName }
  | { type: "workspaceAction"; target: string } // workspaceAction manifest alias
  | { type: "entityAction"; target: string }; // entityAction manifest alias

export type CustomShortcutActionType = CustomShortcutAction["type"];

export const ACTION_TYPES: CustomShortcutActionType[] = ["section", "url", "search", "panel", "workspaceAction", "entityAction"];

export interface CustomShortcut extends ShortcutKeys {
  id: string;
  action: CustomShortcutAction;
  /** Shown in the panel; when empty, the target's own label is used. */
  label?: string;
}

// Matches the Keyboard Shortcuts power toy's settings blob. `shortcuts` is undefined until
// someone saves the settings, and the section defaults apply until then.
export interface ShortcutsSettings {
  shortcuts?: CustomShortcut[];
}

/** Section, URL, search and panel shortcuts work anywhere; the others only in a workspace. */
export const isGlobal = (action: CustomShortcutAction) =>
  action.type === "section" || action.type === "url" || action.type === "search" || action.type === "panel";

/** The sections in header order: heaviest first, as the header lists them. */
export function sectionsInOrder(): ManifestSection[] {
  return [...umbExtensionsRegistry.getByType("section")]
    .map((m) => m as unknown as ManifestSection)
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
}

/** Alt+1 to Alt+9 for the first nine sections in header order. */
export function defaultShortcuts(): CustomShortcut[] {
  return sectionsInOrder()
    .slice(0, 9)
    .map((section, i) => ({
      id: `default-section-${section.alias}`,
      key: String(i + 1),
      alt: true,
      action: { type: "section", target: section.alias },
    }));
}

/** The shortcuts in use: the saved ones, or the defaults until the settings are saved. */
export function shortcutsIn(settings: ShortcutsSettings | null | undefined): CustomShortcut[] {
  return settings?.shortcuts ?? defaultShortcuts();
}

/**
 * The key a keyboard event stands for, as shortcuts store it. Letters and digits come from the
 * physical key, because Alt (Option on a Mac) changes the character typed (Option+1 is "¡").
 */
export function keyOf(e: KeyboardEvent): string {
  if (e.code.startsWith("Key")) return e.code.substring(3).toLowerCase();
  if (e.code.startsWith("Digit")) return e.code.substring(5);
  return e.key.toLowerCase();
}

export const sameKeys = (a: ShortcutKeys, b: ShortcutKeys) =>
  a.key.toLowerCase() === b.key.toLowerCase() && !!a.modifier === !!b.modifier && !!a.shift === !!b.shift && !!a.alt === !!b.alt;
