import { TAB_COLORS_ALIAS } from "./tab-colors.context.js";

export const manifests: Array<UmbExtensionManifest> = [
  {
    type: "powerToy",
    alias: TAB_COLORS_ALIAS,
    name: "Tab Colors Power Toy",
    // Dashboard order across all power toys - see navbar-clock/manifest.ts for the full list.
    // Sits just after Icon Colors (75).
    weight: 70,
    meta: {
      label: "Tab Colors",
      description: "Give document type tabs their own icon and colour, picked right on the tab in the designer.",
      icon: "icon-tab",
      modal: {
        element: () => import("./tab-colors-modal.element.js"),
        savable: true,
      },
    },
  },
  {
    type: "globalContext",
    alias: "PowerToys.GlobalContext.TabColors",
    name: "Tab Colors Global Context",
    api: () => import("./tab-colors.context.js"),
  },
];
