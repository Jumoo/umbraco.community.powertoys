import type { ManifestPowerToy } from "../power-toy.extension.js";

export const manifests: Array<ManifestPowerToy> = [
  {
    type: "powerToy",
    alias: "PowerToys.PowerToy.Example",
    name: "Example Power Toy",
    js: () => import("./example.power-toy.element.js"),
    meta: {
      label: "Example",
      description: "A placeholder power toy, registered the same way any package can register its own.",
      icon: "icon-wand",
    },
  },
];
