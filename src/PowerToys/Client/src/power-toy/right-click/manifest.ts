import { RIGHT_CLICK_POWER_TOY_ALIAS } from "./constants.js";

export const manifests: Array<UmbExtensionManifest> = [
  // No settings: the default box with only the on/off switch
  {
    type: "powerToy",
    alias: RIGHT_CLICK_POWER_TOY_ALIAS,
    name: "Right-Click Actions Power Toy",
    // After Keyboard Shortcuts (3), at the end of the dashboard
    weight: 2,
    meta: {
      label: "Right-Click Actions",
      description:
        "Right-click a tree item, or an item in a collection, to open its actions menu. Shift + right-click still opens the browser's menu.",
      icon: "icon-mouse-cursor",
    },
  },
  // Always registered: it adds the right-click listener only while the power toy is on
  {
    type: "globalContext",
    alias: "PowerToys.GlobalContext.RightClick",
    name: "Right-Click Actions Global Context",
    api: () => import("./right-click.context.js"),
  },
];
