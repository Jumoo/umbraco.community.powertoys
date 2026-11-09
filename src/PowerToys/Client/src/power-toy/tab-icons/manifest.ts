import { TAB_ICONS_ALIAS } from "./tab-icons.context.js";

export const manifests: Array<UmbExtensionManifest> = [
  {
    type: "powerToy",
    alias: TAB_ICONS_ALIAS,
    name: "Tab Icons Power Toy",
    // Dashboard order across all power toys - see navbar-clock/manifest.ts for the full list.
    // Sits just after Icon Colors (75).
    weight: 70,
    meta: {
      label: "Tab Icons",
      description: "Give document type tabs their own icon and colour, picked right on the tab in the designer.",
      icon: "icon-tab",
      modal: {
        element: () => import("./tab-icons-modal.element.js"),
        savable: true,
      },
    },
  },
  {
    type: "globalContext",
    alias: "PowerToys.GlobalContext.TabIcons",
    name: "Tab Icons Global Context",
    api: () => import("./tab-icons.context.js"),
  },
];
