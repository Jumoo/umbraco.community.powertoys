import { HELP_MENU_EDITOR_ALIAS } from "./help-menu-editor.context.js";

export const manifests: Array<UmbExtensionManifest> = [
  // No js/element of its own - relies on the default box + meta.modal for its settings,
  // same shape as Dashboard Manager and Login Customizer.
  {
    type: "powerToy",
    alias: HELP_MENU_EDITOR_ALIAS,
    name: "Help Menu Editor Power Toy",
    meta: {
      label: "Help Menu Editor",
      description: "Hide built-in help menu links, add your own, or disable the help menu completely.",
      icon: "icon-help",
      modal: {
        element: () => import("./help-menu-editor-modal.element.js"),
        savable: true,
        size: "medium",
      },
    },
  },
  // Provided globally - it needs to react to help menu item manifests as soon as they're
  // registered, not just while the editor's own modal happens to be open.
  {
    type: "globalContext",
    alias: "PowerToys.GlobalContext.HelpMenuEditor",
    name: "Help Menu Editor Global Context",
    api: () => import("./help-menu-editor.context.js"),
  },
  // The "Add link" sidebar opened from the settings modal.
  {
    type: "modal",
    alias: "PowerToys.Modal.HelpMenuEditor.AddLink",
    name: "Help Menu Editor Add Link Modal",
    element: () => import("./help-menu-add-link-modal.element.js"),
  },
];
