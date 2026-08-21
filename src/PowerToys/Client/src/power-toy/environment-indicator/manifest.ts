import { ENVIRONMENT_INDICATOR_ALIAS } from "./environment-indicator.context.js";

export const manifests: Array<UmbExtensionManifest> = [
  // Loaded into the shared power-toys-modal - same shape as Help Menu Editor and Dashboard
  // Manager: no js/element of its own, relies on the default box + meta.modal for settings.
  {
    type: "powerToy",
    alias: ENVIRONMENT_INDICATOR_ALIAS,
    name: "Environment Indicator Power Toy",
    meta: {
      label: "Environment Indicator",
      description: "Colour the backoffice header (and optionally label it) by matching the current URL against a list of environments.",
      icon: "icon-height",
      modal: {
        element: () => import("./environment-indicator-modal.element.js"),
        savable: true,
        size: "medium",
      },
    },
  },
  // Provided globally - the header colour needs to be set as soon as the backoffice loads,
  // not only while the settings modal happens to be open.
  {
    type: "globalContext",
    alias: "PowerToys.GlobalContext.EnvironmentIndicator",
    name: "Environment Indicator Global Context",
    api: () => import("./environment-indicator.context.js"),
  },
  // Optional name label, shown in the same header slot as the navbar clock - only rendered
  // while the power toy is enabled, gated the same way as the clock's header app.
  {
    type: "headerApp",
    alias: "PowerToys.HeaderApp.EnvironmentIndicator",
    name: "Environment Indicator Header App",
    element: () => import("./environment-indicator.header-app.element.js"),
    conditions: [
      {
        alias: "PowerToys.Condition.PowerToyEnabled",
        match: ENVIRONMENT_INDICATOR_ALIAS,
      },
    ],
  },
  // The "Add/Edit environment" sidebar opened from the settings modal.
  {
    type: "modal",
    alias: "PowerToys.Modal.EnvironmentIndicator.AddEdit",
    name: "Environment Indicator Add/Edit Modal",
    element: () => import("./environment-add-edit-modal.element.js"),
  },
];
