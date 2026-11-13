export const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface LoginCustomizerSettings {
  backgroundImage: string;
  logoImage: string;
  logoImageAlternative: string;
  allowPasswordReset: boolean;
  customCss: string;
  /** Plain text shown under the greeting, e.g. who to contact for help. Links are made clickable. */
  message: string;
  /** Login screen greeting overrides, index 0 = Sunday ... 6 = Saturday. */
  greetings: string[];
}

export const DEFAULT_LOGIN_CUSTOMIZER_SETTINGS: LoginCustomizerSettings = {
  backgroundImage: "",
  logoImage: "",
  logoImageAlternative: "",
  allowPasswordReset: true,
  customCss: ":root {\n\n}\n",
  message: "",
  greetings: DAYS_OF_WEEK.map(() => ""),
};

// Settings saved before a field existed (or a settings blob that's just missing a key)
// shouldn't leave that field undefined - always fill gaps from the defaults.
//
// "instruction" is the message's old name. It was saved as Umbraco's auth_instruction text,
// which the v17 login screen doesn't show, so it carries over as the message and is dropped.
export function withDefaults(
  settings: (Partial<LoginCustomizerSettings> & { instruction?: string }) | null | undefined
): LoginCustomizerSettings {
  const { instruction, ...rest } = settings ?? {};
  return {
    ...DEFAULT_LOGIN_CUSTOMIZER_SETTINGS,
    ...rest,
    message: rest.message || instruction || "",
    greetings: rest.greetings ?? DEFAULT_LOGIN_CUSTOMIZER_SETTINGS.greetings,
  };
}
