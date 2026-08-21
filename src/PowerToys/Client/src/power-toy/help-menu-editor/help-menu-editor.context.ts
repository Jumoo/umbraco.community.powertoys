import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { umbExtensionsRegistry } from "@umbraco-cms/backoffice/extension-registry";
import { UmbArrayState, UmbBasicState } from "@umbraco-cms/backoffice/observable-api";
import type { Observable } from "@umbraco-cms/backoffice/external/rxjs";
import { UMB_HELP_MENU_ALIAS } from "@umbraco-cms/backoffice/help";
import type { ManifestMenuItem } from "@umbraco-cms/backoffice/menu";
import type { ManifestHeaderApp } from "@umbraco-cms/backoffice/extension-registry";
import { UMB_POWER_TOY_CONTEXT, type UmbPowerToyContext } from "../power-toy.context.js";
import { DEFAULT_HELP_MENU_EDITOR_SETTINGS, withDefaults, type HelpMenuEditorSettings } from "./help-menu-editor-settings.js";

export const HELP_MENU_EDITOR_ALIAS = "PowerToys.PowerToy.HelpMenuEditor";
export const HELP_HEADER_APP_ALIAS = "Umb.HeaderApp.Help";
export const CUSTOM_LINK_ALIAS_PREFIX = "PowerToys.HelpMenuEditor.CustomLink.";

// Owns everything the Help Menu Editor's modal needs, and keeps enforcing it live -
// help menu items (and the header app itself) are registered reactively, sometime after
// this global context is constructed, not necessarily all at once up front. Same shape as
// DashboardManagerContext, applied to Umb.Menu.Help instead of dashboards.
export class HelpMenuEditorContext extends UmbContextBase {
  #powerToyContext?: UmbPowerToyContext;

  // Append-only: every built-in/other-package help menu item alias ever seen (excluding our
  // own custom links, which have their own list), even after we've unregistered it.
  #baseline = new UmbArrayState<ManifestMenuItem, string>([], (x) => x.alias);
  #baseline$ = this.#baseline.asObservable();

  // The real help header app manifest, captured the first time it's seen - restoring it later
  // re-registers the exact same manifest rather than a hand-rolled guess at its shape.
  #headerApp?: ManifestHeaderApp;

  // Whether the power toy itself is switched on - while it's off, the saved settings are kept
  // but never applied, so flipping it back on (or off) is instantly reversible either way.
  #enabled = true;

  #settings = new UmbBasicState<HelpMenuEditorSettings>(DEFAULT_HELP_MENU_EDITOR_SETTINGS);
  #settings$ = this.#settings.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, HELP_MENU_EDITOR_CONTEXT);

    this.consumeContext(UMB_POWER_TOY_CONTEXT, (context) => {
      this.#powerToyContext = context;
      if (!context) return;
      this.#loadSettings();

      this.observe(context.observeEnabled(HELP_MENU_EDITOR_ALIAS), (enabled) => {
        this.#enabled = enabled;
        this.#applyState();
      });
    });

    this.observe(umbExtensionsRegistry.byType("menuItem"), (manifests) => {
      // Every menuItem kind shares the same MetaMenuItem base shape (label/menus/icon) -
      // only their js/element loader typing differs, which we never touch here.
      const items = manifests.filter(
        (manifest) => manifest.meta?.menus?.includes(UMB_HELP_MENU_ALIAS) && !manifest.alias.startsWith(CUSTOM_LINK_ALIAS_PREFIX),
      ) as ManifestMenuItem[];
      this.#baseline.append(items);
      this.#applyState();
    });

    this.observe(umbExtensionsRegistry.byType("headerApp"), (manifests) => {
      const headerApp = manifests.find((manifest) => manifest.alias === HELP_HEADER_APP_ALIAS);
      if (headerApp) this.#headerApp = headerApp as ManifestHeaderApp;
      this.#applyState();
    });
  }

  async #loadSettings() {
    const settings = await this.#powerToyContext?.getSettings<HelpMenuEditorSettings>(HELP_MENU_EDITOR_ALIAS);
    this.#settings.setValue(withDefaults(settings));
    this.#applyState();
  }

  // Reconciles the live extension registry against the settings that should currently be in
  // effect - the saved settings while the power toy is enabled, or none at all while it's
  // disabled. Safe to call any number of times from any trigger (settings loaded, baseline
  // item/header app registered, enabled flag flipped, settings saved) since it always compares
  // desired vs. actual state rather than diffing against whatever ran last.
  #applyState() {
    const settings = this.#settings.getValue();
    if (!settings) return;
    const active = this.#enabled ? settings : DEFAULT_HELP_MENU_EDITOR_SETTINGS;

    this.#baseline.getValue()?.forEach((manifest) => {
      const shouldBeHidden = active.disabledItems.includes(manifest.alias);
      const isRegistered = umbExtensionsRegistry.isRegistered(manifest.alias);
      if (shouldBeHidden && isRegistered) umbExtensionsRegistry.unregister(manifest.alias);
      else if (!shouldBeHidden && !isRegistered) umbExtensionsRegistry.register(manifest);
    });

    if (this.#headerApp) {
      const isRegistered = umbExtensionsRegistry.isRegistered(HELP_HEADER_APP_ALIAS);
      if (active.disableHelpMenu && isRegistered) umbExtensionsRegistry.unregister(HELP_HEADER_APP_ALIAS);
      else if (!active.disableHelpMenu && !isRegistered) umbExtensionsRegistry.register(this.#headerApp);
    }

    const liveCustomLinks = umbExtensionsRegistry
      .getByType("menuItem")
      .filter((manifest) => manifest.alias.startsWith(CUSTOM_LINK_ALIAS_PREFIX));
    liveCustomLinks.forEach((manifest) => {
      if (!active.customLinks.some((link) => link.alias === manifest.alias)) {
        umbExtensionsRegistry.unregister(manifest.alias);
      }
    });
    active.customLinks.forEach((link) => {
      if (umbExtensionsRegistry.isRegistered(link.alias)) return;
      umbExtensionsRegistry.register({
        type: "menuItem",
        kind: "link",
        alias: link.alias,
        name: link.name,
        meta: {
          menus: [UMB_HELP_MENU_ALIAS],
          label: link.name,
          icon: link.icon,
          href: link.href,
        },
      });
    });
  }

  observeAvailableItems(): Observable<ManifestMenuItem[]> {
    return this.#baseline$;
  }

  observeSettings(): Observable<HelpMenuEditorSettings> {
    return this.#settings$;
  }

  /** Persists the given settings and immediately re-applies them against the live registry. */
  async save(settings: HelpMenuEditorSettings): Promise<void> {
    await this.#powerToyContext?.saveSettings<HelpMenuEditorSettings>(HELP_MENU_EDITOR_ALIAS, settings);
    this.#settings.setValue(settings);
    this.#applyState();
  }
}

export const HELP_MENU_EDITOR_CONTEXT = new UmbContextToken<HelpMenuEditorContext>("HelpMenuEditorContext");

export default HelpMenuEditorContext;
