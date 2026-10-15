export const SHORTCUTS_POWER_TOY_ALIAS = "PowerToys.PowerToy.KeyboardShortcuts";

/** A key combination, shaped like Umbraco's UmbShortcut minus its action. */
export interface ShortcutKeys {
  key: string;
  modifier?: boolean;
  shift?: boolean;
  alt?: boolean;
}

/** A shortcut to show: its keys and what it does (a "#key" label is localised when shown). */
export interface ShortcutEntry extends ShortcutKeys {
  label: string;
}

// The common keys Umbraco handles in its own components rather than through the shortcut
// registry, so they can't be read at runtime. Labels are localisation keys.
export const FIXED_SHORTCUTS: Array<{ group: string; shortcuts: ShortcutEntry[] }> = [
  {
    group: "#powerToysShortcuts_groupBackoffice",
    shortcuts: [
      { key: "?", label: "#powerToysShortcuts_showShortcuts" },
      { key: "Escape", label: "#powerToysShortcuts_closeDialog" },
    ],
  },
  {
    group: "#powerToysShortcuts_groupSearch",
    shortcuts: [
      { key: "ArrowDown", label: "#powerToysShortcuts_nextResult" },
      { key: "ArrowUp", label: "#powerToysShortcuts_previousResult" },
      { key: "Enter", label: "#powerToysShortcuts_openResult" },
    ],
  },
  {
    group: "#powerToysShortcuts_groupRichText",
    shortcuts: [
      { key: "b", modifier: true, label: "#powerToysShortcuts_bold" },
      { key: "i", modifier: true, label: "#powerToysShortcuts_italic" },
      { key: "u", modifier: true, label: "#powerToysShortcuts_underline" },
      { key: "z", modifier: true, label: "#powerToysShortcuts_undo" },
      { key: "z", modifier: true, shift: true, label: "#powerToysShortcuts_redo" },
    ],
  },
];

// Matches how Umbraco's UmbShortcutController picks the modifier: Cmd on a Mac, Ctrl elsewhere
export const isMac = navigator.userAgent ? /Mac/i.test(navigator.userAgent) : navigator.platform.toUpperCase().includes("MAC");

const KEY_NAMES: Record<string, string> = {
  arrowdown: "↓",
  arrowup: "↑",
  arrowleft: "←",
  arrowright: "→",
  escape: "Esc",
  enter: "Enter",
  " ": "Space",
};

/** The keys to press, in order, e.g. ["Ctrl", "Shift", "Z"]. */
export function keysOf(shortcut: ShortcutKeys): string[] {
  const keys: string[] = [];
  if (shortcut.modifier) keys.push(isMac ? "⌘" : "Ctrl");
  if (shortcut.alt) keys.push(isMac ? "⌥" : "Alt");
  if (shortcut.shift) keys.push(isMac ? "⇧" : "Shift");
  const key = shortcut.key;
  keys.push(KEY_NAMES[key.toLowerCase()] ?? (key.length === 1 ? key.toUpperCase() : key));
  return keys;
}
