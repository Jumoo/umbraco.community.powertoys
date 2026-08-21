export interface LogoChangerSettings {
  logo: string;
  logoAlternative: string;
}

export const DEFAULT_LOGO_CHANGER_SETTINGS: LogoChangerSettings = {
  logo: "",
  logoAlternative: "",
};

// Settings saved before a field existed (or a settings blob that's just missing a key)
// shouldn't leave that field undefined - always fill gaps from the defaults.
export function withDefaults(settings: Partial<LogoChangerSettings> | null | undefined): LogoChangerSettings {
  return {
    ...DEFAULT_LOGO_CHANGER_SETTINGS,
    ...settings,
  };
}
