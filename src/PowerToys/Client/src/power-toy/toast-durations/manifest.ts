import { TOAST_DURATIONS_POWER_TOY_ALIAS } from "./toast-durations-settings.js";

export const manifests: Array<UmbExtensionManifest> = [
  {
    type: "powerToy",
    alias: TOAST_DURATIONS_POWER_TOY_ALIAS,
    name: "Toast Durations Power Toy",
    // After Right-Click Actions (2), at the end of the dashboard
    weight: 1,
    meta: {
      label: "Toast Durations",
      description:
        "Choose how long success, information, warning and error toasts stay on screen, or hide them.",
      icon: "icon-alarm-clock",
      modal: {
        element: () => import("./toast-durations-modal.element.js"),
        savable: true,
        size: "medium",
      },
    },
  },
  // Always registered: it changes toasts only while the power toy is on
  {
    type: "globalContext",
    alias: "PowerToys.GlobalContext.ToastDurations",
    name: "Toast Durations Global Context",
    api: () => import("./toast-durations.context.js"),
  },
];
