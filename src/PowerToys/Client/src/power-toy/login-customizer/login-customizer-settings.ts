export const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface LoginCustomizerSettings {
  backgroundImage: string;
  logoImage: string;
  logoImageAlternative: string;
  allowPasswordReset: boolean;
  customCss: string;
  instruction: string;
  /** Login screen greeting overrides, index 0 = Sunday ... 6 = Saturday. */
  greetings: string[];
}

export const DEFAULT_LOGIN_CUSTOMIZER_SETTINGS: LoginCustomizerSettings = {
  backgroundImage: "",
  logoImage: "",
  logoImageAlternative: "",
  allowPasswordReset: true,
  customCss: ":root {\n\n}\n",
  instruction: "",
  greetings: DAYS_OF_WEEK.map(() => ""),
};

// Settings saved before a field existed (or a settings blob that's just missing a key)
// shouldn't leave that field undefined - always fill gaps from the defaults.
export function withDefaults(settings: Partial<LoginCustomizerSettings> | null | undefined): LoginCustomizerSettings {
  return {
    ...DEFAULT_LOGIN_CUSTOMIZER_SETTINGS,
    ...settings,
    greetings: settings?.greetings ?? DEFAULT_LOGIN_CUSTOMIZER_SETTINGS.greetings,
  };
}
