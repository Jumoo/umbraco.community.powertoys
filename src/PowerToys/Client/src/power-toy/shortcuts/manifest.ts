import { SHORTCUTS_POWER_TOY_ALIAS } from "./constants.js";

const enabled = { alias: "PowerToys.Condition.PowerToyEnabled", match: SHORTCUTS_POWER_TOY_ALIAS };

export const manifests: Array<UmbExtensionManifest> = [
  {
    type: "powerToy",
    alias: SHORTCUTS_POWER_TOY_ALIAS,
    name: "Keyboard Shortcuts Power Toy",
    // After Tasks (5), at the end of the dashboard
    weight: 3,
    meta: {
      label: "Keyboard Shortcuts",
      description: "Press ? or use the header button to see the keyboard shortcuts that work on the screen you're on.",
      icon: "icon-keyboard",
      modal: {
        element: () => import("./settings/shortcuts-settings-modal.element.js"),
        savable: true,
        size: "medium",
      },
    },
  },
  // Always registered: it collects shortcuts as workspaces open, and only listens for "?"
  // while the power toy is on
  {
    type: "globalContext",
    alias: "PowerToys.Shortcuts.Context",
    name: "Keyboard Shortcuts Context",
    api: () => import("./shortcuts.context.js"),
  },
  // Reports each workspace's shortcuts as it opens
  {
    type: "workspaceContext",
    alias: "PowerToys.Shortcuts.WorkspaceContext.Reporter",
    name: "Keyboard Shortcuts Reporter Workspace Context",
    api: () => import("./workspace/shortcuts-reporter.workspace-context.js"),
    conditions: [enabled],
  },
  {
    type: "headerApp",
    alias: "PowerToys.Shortcuts.HeaderApp",
    name: "Keyboard Shortcuts Header App",
    element: () => import("./header/shortcuts-header.element.js"),
    weight: 17,
    meta: {
      label: "#powerToysShortcuts_title",
      icon: "icon-keyboard",
      path: "shortcuts",
    },
    conditions: [enabled],
  },
  // The sidebar for adding or editing one custom shortcut, opened from the settings
  {
    type: "modal",
    alias: "PowerToys.Modal.KeyboardShortcuts.Editor",
    name: "Keyboard Shortcuts Editor Modal",
    element: () => import("./settings/shortcut-editor-modal.element.js"),
  },
  {
    type: "localization",
    alias: "PowerToys.Shortcuts.Localization.EnUs",
    name: "Keyboard Shortcuts English (US) Localization",
    weight: 0,
    meta: {
      culture: "en-us",
    },
    js: () => import("./localization/en-us.js"),
  },
];
