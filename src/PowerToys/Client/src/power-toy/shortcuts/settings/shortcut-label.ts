import { umbExtensionsRegistry } from "@umbraco-cms/backoffice/extension-registry";
import type { CustomShortcut } from "./shortcuts-settings.js";

type Labelled = { name?: string; meta?: { label?: string } };

/**
 * What a custom shortcut does, as a label (it may be a "#key" for localize.string): the label
 * someone gave it, or one made from its target.
 */
export function customShortcutLabel(shortcut: CustomShortcut): string {
  if (shortcut.label) return shortcut.label;

  const action = shortcut.action;
  switch (action.type) {
    case "search":
      return "#powerToysShortcuts_actionSearch";
    case "panel":
      return `#powerToysShortcuts_panel_${action.target}`;
    case "url":
      return action.target;
    default: {
      const manifest = umbExtensionsRegistry.getByAlias(action.target) as Labelled | undefined;
      return manifest?.meta?.label || manifest?.name || action.target;
    }
  }
}
