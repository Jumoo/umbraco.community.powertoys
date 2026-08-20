import type { ManifestPowerToy } from "../power-toy.extension.js";

export const manifests: Array<ManifestPowerToy> = [
  {
    type: "powerToy",
    alias: "PowerToys.PowerToy.Example",
    name: "Example Power Toy",
    // No js/element declared - this power toy relies entirely on the default box,
    // and meta.modal for what happens when it's clicked.
    meta: {
      label: "Example",
      description: "A placeholder power toy, registered the same way any package can register its own.",
      icon: "icon-wand",
      modal: {
        element: () => import("./example-modal.element.js"),
      },
    },
  },
];
