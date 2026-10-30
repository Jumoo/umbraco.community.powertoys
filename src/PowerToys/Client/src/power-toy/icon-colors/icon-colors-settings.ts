export interface CustomIconColor {
  /**
   * The colour alias the icon picker stores in the icon string ("icon-heart color-<alias>").
   * Always `var(--powertoys-icon-<slug>)` - see customColorAlias() for why. Fixed once created,
   * so renaming a colour doesn't orphan the icons already using it.
   */
  alias: string;
  name: string;
  /** Any CSS colour, usually a hex code from the colour input. */
  color: string;
}

export interface IconColorsSettings {
  /** Swap the v17 swatches for the 19 Umbraco 13 icon colours, at their v13 values. */
  useV13Colors: boolean;
  customColors: CustomIconColor[];
}

export const DEFAULT_ICON_COLORS_SETTINGS: IconColorsSettings = {
  useV13Colors: false,
  customColors: [],
};

// Settings saved before a field existed (or a settings blob that's just missing a key)
// shouldn't leave that field undefined - always fill gaps from the defaults.
export function withDefaults(settings: Partial<IconColorsSettings> | null | undefined): IconColorsSettings {
  return {
    ...DEFAULT_ICON_COLORS_SETTINGS,
    ...settings,
    customColors: settings?.customColors ?? DEFAULT_ICON_COLORS_SETTINGS.customColors,
  };
}

// The Umbraco 13 icon picker's colours, in its order, with the values from v13's
// less/variables.less. Every alias here already exists in v17's umbracoColors table - most as
// hidden "legacy" entries pointing at a nearby v17 colour - so icons saved in v13 pick these
// up again without any data changing.
export const V13_ICON_COLORS: Array<{ alias: string; name: string; color: string }> = [
  { alias: "black", name: "Black", color: "#000000" },
  { alias: "blue-grey", name: "Blue Grey", color: "#607D8B" },
  { alias: "grey", name: "Grey", color: "#9E9E9E" },
  { alias: "brown", name: "Brown", color: "#795548" },
  { alias: "blue", name: "Blue", color: "#2196F3" },
  { alias: "light-blue", name: "Light Blue", color: "#03A9F4" },
  { alias: "indigo", name: "Indigo", color: "#3F51B5" },
  { alias: "purple", name: "Purple", color: "#9C27B0" },
  { alias: "deep-purple", name: "Deep Purple", color: "#673AB7" },
  { alias: "cyan", name: "Cyan", color: "#00BCD4" },
  { alias: "green", name: "Green", color: "#4CAF50" },
  { alias: "light-green", name: "Light Green", color: "#8BC34A" },
  { alias: "lime", name: "Lime", color: "#CDDC39" },
  { alias: "yellow", name: "Yellow", color: "#FFEB3B" },
  { alias: "amber", name: "Amber", color: "#FFC107" },
  { alias: "orange", name: "Orange", color: "#FF9800" },
  { alias: "deep-orange", name: "Deep Orange", color: "#FF5722" },
  { alias: "red", name: "Red", color: "#F44336" },
  { alias: "pink", name: "Pink", color: "#E91E63" },
];

/** The CSS custom property a colour's value is published under on :root. */
export function iconColorVariable(slug: string): string {
  return `--powertoys-icon-${slug}`;
}

/**
 * Builds the alias for a new custom colour from its name, unique against `taken`.
 *
 * The alias is a whole `var(...)` expression rather than a plain word on purpose: umb-icon
 * falls back to using an unknown alias as a raw CSS colour, so an icon saved with this alias
 * renders in the right colour even before this power toy has patched Umbraco's colour table
 * (the tree often draws before our settings have loaded). The icon string splits on spaces,
 * and this has none.
 */
export function customColorAlias(name: string, taken: string[]): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "color";
  let slug = base;
  for (let i = 2; taken.includes(`var(${iconColorVariable(slug)})`); i++) {
    slug = `${base}-${i}`;
  }
  return `var(${iconColorVariable(slug)})`;
}

/** The custom property name inside a custom colour's `var(...)` alias. */
export function variableFromAlias(alias: string): string | undefined {
  return /^var\((--powertoys-icon-[a-z0-9-]+)\)$/.exec(alias)?.[1];
}
