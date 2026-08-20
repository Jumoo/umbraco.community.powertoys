export const manifests: Array<UmbExtensionManifest> = [
  {
    name: "Power Toys Dashboard",
    alias: "PowerToys.Dashboard",
    type: "dashboard",
    js: () => import("./dashboard.element.js"),
    meta: {
      label: "Power Toys",
      pathname: "power-toys",
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionAlias",
        match: "Umb.Section.Settings",
      },
    ],
  },
];
