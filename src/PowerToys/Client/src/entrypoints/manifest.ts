export const manifests: Array<UmbExtensionManifest> = [
  {
    name: "Power Toys Entrypoint",
    alias: "PowerToys.Entrypoint",
    type: "backofficeEntryPoint",
    js: () => import("./entrypoint.js"),
  },
];
