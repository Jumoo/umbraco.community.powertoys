export const manifests: Array<UmbExtensionManifest> = [
  // No js/element of its own - relies on the default box + meta.modal for its settings,
  // same shape as Login Customizer and Theme Maker.
  {
    type: "powerToy",
    alias: "PowerToys.PowerToy.LogoChanger",
    name: "Logo Changer Power Toy",
    // Dashboard order across all power toys - see navbar-clock/manifest.ts for the full list.
    // Sits below Theme Maker (100).
    weight: 50,
    meta: {
      label: "Logo Changer",
      description: "Customize the backoffice logo. Changes require a site restart to take effect.",
      icon: "icon-picture",
      modal: {
        element: () => import("./logo-changer-modal.element.js"),
        savable: true,
        size: "medium",
      },
    },
  },
];
