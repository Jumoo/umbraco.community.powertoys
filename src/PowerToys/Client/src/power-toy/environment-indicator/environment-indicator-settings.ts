export interface EnvironmentDefinition {
  /** Unique id for this row - stable across edits so list rendering/removal can key off it. */
  alias: string;
  name: string;
  /** Regex tested against window.location.href - can use alternation to match several hosts. */
  pattern: string;
  /** Hex colour applied to --uui-color-header-surface when this environment matches. */
  color: string;
}

export interface EnvironmentIndicatorSettings {
  environments: EnvironmentDefinition[];
  /** Shows the matched environment's name in the header app, next to the colour change. */
  showNameInHeader: boolean;
}

export const DEFAULT_ENVIRONMENT_INDICATOR_SETTINGS: EnvironmentIndicatorSettings = {
  environments: [],
  showNameInHeader: true,
};

// Settings saved before a field existed (or a settings blob that's just missing a key)
// shouldn't leave that field undefined - always fill gaps from the defaults.
export function withDefaults(
  settings: Partial<EnvironmentIndicatorSettings> | null | undefined,
): EnvironmentIndicatorSettings {
  return {
    ...DEFAULT_ENVIRONMENT_INDICATOR_SETTINGS,
    ...settings,
    environments: settings?.environments ?? DEFAULT_ENVIRONMENT_INDICATOR_SETTINGS.environments,
  };
}

// First matching row wins - lets someone order a specific host above a broader catch-all
// pattern. Invalid regex in a row is skipped rather than throwing, since it can be mid-edit.
export function matchEnvironment(
  environments: EnvironmentDefinition[],
  href: string,
): EnvironmentDefinition | undefined {
  return environments.find((environment) => {
    if (!environment.pattern) return false;
    try {
      return new RegExp(environment.pattern, "i").test(href);
    } catch {
      return false;
    }
  });
}
