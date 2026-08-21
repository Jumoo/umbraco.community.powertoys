export interface HelpMenuLink {
  /** Full extension alias this link is registered under - see CUSTOM_LINK_ALIAS_PREFIX. */
  alias: string;
  name: string;
  href: string;
  /** uui-icon name, e.g. 'icon-link'. */
  icon: string;
}

export interface HelpMenuEditorSettings {
  /** Hides the whole help icon/menu at the top of the backoffice. */
  disableHelpMenu: boolean;
  /** Aliases of built-in (or other packages') help menu items to hide. */
  disabledItems: string[];
  customLinks: HelpMenuLink[];
}

export const DEFAULT_HELP_MENU_EDITOR_SETTINGS: HelpMenuEditorSettings = {
  disableHelpMenu: false,
  disabledItems: [],
  customLinks: [],
};

// Settings saved before a field existed (or a settings blob that's just missing a key)
// shouldn't leave that field undefined - always fill gaps from the defaults.
export function withDefaults(settings: Partial<HelpMenuEditorSettings> | null | undefined): HelpMenuEditorSettings {
  return {
    ...DEFAULT_HELP_MENU_EDITOR_SETTINGS,
    ...settings,
    disabledItems: settings?.disabledItems ?? DEFAULT_HELP_MENU_EDITOR_SETTINGS.disabledItems,
    customLinks: settings?.customLinks ?? DEFAULT_HELP_MENU_EDITOR_SETTINGS.customLinks,
  };
}
