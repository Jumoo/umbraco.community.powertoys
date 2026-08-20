export const manifests: Array<UmbExtensionManifest> = [
  // Provided globally so any extension (not just power toys themselves) can consume it,
  // e.g. the PowerToyEnabled condition below, or a header app gated by that condition.
  {
    type: "globalContext",
    alias: "PowerToys.GlobalContext.PowerToy",
    name: "Power Toy Global Context",
    api: () => import("./power-toy.context.js"),
  },
  // Lets any manifest gate on a power toy's enabled state via `conditions`, e.g.:
  // { alias: "PowerToys.Condition.PowerToyEnabled", match: "PowerToys.PowerToy.NavbarClock" }
  {
    type: "condition",
    alias: "PowerToys.Condition.PowerToyEnabled",
    name: "Power Toy Enabled Condition",
    api: () => import("./power-toy-enabled.condition.js"),
  },
  // The one shared modal every default power toy box can open, keyed by the alias
  // POWER_TOY_MODAL points at. See power-toy-modal.token.ts / power-toy-modal.element.ts.
  {
    type: "modal",
    alias: "PowerToys.Modal.PowerToy",
    name: "Power Toy Modal",
    element: () => import("./power-toy-modal.element.js"),
  },
];
