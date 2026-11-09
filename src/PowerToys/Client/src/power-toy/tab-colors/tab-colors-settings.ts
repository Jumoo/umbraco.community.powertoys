export interface TabColor {
  /** Any CSS colour, usually a hex code from the colour input. */
  color: string;
  /** The document type the tab belongs to - only kept so the settings list can say where it is. */
  contentType: string;
  contentTypeName: string;
  tabName: string;
}

export interface TabColorsSettings {
  /**
   * Keyed by the tab's container id (a GUID). Container ids are unique across every content
   * type, survive renaming the tab, and are carried between environments by uSync - so the
   * id alone is enough to find the tab wherever it's drawn, including on doc types that get
   * it through a composition.
   */
  tabs: Record<string, TabColor>;
}

export const DEFAULT_TAB_COLORS_SETTINGS: TabColorsSettings = {
  tabs: {},
};

export function withDefaults(settings: Partial<TabColorsSettings> | null | undefined): TabColorsSettings {
  return {
    ...DEFAULT_TAB_COLORS_SETTINGS,
    ...settings,
    tabs: settings?.tabs ?? {},
  };
}
