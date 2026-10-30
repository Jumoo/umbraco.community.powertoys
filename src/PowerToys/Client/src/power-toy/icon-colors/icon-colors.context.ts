import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { umbExtensionsRegistry } from "@umbraco-cms/backoffice/extension-registry";
import { UmbBasicState } from "@umbraco-cms/backoffice/observable-api";
import type { Observable } from "@umbraco-cms/backoffice/external/rxjs";
import { umbracoColors } from "@umbraco-cms/backoffice/resources";
import { toCamelCase } from "@umbraco-cms/backoffice/utils";
import { UMB_POWER_TOY_CONTEXT, type UmbPowerToyContext } from "../power-toy.context.js";
import {
  DEFAULT_ICON_COLORS_SETTINGS,
  V13_ICON_COLORS,
  iconColorVariable,
  variableFromAlias,
  withDefaults,
  type IconColorsSettings,
} from "./icon-colors-settings.js";

export const ICON_COLORS_ALIAS = "PowerToys.PowerToy.IconColors";
const LOCALIZATION_ALIAS = "PowerToys.IconColors.Localization";
const STYLE_ELEMENT_ID = "powertoys-icon-colors";

interface UmbIconColor {
  alias: string;
  varName: string;
  legacy?: boolean;
}

// There's no extension point for icon colours in v17 (umbraco/Umbraco-CMS#22543). But every
// place that turns a colour alias into a colour - umb-icon, the icon picker's swatches, the icon
// picker property editor - reads the one exported umbracoColors array on each call, and the
// import map hands us that same instance. So this rewrites that array in place. It's not a
// public API: if Umbraco moves or freezes it, we stop touching it rather than break the
// backoffice.
const table: UmbIconColor[] | undefined = Array.isArray(umbracoColors) ? (umbracoColors as UmbIconColor[]) : undefined;

export class IconColorsContext extends UmbContextBase {
  #powerToyContext?: UmbPowerToyContext;

  // Umbraco's own table as it was before we touched it - every apply starts again from this,
  // so turning an option (or the whole power toy) off puts things back exactly.
  #original: UmbIconColor[] = table?.map((color) => ({ ...color })) ?? [];

  // Whether the power toy itself is switched on - while it's off, the saved settings are kept
  // but never applied, so flipping it back on (or off) is instantly reversible either way.
  #enabled = true;

  #settings = new UmbBasicState<IconColorsSettings>(DEFAULT_ICON_COLORS_SETTINGS);
  #settings$ = this.#settings.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, ICON_COLORS_CONTEXT);

    if (!table) {
      console.warn("Power Toys: Umbraco's icon colour table wasn't found, so Icon Colors can't apply.");
      return;
    }

    this.consumeContext(UMB_POWER_TOY_CONTEXT, (context) => {
      this.#powerToyContext = context;
      if (!context) return;
      this.#loadSettings();

      this.observe(context.observeEnabled(ICON_COLORS_ALIAS), (enabled) => {
        this.#enabled = enabled;
        this.#applyState();
      });
    });
  }

  async #loadSettings() {
    const settings = await this.#powerToyContext?.getSettings<IconColorsSettings>(ICON_COLORS_ALIAS);
    this.#settings.setValue(withDefaults(settings));
    this.#applyState();
  }

  // Rebuilds the colour table, the :root custom properties behind it, and the swatch labels
  // from the settings that should be in effect right now. Always works from #original, so it's
  // safe to call from any trigger, any number of times.
  #applyState() {
    if (!table) return;
    const active = this.#enabled ? this.#settings.getValue() : DEFAULT_ICON_COLORS_SETTINGS;

    const entries: UmbIconColor[] = [];
    const properties: string[] = [];
    const labels: Record<string, string> = {};

    if (active.useV13Colors) {
      const v13Aliases = new Set(V13_ICON_COLORS.map((color) => color.alias));
      V13_ICON_COLORS.forEach((color) => {
        const varName = iconColorVariable(color.alias);
        entries.push({ alias: color.alias, varName });
        properties.push(`${varName}: ${color.color};`);
        labels[toCamelCase(color.alias)] = color.name;
      });
      // Everything else (e.g. v17's "text") stays resolvable for icons already using it, but
      // drops out of the picker.
      this.#original
        .filter((color) => !v13Aliases.has(color.alias))
        .forEach((color) => entries.push({ ...color, legacy: true }));
    } else {
      entries.push(...this.#original.map((color) => ({ ...color })));
    }

    active.customColors.forEach((color) => {
      const varName = variableFromAlias(color.alias);
      if (!varName || !CSS.supports("color", color.color)) return;
      entries.push({ alias: color.alias, varName });
      properties.push(`${varName}: ${color.color};`);
      labels[toCamelCase(color.alias)] = color.name;
    });

    table.splice(0, table.length, ...entries);
    this.#applyProperties(properties);
    this.#applyLabels(labels);
  }

  // Custom properties on :root reach every shadow root, and stay live - an icon already drawn
  // with var(--powertoys-icon-x) picks up a new value without re-rendering.
  #applyProperties(properties: string[]) {
    let style = document.getElementById(STYLE_ELEMENT_ID);
    if (!properties.length) {
      style?.remove();
      return;
    }
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ELEMENT_ID;
      document.head.appendChild(style);
    }
    style.textContent = `:root { ${properties.join(" ")} }`;
  }

  // The picker labels each swatch with the term colors_<camelCase alias>, and Umbraco only ships
  // terms for its current colours - so register the rest. "en" is the fallback culture, which
  // every user's lookup ends at.
  #applyLabels(labels: Record<string, string>) {
    if (umbExtensionsRegistry.isRegistered(LOCALIZATION_ALIAS)) {
      umbExtensionsRegistry.unregister(LOCALIZATION_ALIAS);
    }
    if (!Object.keys(labels).length) return;
    umbExtensionsRegistry.register({
      type: "localization",
      alias: LOCALIZATION_ALIAS,
      name: "Icon Colors Localization",
      weight: -100,
      meta: {
        culture: "en",
        localizations: { colors: labels },
      },
    });
  }

  /** Whether Umbraco's colour table was found - if not, nothing this power toy saves can apply. */
  get isSupported(): boolean {
    return !!table;
  }

  observeSettings(): Observable<IconColorsSettings> {
    return this.#settings$;
  }

  /** Persists the given settings and immediately re-applies them. */
  async save(settings: IconColorsSettings): Promise<void> {
    await this.#powerToyContext?.saveSettings<IconColorsSettings>(ICON_COLORS_ALIAS, settings);
    this.#settings.setValue(settings);
    this.#applyState();
  }
}

export const ICON_COLORS_CONTEXT = new UmbContextToken<IconColorsContext>("IconColorsContext");

export default IconColorsContext;
