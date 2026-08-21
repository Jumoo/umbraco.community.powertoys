import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { umbExtensionsRegistry } from "@umbraco-cms/backoffice/extension-registry";
import { UmbArrayState, UmbBasicState } from "@umbraco-cms/backoffice/observable-api";
import type { Observable } from "@umbraco-cms/backoffice/external/rxjs";
import type { ManifestTheme } from "@umbraco-cms/backoffice/themes";
import { UMB_POWER_TOY_CONTEXT, type UmbPowerToyContext } from "../power-toy.context.js";
import { DEFAULT_THEME_MAKER_SETTINGS, withDefaults, type ThemeMakerSettings, type CustomTheme } from "./theme-maker-settings.js";
import { themeColorsToCss } from "./theme-variables.js";

export const THEME_MAKER_ALIAS = "PowerToys.PowerToy.ThemeMaker";
export const CUSTOM_THEME_ALIAS_PREFIX = "PowerToys.ThemeMaker.Custom.";

// Owns everything the Theme Maker's modal needs, and keeps enforcing it live - themes (built-in
// or from other packages) are registered reactively, sometime after this global context is
// constructed, not necessarily all at once up front. Same shape as HelpMenuEditorContext,
// applied to the "theme" extension type instead of help menu items.
export class ThemeMakerContext extends UmbContextBase {
  #powerToyContext?: UmbPowerToyContext;

  // Append-only: every built-in/other-package theme alias ever seen (excluding our own custom
  // themes, which have their own list), even after we've unregistered it.
  #baseline = new UmbArrayState<ManifestTheme, string>([], (x) => x.alias);
  #baseline$ = this.#baseline.asObservable();

  // Whether the power toy itself is switched on - while it's off, the saved settings are kept
  // but never applied, so flipping it back on (or off) is instantly reversible either way.
  #enabled = true;

  #settings = new UmbBasicState<ThemeMakerSettings>(DEFAULT_THEME_MAKER_SETTINGS);
  #settings$ = this.#settings.asObservable();

  // Tracks the colours last registered for each custom theme alias, so an edited theme's css()
  // loader gets refreshed (unregister + re-register) instead of being left stale because its
  // alias was already registered.
  #registeredCustomThemeColors = new Map<string, string>();

  constructor(host: UmbControllerHost) {
    super(host, THEME_MAKER_CONTEXT);

    this.consumeContext(UMB_POWER_TOY_CONTEXT, (context) => {
      this.#powerToyContext = context;
      if (!context) return;
      this.#loadSettings();

      this.observe(context.observeEnabled(THEME_MAKER_ALIAS), (enabled) => {
        this.#enabled = enabled;
        this.#applyState();
      });
    });

    this.observe(umbExtensionsRegistry.byType("theme"), (manifests) => {
      const items = manifests.filter((manifest) => !manifest.alias.startsWith(CUSTOM_THEME_ALIAS_PREFIX));
      this.#baseline.append(items);
      this.#applyState();
    });
  }

  async #loadSettings() {
    const settings = await this.#powerToyContext?.getSettings<ThemeMakerSettings>(THEME_MAKER_ALIAS);
    this.#settings.setValue(withDefaults(settings));
    this.#applyState();
  }

  // Reconciles the live extension registry against the settings that should currently be in
  // effect - the saved settings while the power toy is enabled, or none at all while it's
  // disabled. Safe to call any number of times from any trigger (settings loaded, baseline theme
  // registered, enabled flag flipped, settings saved) since it always compares desired vs. actual
  // state rather than diffing against whatever ran last.
  #applyState() {
    const settings = this.#settings.getValue();
    if (!settings) return;
    const active = this.#enabled ? settings : DEFAULT_THEME_MAKER_SETTINGS;

    this.#baseline.getValue()?.forEach((manifest) => {
      const shouldBeHidden = active.disabledThemes.includes(manifest.alias);
      const isRegistered = umbExtensionsRegistry.isRegistered(manifest.alias);
      if (shouldBeHidden && isRegistered) umbExtensionsRegistry.unregister(manifest.alias);
      else if (!shouldBeHidden && !isRegistered) umbExtensionsRegistry.register(manifest);
    });

    const liveCustomThemes = umbExtensionsRegistry
      .getByType("theme")
      .filter((manifest) => manifest.alias.startsWith(CUSTOM_THEME_ALIAS_PREFIX));
    liveCustomThemes.forEach((manifest) => {
      if (!active.customThemes.some((theme) => theme.alias === manifest.alias)) {
        umbExtensionsRegistry.unregister(manifest.alias);
        this.#registeredCustomThemeColors.delete(manifest.alias);
      }
    });
    active.customThemes.forEach((theme) => this.#registerCustomTheme(theme));
  }

  // Registers (or re-registers, if its colours changed since it was last applied) a custom
  // theme's manifest. Its css() loader is a closure over theme.colors captured at registration
  // time, so an edit has to unregister-then-register rather than relying on the registry to
  // pick up new colours for an alias it already has.
  #registerCustomTheme(theme: CustomTheme) {
    const colorsKey = JSON.stringify(theme.colors);
    if (this.#registeredCustomThemeColors.get(theme.alias) === colorsKey) return;

    // Recorded before register() below, not after - registering fires the "theme" byType
    // observable (custom themes are themes too), which re-enters #applyState synchronously.
    // Setting this first makes that reentrant call see the up-to-date key and bail out via the
    // guard above, instead of racing this call to register the same alias a second time.
    this.#registeredCustomThemeColors.set(theme.alias, colorsKey);

    if (umbExtensionsRegistry.isRegistered(theme.alias)) {
      umbExtensionsRegistry.unregister(theme.alias);
    }
    umbExtensionsRegistry.register({
      type: "theme",
      alias: theme.alias,
      name: theme.name,
      weight: 0,
      css: () => Promise.resolve({ css: themeColorsToCss(theme.colors) }),
    });
  }

  observeInstalledThemes(): Observable<ManifestTheme[]> {
    return this.#baseline$;
  }

  observeSettings(): Observable<ThemeMakerSettings> {
    return this.#settings$;
  }

  /** Persists the given settings and immediately re-applies them against the live registry. */
  async save(settings: ThemeMakerSettings): Promise<void> {
    await this.#powerToyContext?.saveSettings<ThemeMakerSettings>(THEME_MAKER_ALIAS, settings);
    this.#settings.setValue(settings);
    this.#applyState();
  }
}

export const THEME_MAKER_CONTEXT = new UmbContextToken<ThemeMakerContext>("ThemeMakerContext");

export default ThemeMakerContext;
