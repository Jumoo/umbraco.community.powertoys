const POWER_TOY_ALIAS = "PowerToys.PowerToy.NavbarClock";

export const manifests: Array<UmbExtensionManifest> = [
  // No js/element and no meta.modal - enabled/disabled is the only setting this power
  // toy has, so the default box (just its description) is all it needs on the dashboard.
  {
    type: "powerToy",
    alias: POWER_TOY_ALIAS,
    name: "Navbar Clock Power Toy",
    meta: {
      label: "Navbar Clock",
      description: "Shows the current time in the backoffice header while enabled.",
      icon: "icon-time",
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
