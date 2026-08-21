import { THEME_MAKER_ALIAS } from "./theme-maker.context.js";
import { manifests as themePacks } from "./theme-packs.js";

export const manifests: Array<UmbExtensionManifest> = [
  ...themePacks,
  // No js/element of its own - relies on the default box + meta.modal for its settings,
  // same shape as Help Menu Editor and Dashboard Manager.
  {
    type: "powerToy",
    alias: THEME_MAKER_ALIAS,
    name: "Theme Maker Power Toy",
    // Dashboard order across all power toys - see navbar-clock/manifest.ts for the full list.
    weight: 100,
    meta: {
      label: "Theme Maker",
      description: "List installed backoffice themes and add your own custom themes.",
      icon: "icon-palette",
      modal: {
        element: () => import("./theme-maker-modal.element.js"),
        savable: true,
        size: "medium",
      },
    },
  },
  // Provided globally - it needs to react to theme manifests as soon as they're registered,
  // not just while the settings modal happens to be open.
  {
    type: "globalContext",
    alias: "PowerToys.GlobalContext.ThemeMaker",
    name: "Theme Maker Global Context",
    api: () => import("./theme-maker.context.js"),
  },
  // The colour-editing sidebar opened from the settings modal, for both adding and editing a
  // custom theme.
  {
    type: "modal",
    alias: "PowerToys.Modal.ThemeMaker.Editor",
    name: "Theme Maker Editor Modal",
    element: () => import("./theme-maker-editor-modal.element.js"),
  },
];
