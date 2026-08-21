import { DASHBOARD_MANAGER_ALIAS } from "./dashboard-manager.context.js";

export const manifests: Array<UmbExtensionManifest> = [
  // No js/element of its own - relies on the default box + meta.modal, same as
  // example/navbar-clock. savable:true shows the shared modal's Save button.
  {
    type: "powerToy",
    alias: DASHBOARD_MANAGER_ALIAS,
    name: "Dashboard Manager Power Toy",
    // Dashboard order across all power toys - see navbar-clock/manifest.ts for the full list.
    weight: 500,
    meta: {
      label: "Dashboard Manager",
      description: "Lists the installed dashboards and lets you hide (or bring back) individual ones.",
      icon: "icon-dashboard",
      modal: {
        element: () => import("./dashboard-manager-modal.element.js"),
        savable: true,
      },
    },
  },
  // Provided globally - it needs to react to dashboard manifests as soon as they're
  // registered, not just while the manager's own modal happens to be open.
  {
    type: "globalContext",
    alias: "PowerToys.GlobalContext.DashboardManager",
    name: "Dashboard Manager Global Context",
    api: () => import("./dashboard-manager.context.js"),
  },
];
