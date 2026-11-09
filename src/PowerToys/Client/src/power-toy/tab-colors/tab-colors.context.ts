import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { UmbBasicState } from "@umbraco-cms/backoffice/observable-api";
import type { Observable } from "@umbraco-cms/backoffice/external/rxjs";
import { UMB_POWER_TOY_CONTEXT, type UmbPowerToyContext } from "../power-toy.context.js";
import { DEFAULT_TAB_COLORS_SETTINGS, withDefaults, type TabColorsSettings } from "./tab-colors-settings.js";
import { installTabColorsPatch, setTabColors } from "./tab-colors.patch.js";

export const TAB_COLORS_ALIAS = "PowerToys.PowerToy.TabColors";

// Global, like Icon Colors - tabs are drawn in every content editor, so the colours have to be
// ready before one opens, not only while the settings modal is.
export class TabColorsContext extends UmbContextBase {
  #powerToyContext?: UmbPowerToyContext;
  #enabled = true;

  #settings = new UmbBasicState<TabColorsSettings>(DEFAULT_TAB_COLORS_SETTINGS);
  #settings$ = this.#settings.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, TAB_COLORS_CONTEXT);

    installTabColorsPatch();

    this.consumeContext(UMB_POWER_TOY_CONTEXT, (context) => {
      this.#powerToyContext = context;
      if (!context) return;
      this.#loadSettings();

      this.observe(context.observeEnabled(TAB_COLORS_ALIAS), (enabled) => {
        this.#enabled = enabled;
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
    const tabs = this.#enabled ? this.#settings.getValue().tabs : {};
    setTabColors(new Map(Object.entries(tabs).map(([id, tab]) => [id, tab.color])));
  }

  observeSettings(): Observable<TabColorsSettings> {
    return this.#settings$;
  }

  /** Persists the given settings and immediately repaints any open editors. */
  async save(settings: TabColorsSettings): Promise<void> {
    await this.#powerToyContext?.saveSettings<TabColorsSettings>(TAB_COLORS_ALIAS, settings);
    this.#settings.setValue(settings);
    this.#applyState();
  }
}

export const TAB_COLORS_CONTEXT = new UmbContextToken<TabColorsContext>("TabColorsContext");

export default TabColorsContext;
