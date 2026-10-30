import { ICON_COLORS_ALIAS } from "./icon-colors.context.js";

export const manifests: Array<UmbExtensionManifest> = [
  // No js/element of its own - relies on the default box + meta.modal for its settings,
  // same shape as Theme Maker.
  {
    type: "powerToy",
    alias: ICON_COLORS_ALIAS,
    name: "Icon Colors Power Toy",
    // Dashboard order across all power toys - see navbar-clock/manifest.ts for the full list.
    // Sits between Theme Maker (100) and Logo Changer (50).
    weight: 75,
    meta: {
      label: "Icon Colors",
      description: "Add your own colours to the icon picker, or bring back the Umbraco 13 icon colours.",
      icon: "icon-colorpicker",
      modal: {
        element: () => import("./icon-colors-modal.element.js"),
        savable: true,
      },
    },
  },
  // Provided globally - the colours have to be in place wherever icons are drawn (trees,
  // headers, pickers), not just while the settings modal is open.
  {
    type: "globalContext",
    alias: "PowerToys.GlobalContext.IconColors",
    name: "Icon Colors Global Context",
    api: () => import("./icon-colors.context.js"),
  },
];
