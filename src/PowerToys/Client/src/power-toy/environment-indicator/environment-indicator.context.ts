import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { UmbBasicState } from "@umbraco-cms/backoffice/observable-api";
import type { Observable } from "@umbraco-cms/backoffice/external/rxjs";
import { UMB_POWER_TOY_CONTEXT, type UmbPowerToyContext } from "../power-toy.context.js";
import {
  DEFAULT_ENVIRONMENT_INDICATOR_SETTINGS,
  matchEnvironment,
  withDefaults,
  type EnvironmentDefinition,
  type EnvironmentIndicatorSettings,
} from "./environment-indicator-settings.js";

export const ENVIRONMENT_INDICATOR_ALIAS = "PowerToys.PowerToy.EnvironmentIndicator";

// The CSS custom property the backoffice header reads its background from - same one uSync's
// server-workspace-shared.context.ts sets when a publish server has its own colour.
const HEADER_SURFACE_PROPERTY = "--uui-color-header-surface";

// Owns the "which environment matches this browser tab" decision, and keeps the header's
// colour in sync with it - provided globally so the colour is set as soon as the backoffice
// loads, not only while the settings modal happens to be open.
export class EnvironmentIndicatorContext extends UmbContextBase {
  #powerToyContext?: UmbPowerToyContext;

  // Whether the power toy itself is switched on - while it's off, the saved settings are kept
  // but never applied, so flipping it back on (or off) is instantly reversible either way.
  #enabled = true;

  #settings = new UmbBasicState<EnvironmentIndicatorSettings>(DEFAULT_ENVIRONMENT_INDICATOR_SETTINGS);
  #settings$ = this.#settings.asObservable();

  #match = new UmbBasicState<EnvironmentDefinition | undefined>(undefined);
  #match$ = this.#match.asObservable();

  #environmentName: string | null = null;

  constructor(host: UmbControllerHost) {
    super(host, ENVIRONMENT_INDICATOR_CONTEXT);

    this.consumeContext(UMB_POWER_TOY_CONTEXT, (context) => {
      this.#powerToyContext = context;
      if (!context) return;
      this.#loadSettings();

      this.observe(context.observeEnabled(ENVIRONMENT_INDICATOR_ALIAS), (enabled) => {
        this.#enabled = enabled;
        this.#applyState();
      });
    });
  }

  async #loadSettings() {
    const [settings, environmentName] = await Promise.all([
      this.#powerToyContext?.getSettings<EnvironmentIndicatorSettings>(ENVIRONMENT_INDICATOR_ALIAS),
      this.#powerToyContext?.getEnvironmentName(),
    ]);
    this.#environmentName = environmentName ?? null;
    this.#settings.setValue(withDefaults(settings));
    this.#applyState();
  }

  // Recomputes which environment (if any) matches the current tab, and pushes its colour onto
  // the header - safe to call any number of times from any trigger (settings loaded, enabled
  // flag flipped, settings saved) since it always compares desired vs. actual state rather than
  // diffing against whatever ran last.
  #applyState() {
    const settings = this.#settings.getValue();
    if (!settings) return;
    const active = this.#enabled ? settings : DEFAULT_ENVIRONMENT_INDICATOR_SETTINGS;

    const match = matchEnvironment(active.environments, window.location.href, this.#environmentName);
    this.#match.setValue(match);

    if (match?.color) {
      document.documentElement.style.setProperty(HEADER_SURFACE_PROPERTY, match.color);
    } else {
      document.documentElement.style.removeProperty(HEADER_SURFACE_PROPERTY);
    }
  }

  /** The environment (if any) matching the current tab's URL, kept live as settings change. */
  observeMatch(): Observable<EnvironmentDefinition | undefined> {
    return this.#match$;
  }

  observeSettings(): Observable<EnvironmentIndicatorSettings> {
    return this.#settings$;
  }

  /** Persists the given settings and immediately re-applies them against the current tab. */
  async save(settings: EnvironmentIndicatorSettings): Promise<void> {
    await this.#powerToyContext?.saveSettings<EnvironmentIndicatorSettings>(ENVIRONMENT_INDICATOR_ALIAS, settings);
    this.#settings.setValue(settings);
    this.#applyState();
  }
}

export const ENVIRONMENT_INDICATOR_CONTEXT = new UmbContextToken<EnvironmentIndicatorContext>(
  "EnvironmentIndicatorContext",
);

export default EnvironmentIndicatorContext;
