export const manifests: Array<UmbExtensionManifest> = [
  // No js/element of its own - relies on the default box + meta.modal for its settings,
  // same shape as Dashboard Manager and Navbar Clock.
  {
    type: "powerToy",
    alias: "PowerToys.PowerToy.LoginCustomizer",
    name: "Login Customizer Power Toy",
    // Dashboard order across all power toys - see navbar-clock/manifest.ts for the full list.
    weight: 300,
    meta: {
      label: "Login Customizer",
      description:
        "Customize the backoffice login screen's images and password reset option. Changes require a site restart to take effect.",
      icon: "icon-lock",
      modal: {
        element: () => import("./login-customizer-modal.element.js"),
        savable: true,
        size: "medium",
      },
    },
  },
];
