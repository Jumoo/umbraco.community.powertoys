import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { UmbBasicState, UmbBooleanState } from "@umbraco-cms/backoffice/observable-api";
import type { Observable } from "@umbraco-cms/backoffice/external/rxjs";
import { UMB_POWER_TOY_CONTEXT, type UmbPowerToyContext } from "../power-toy.context.js";
import {
  DEFAULT_TAB_ICONS_SETTINGS,
  resolveTabColor,
  withDefaults,
  type TabIcon,
  type TabIconsSettings,
  type TabStyle,
} from "./tab-icons-settings.js";
import { installTabIconsPatch, setTabStyles } from "./tab-icons.patch.js";

export const TAB_ICONS_ALIAS = "PowerToys.PowerToy.TabIcons";

// Global, like Icon Colors - tabs are drawn in every content editor, so the colours have to be
// ready before one opens, not only while the settings modal is.
export class TabIconsContext extends UmbContextBase {
  #powerToyContext?: UmbPowerToyContext;

  #enabled = new UmbBooleanState(false);
  #locked = new UmbBooleanState(false);

  #settings = new UmbBasicState<TabIconsSettings>(DEFAULT_TAB_ICONS_SETTINGS);
  #settings$ = this.#settings.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, TAB_ICONS_CONTEXT);

    installTabIconsPatch();

    this.consumeContext(UMB_POWER_TOY_CONTEXT, (context) => {
      this.#powerToyContext = context;
      if (!context) return;
      this.#loadSettings();
      context.isSettingsLocked(TAB_ICONS_ALIAS).then((locked) => this.#locked.setValue(locked));

      this.observe(context.observeEnabled(TAB_ICONS_ALIAS), (enabled) => {
        this.#enabled.setValue(enabled);
        this.#applyState();
      });
    });
  }

  async #loadSettings() {
    const settings = await this.#powerToyContext?.getSettings<TabIconsSettings>(TAB_ICONS_ALIAS);
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

  observeSettings(): Observable<TabIconsSettings> {
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
  async save(settings: TabIconsSettings): Promise<void> {
    await this.#powerToyContext?.saveSettings<TabIconsSettings>(TAB_ICONS_ALIAS, settings);
    this.#settings.setValue(settings);
    this.#applyState();
  }

  /**
   * Sets (or, with null, removes) the style for individual tab containers and saves straight
   * away - used by the designer's picker, which has no Save button of its own.
   */
  async update(changes: Record<string, TabIcon | null>): Promise<void> {
    const tabs = { ...this.#settings.getValue().tabs };
    Object.entries(changes).forEach(([id, tab]) => {
      if (tab) tabs[id] = tab;
      else delete tabs[id];
    });
    await this.save({ ...this.#settings.getValue(), tabs });
  }
}

export const TAB_ICONS_CONTEXT = new UmbContextToken<TabIconsContext>("TabIconsContext");

export default TabIconsContext;
