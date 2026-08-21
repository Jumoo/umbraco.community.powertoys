const POWER_TOY_ALIAS = "PowerToys.PowerToy.NavbarClock";

export const manifests: Array<UmbExtensionManifest> = [
  // Its own card body (navbar-clock-body.element) instead of the default box - shows a live
  // preview of the clock, styled like the header, underneath the description. Still opens the
  // same settings modal on click via meta.modal, same as the default box would.
  {
    type: "powerToy",
    alias: POWER_TOY_ALIAS,
    name: "Navbar Clock Power Toy",
    // Dashboard order across all power toys: Navbar Clock (600), Dashboard Manager (500),
    // Help Menu Editor (400), Login Customizer (300), Environment Indicator (200), Theme
    // Maker (100) - weights sort descending, and the gap of 100 leaves room to insert others.
    weight: 600,
    js: () => import("./navbar-clock-body.element.js"),
    meta: {
      label: "Navbar Clock",
      description: "Shows the current time in the backoffice header.",
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
