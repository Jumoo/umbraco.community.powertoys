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
  // The dashboard footer's Backup / Restore button opens this - not scoped to any one power
  // toy, so it lives alongside the dashboard itself rather than under power-toy/.
  {
    type: "modal",
    alias: "PowerToys.Modal.BackupRestore",
    name: "Power Toys Backup / Restore Modal",
    element: () => import("./backup-restore/backup-restore-modal.element.js"),
  },
];
