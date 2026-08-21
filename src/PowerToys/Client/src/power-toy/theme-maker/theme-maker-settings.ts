export interface CustomTheme {
  /** Full extension alias this theme is registered under - see CUSTOM_THEME_ALIAS_PREFIX. */
  alias: string;
  name: string;
  /** cssVar -> colour, keyed by THEME_VARIABLES[].cssVar - see theme-variables.ts. */
  colors: Record<string, string>;
}

export interface ThemeMakerSettings {
  /** Aliases of installed (built-in or other packages') themes to hide from the theme picker. */
  disabledThemes: string[];
  customThemes: CustomTheme[];
}

export const DEFAULT_THEME_MAKER_SETTINGS: ThemeMakerSettings = {
  disabledThemes: [],
  customThemes: [],
};

// Settings saved before a field existed (or a settings blob that's just missing a key)
// shouldn't leave that field undefined - always fill gaps from the defaults.
export function withDefaults(settings: Partial<ThemeMakerSettings> | null | undefined): ThemeMakerSettings {
  return {
    ...DEFAULT_THEME_MAKER_SETTINGS,
    ...settings,
    disabledThemes: settings?.disabledThemes ?? DEFAULT_THEME_MAKER_SETTINGS.disabledThemes,
    customThemes: settings?.customThemes ?? DEFAULT_THEME_MAKER_SETTINGS.customThemes,
  };
}
