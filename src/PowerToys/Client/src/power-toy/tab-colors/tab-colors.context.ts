import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { UmbBasicState, UmbBooleanState } from "@umbraco-cms/backoffice/observable-api";
import type { Observable } from "@umbraco-cms/backoffice/external/rxjs";
import { UMB_POWER_TOY_CONTEXT, type UmbPowerToyContext } from "../power-toy.context.js";
import {
  DEFAULT_TAB_COLORS_SETTINGS,
  resolveTabColor,
  withDefaults,
  type TabColor,
  type TabColorsSettings,
  type TabStyle,
} from "./tab-colors-settings.js";
import { installTabColorsPatch, setTabStyles } from "./tab-colors.patch.js";

export const TAB_COLORS_ALIAS = "PowerToys.PowerToy.TabColors";

// Global, like Icon Colors - tabs are drawn in every content editor, so the colours have to be
// ready before one opens, not only while the settings modal is.
export class TabColorsContext extends UmbContextBase {
  #powerToyContext?: UmbPowerToyContext;

  #enabled = new UmbBooleanState(false);
  #locked = new UmbBooleanState(false);

  #settings = new UmbBasicState<TabColorsSettings>(DEFAULT_TAB_COLORS_SETTINGS);
  #settings$ = this.#settings.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, TAB_COLORS_CONTEXT);

    installTabColorsPatch();

    this.consumeContext(UMB_POWER_TOY_CONTEXT, (context) => {
      this.#powerToyContext = context;
      if (!context) return;
      this.#loadSettings();
      context.isSettingsLocked(TAB_COLORS_ALIAS).then((locked) => this.#locked.setValue(locked));

      this.observe(context.observeEnabled(TAB_COLORS_ALIAS), (enabled) => {
        this.#enabled.setValue(enabled);
        this.#applyState();
      });
    });
  }

  async #loadSettings() {
    const settings = await this.#powerToyContext?.getSettings<TabColorsSettings>(TAB_COLORS_ALIAS);
    this.#settings.setValue(withDefaults(settings));
    this.#applyState();
  }

  #applyState() {
    const enabled = this.#enabled.getValue();
    const tabs = enabled ? this.#settings.getValue().tabs : {};
    const styles = new Map<string, TabStyle>();
    Object.entries(tabs).forEach(([id, tab]) => {
      const style = { color: resolveTabColor(tab.color), icon: tab.icon || undefined };
      if (style.color || style.icon) styles.set(id, style);
    });
    setTabStyles(styles, enabled);
  }

  observeSettings(): Observable<TabColorsSettings> {
    return this.#settings$;
  }

  /** Whether the power toy is switched on - the designer's picker only shows while it is. */
  observeEnabled(): Observable<boolean> {
    return this.#enabled.asObservable();
  }

  /** Whether the settings are fixed by appsettings.json, so colours can be shown but not changed. */
  observeLocked(): Observable<boolean> {
    return this.#locked.asObservable();
  }

  /** Persists the given settings and immediately repaints any open editors. */
  async save(settings: TabColorsSettings): Promise<void> {
    await this.#powerToyContext?.saveSettings<TabColorsSettings>(TAB_COLORS_ALIAS, settings);
    this.#settings.setValue(settings);
    this.#applyState();
  }

  /**
   * Sets (or, with null, removes) the style for individual tab containers and saves straight
   * away - used by the designer's picker, which has no Save button of its own.
   */
  async update(changes: Record<string, TabColor | null>): Promise<void> {
    const tabs = { ...this.#settings.getValue().tabs };
    Object.entries(changes).forEach(([id, tab]) => {
      if (tab) tabs[id] = tab;
      else delete tabs[id];
    });
    await this.save({ ...this.#settings.getValue(), tabs });
  }
}

export const TAB_COLORS_CONTEXT = new UmbContextToken<TabColorsContext>("TabColorsContext");

export default TabColorsContext;
