// The values Intl.DateTimeFormatOptions.dateStyle/timeStyle accept - reusing them instead of
// a hand-rolled token format means display goes through this.localize.date(), which is
// locale-aware for free (via Intl.DateTimeFormat) rather than something we format ourselves.
export type DateTimeStyle = "full" | "long" | "medium" | "short";

export const DATE_TIME_STYLES: DateTimeStyle[] = ["full", "long", "medium", "short"];

export interface NavbarClockSettings {
  showDate: boolean;
  showTime: boolean;
  dateStyle: DateTimeStyle;
  timeStyle: DateTimeStyle;
}

export const DEFAULT_NAVBAR_CLOCK_SETTINGS: NavbarClockSettings = {
  showDate: false,
  showTime: true,
  dateStyle: "medium",
  timeStyle: "medium",
};

// Settings saved before a field existed (or a settings blob that's just missing a key)
// shouldn't leave that field undefined - always fill gaps from the defaults.
export function withDefaults(settings: Partial<NavbarClockSettings> | null | undefined): NavbarClockSettings {
  return { ...DEFAULT_NAVBAR_CLOCK_SETTINGS, ...settings };
}
