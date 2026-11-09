import { extractUmbColorVariable } from "@umbraco-cms/backoffice/resources";

export interface TabIcon {
  /**
   * An icon colour alias from Umbraco's icon picker ("blue", or an Icon Colors custom colour's
   * `var(...)` alias), or - from before the picker was used - any CSS colour.
   */
  color?: string;
  /** An icon name from Umbraco's icon picker, e.g. "icon-settings". */
  icon?: string;
  /** The content type the tab belongs to - only kept so the settings list can say where it is. */
  contentType: string;
  contentTypeName: string;
  tabName: string;
}

export interface TabIconsSettings {
  /**
   * Keyed by the tab's container id (a GUID). Container ids are unique across every content
   * type, survive renaming the tab, and are carried between environments by uSync - so the
   * id alone is enough to find the tab wherever it's drawn, including on doc types that get
   * it through a composition.
   */
  tabs: Record<string, TabIcon>;
}

/** What a tab looks like once its settings are resolved - colour as real CSS, ready to apply. */
export interface TabStyle {
  color?: string;
  icon?: string;
}

export const DEFAULT_TAB_ICONS_SETTINGS: TabIconsSettings = {
  tabs: {},
};

export function withDefaults(settings: Partial<TabIconsSettings> | null | undefined): TabIconsSettings {
  return {
    ...DEFAULT_TAB_ICONS_SETTINGS,
    ...settings,
    tabs: settings?.tabs ?? {},
  };
}

/**
 * Turns a stored colour into CSS. Icon picker aliases go through Umbraco's own colour table (the
 * same lookup umb-icon uses, so Icon Colors' custom and Umbraco 13 colours resolve too); anything
 * else is used as-is if it's a valid CSS colour.
 */
export function resolveTabColor(color: string | undefined): string | undefined {
  if (!color) return undefined;
  const variable = extractUmbColorVariable(color);
  if (variable) return `var(${variable})`;
  return CSS.supports("color", color) ? color : undefined;
}
