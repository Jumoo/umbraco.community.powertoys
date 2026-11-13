export const TOAST_DURATIONS_POWER_TOY_ALIAS = "PowerToys.PowerToy.ToastDurations";

/** Seconds on screen, "stay" until dismissed, or "hide" to not show the toast at all. */
export type ToastDuration = number | "stay" | "hide";

/** The colours Umbraco gives its toasts: success, info, warning and error. */
export type ToastKind = "positive" | "default" | "warning" | "danger";

export type ToastDurationsSettings = Record<ToastKind, ToastDuration>;

export const TOAST_KINDS: Array<{ kind: ToastKind; label: string; description: string }> = [
  { kind: "positive", label: "Success", description: "Green, such as \"Document saved\"." },
  { kind: "default", label: "Information", description: "Neutral messages." },
  { kind: "warning", label: "Warning", description: "Orange, such as a publish with warnings." },
  { kind: "danger", label: "Error", description: "Red, such as a failed save or publish." },
];

export const DURATION_OPTIONS: Array<{ value: ToastDuration; name: string }> = [
  { value: "hide", name: "Don't show" },
  { value: 2, name: "2 seconds" },
  { value: 3, name: "3 seconds" },
  { value: 4, name: "4 seconds" },
  { value: 6, name: "6 seconds (Umbraco's default)" },
  { value: 8, name: "8 seconds" },
  { value: 10, name: "10 seconds" },
  { value: 15, name: "15 seconds" },
  { value: 30, name: "30 seconds" },
  { value: "stay", name: "Until dismissed" },
];

// Shorter success toasts and errors that wait to be read: what people ask for in
// https://github.com/umbraco/Umbraco-CMS/discussions/18134
export const DEFAULT_TOAST_DURATIONS: ToastDurationsSettings = {
  positive: 3,
  default: 6,
  warning: 10,
  danger: "stay",
};

export function withDefaults(settings: Partial<ToastDurationsSettings> | null | undefined): ToastDurationsSettings {
  return { ...DEFAULT_TOAST_DURATIONS, ...settings };
}
