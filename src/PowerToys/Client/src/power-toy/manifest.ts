// The one shared modal every default power toy box can open, keyed by the alias
// POWER_TOY_MODAL points at. See power-toy-modal.token.ts / power-toy-modal.element.ts.
export const manifests: Array<UmbExtensionManifest> = [
  {
    type: "modal",
    alias: "PowerToys.Modal.PowerToy",
    name: "Power Toy Modal",
    element: () => import("./power-toy-modal.element.js"),
  },
];
