export interface ThemeVariable {
  /** The UUI CSS custom property this control edits, e.g. '--uui-color-surface'. */
  cssVar: string;
  label: string;
  /** Section heading the variable is grouped under in the editor. */
  group: string;
  /** The value UUI's own light theme resolves this variable to. */
  default: string;
}

// A curated subset of the ~35 semantic --uui-color-* variables UUI's light/dark/high-contrast
// themes touch (see @umbraco-ui/uui/dist/themes/light.css) - the ones that most define a
// theme's look, skipping the raw --uui-palette-* primitives and the low-value -standalone/
// -contrast variants that are rarely worth hand-tuning.
export const THEME_VARIABLES: ThemeVariable[] = [
  { cssVar: "--uui-color-surface", label: "Surface", group: "Surface", default: "#ffffff" },
  { cssVar: "--uui-color-surface-alt", label: "Surface (alt)", group: "Surface", default: "#f7f7f8" },
  { cssVar: "--uui-color-background", label: "Background", group: "Surface", default: "#f7f7f8" },

  { cssVar: "--uui-color-text", label: "Text", group: "Text", default: "#060606" },
  { cssVar: "--uui-color-text-alt", label: "Text (alt)", group: "Text", default: "#2e2b29" },

  { cssVar: "--uui-color-header-surface", label: "Header background", group: "Header", default: "#1b264f" },

  { cssVar: "--uui-color-interactive", label: "Interactive", group: "Interactive", default: "#1b264f" },
  { cssVar: "--uui-color-interactive-emphasis", label: "Interactive (hover)", group: "Interactive", default: "#2d42ab" },

  { cssVar: "--uui-color-border", label: "Border", group: "Borders", default: "#d8d7d9" },
  { cssVar: "--uui-color-divider", label: "Divider", group: "Borders", default: "#f6f6f7" },

  { cssVar: "--uui-color-default", label: "Default", group: "Status", default: "#283a97" },
  { cssVar: "--uui-color-warning", label: "Warning", group: "Status", default: "#fad634" },
  { cssVar: "--uui-color-danger", label: "Danger", group: "Status", default: "#df2a5d" },
  { cssVar: "--uui-color-positive", label: "Positive", group: "Status", default: "#2bc37c" },
];

export function defaultThemeColors(): Record<string, string> {
  return Object.fromEntries(THEME_VARIABLES.map((variable) => [variable.cssVar, variable.default]));
}

/** Generates the :root{...} CSS text a custom theme's manifest loads via its css() function. */
export function themeColorsToCss(colors: Record<string, string>): string {
  const declarations = THEME_VARIABLES.map((variable) => `${variable.cssVar}:${colors[variable.cssVar] ?? variable.default};`).join(
    "",
  );
  return `:root{${declarations}}`;
}
