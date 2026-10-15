import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { CustomShortcut } from "./shortcuts-settings.js";

export interface ShortcutEditorModalData {
  /** The other shortcuts in the list, to warn when the keys are already taken. */
  others: CustomShortcut[];
}

// A sidebar of its own for adding or editing one shortcut, opened over the settings, so the
// form is always in view. Opened empty to add, or with `value` set to edit.
export const SHORTCUT_EDITOR_MODAL = new UmbModalToken<ShortcutEditorModalData, CustomShortcut>(
  "PowerToys.Modal.KeyboardShortcuts.Editor",
  {
    modal: {
      type: "sidebar",
      size: "small",
    },
  }
);
