// Referenced by the Dashboard Manager power toy, which refuses to let this one be
// hidden - hiding it would remove the only way to bring dashboards back.
export const POWER_TOYS_DASHBOARD_ALIAS = "PowerToys.Dashboard";

export const manifests: Array<UmbExtensionManifest> = [
  {
    name: "Power Toys Dashboard",
    alias: POWER_TOYS_DASHBOARD_ALIAS,
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
