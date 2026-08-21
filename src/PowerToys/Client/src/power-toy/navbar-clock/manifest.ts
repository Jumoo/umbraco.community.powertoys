const POWER_TOY_ALIAS = "PowerToys.PowerToy.NavbarClock";

export const manifests: Array<UmbExtensionManifest> = [
  // No js/element of its own - relies on the default box + meta.modal for its settings,
  // same shape as Dashboard Manager.
  {
    type: "powerToy",
    alias: POWER_TOY_ALIAS,
    name: "Navbar Clock Power Toy",
    meta: {
      label: "Navbar Clock",
      description: "Shows the current time in the backoffice header while enabled.",
      icon: "icon-time",
      modal: {
        element: () => import("./navbar-clock-modal.element.js"),
        savable: true,
      },
    },
  },
  // Only shown while the power toy above is enabled - proves out the shared
  // PowerToyEnabled condition as a way to gate any manifest, not just power toys.
  {
    type: "headerApp",
    alias: "PowerToys.HeaderApp.NavbarClock",
    name: "Navbar Clock Header App",
    element: () => import("./navbar-clock.header-app.element.js"),
    conditions: [
      {
        alias: "PowerToys.Condition.PowerToyEnabled",
        match: POWER_TOY_ALIAS,
      },
    ],
  },
];
