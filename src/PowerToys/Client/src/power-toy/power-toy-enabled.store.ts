const STORAGE_KEY_PREFIX = "PowerToys.enabled.";

// v0.1: per-browser only, via localStorage. Good enough to prove the toggle works;
// move to a server-persisted setting once power toys need this shared across users/devices.

export function isPowerToyEnabled(alias: string | undefined): boolean {
  if (!alias) return true;
  return localStorage.getItem(STORAGE_KEY_PREFIX + alias) !== "false";
}

export function setPowerToyEnabled(alias: string | undefined, enabled: boolean): void {
  if (!alias) return;
  localStorage.setItem(STORAGE_KEY_PREFIX + alias, String(enabled));
}
