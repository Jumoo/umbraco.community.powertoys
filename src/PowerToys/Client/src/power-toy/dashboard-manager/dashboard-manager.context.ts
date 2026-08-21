import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { umbExtensionsRegistry } from "@umbraco-cms/backoffice/extension-registry";
import { UmbArrayState, UmbBasicState } from "@umbraco-cms/backoffice/observable-api";
import type { Observable } from "@umbraco-cms/backoffice/external/rxjs";
import type { ManifestDashboard } from "@umbraco-cms/backoffice/dashboard";
import { UMB_POWER_TOY_CONTEXT, type UmbPowerToyContext } from "../power-toy.context.js";
import { POWER_TOYS_DASHBOARD_ALIAS } from "../../dashboards/manifest.js";

export const DASHBOARD_MANAGER_ALIAS = "PowerToys.PowerToy.DashboardManager";

interface DashboardManagerSettings {
  removedAliases: string[];
}

// Owns two things every removable-extension manager needs: a baseline that survives
// unregistering (so a removed dashboard can still be listed and re-added), and continuous
// enforcement of the removed set - because dashboard manifests are registered reactively,
// sometime after this global context is constructed, not necessarily all at once up front.
export class DashboardManagerContext extends UmbContextBase {
  #powerToyContext?: UmbPowerToyContext;

  // Append-only: every dashboard alias ever seen, even after we've unregistered it.
  #baseline = new UmbArrayState<ManifestDashboard, string>([], (x) => x.alias);
  #baseline$ = this.#baseline.asObservable();

  #removed = new UmbBasicState<string[]>([]);
  #removed$ = this.#removed.asObservable();

  // Whether the power toy itself is switched on - while it's off, the saved removed-alias set
  // is kept but never applied (every dashboard comes back), so flipping it back on (or off) is
  // instantly reversible either way. Same shape as ThemeMakerContext/HelpMenuEditorContext.
  #enabled = true;

  constructor(host: UmbControllerHost) {
    super(host, DASHBOARD_MANAGER_CONTEXT);

    this.consumeContext(UMB_POWER_TOY_CONTEXT, (context) => {
      this.#powerToyContext = context;
      if (!context) return;
      this.#loadRemoved();

      this.observe(context.observeEnabled(DASHBOARD_MANAGER_ALIAS), (enabled) => {
        this.#enabled = enabled;
        this.#applyState();
      });
    });

    this.observe(umbExtensionsRegistry.byType("dashboard"), (manifests) => {
      this.#baseline.append(manifests);
      this.#applyState();
    });
  }

  // The Power Toys dashboard itself is never allowed in the removed set - removing it would
  // take away the only way to bring dashboards back.
  #sanitize(aliases: string[]): string[] {
    return aliases.filter((alias) => alias !== POWER_TOYS_DASHBOARD_ALIAS);
  }

  async #loadRemoved() {
    const settings = await this.#powerToyContext?.getSettings<DashboardManagerSettings>(DASHBOARD_MANAGER_ALIAS);
    this.#removed.setValue(this.#sanitize(settings?.removedAliases ?? []));
    this.#applyState();
  }

  // Reconciles the live extension registry against the removed set that should currently be in
  // effect - the saved removed aliases while the power toy is enabled, or none at all while
  // it's disabled. Safe to call any number of times from any trigger (removed aliases loaded,
  // baseline dashboard registered, enabled flag flipped, removed aliases saved) since it always
  // compares desired vs. actual state rather than diffing against whatever ran last.
  #applyState() {
    const effectiveRemoved = this.#enabled ? this.#removed.getValue() ?? [] : [];

    this.#baseline.getValue()?.forEach((manifest) => {
      const shouldBeHidden = effectiveRemoved.includes(manifest.alias);
      const isRegistered = umbExtensionsRegistry.isRegistered(manifest.alias);
      if (shouldBeHidden && isRegistered) umbExtensionsRegistry.unregister(manifest.alias);
      else if (!shouldBeHidden && !isRegistered) umbExtensionsRegistry.register(manifest);
    });
  }

  observeAvailableDashboards(): Observable<ManifestDashboard[]> {
    return this.#baseline$;
  }

  observeRemovedAliases(): Observable<string[]> {
    return this.#removed$;
  }

  /** Persists the given removed-alias set and immediately re-applies it against the live registry. */
  async save(removedAliases: string[]): Promise<void> {
    removedAliases = this.#sanitize(removedAliases);
    await this.#powerToyContext?.saveSettings<DashboardManagerSettings>(DASHBOARD_MANAGER_ALIAS, { removedAliases });
    this.#removed.setValue(removedAliases);
    this.#applyState();
  }
}

export const DASHBOARD_MANAGER_CONTEXT = new UmbContextToken<DashboardManagerContext>("DashboardManagerContext");

export default DashboardManagerContext;
