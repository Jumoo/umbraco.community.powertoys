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
  /** Dashboard aliases in the desired display order (front to back). Aliases not listed keep their registered weight. */
  order: string[];
}

// Spacing large enough that inserting/re-deriving order never collides with a manifest's own
// registered weight, while still sorting the same way the extension registry does (descending).
const ORDER_BASE_WEIGHT = 100000;

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

  #order = new UmbBasicState<string[]>([]);
  #order$ = this.#order.asObservable();

  // Whether the power toy itself is switched on - while it's off, the saved removed-alias set
  // is kept but never applied (every dashboard comes back), so flipping it back on (or off) is
  // instantly reversible either way. Same shape as ThemeMakerContext/HelpMenuEditorContext.
  #enabled = true;

  // Guards against re-entrancy: unregister()/register() below both synchronously push a new
  // value through the registry's extensions state, which re-notifies our own byType("dashboard")
  // subscription before the pair has finished - without this, that nested call would re-register
  // the alias we're mid-way through moving, and our own register() call would then find it
  // already there and log "already registered".
  #applying = false;

  constructor(host: UmbControllerHost) {
    super(host, DASHBOARD_MANAGER_CONTEXT);

    this.consumeContext(UMB_POWER_TOY_CONTEXT, (context) => {
      this.#powerToyContext = context;
      if (!context) return;
      this.#loadSettings();

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

  async #loadSettings() {
    const settings = await this.#powerToyContext?.getSettings<DashboardManagerSettings>(DASHBOARD_MANAGER_ALIAS);
    this.#removed.setValue(this.#sanitize(settings?.removedAliases ?? []));
    this.#order.setValue(settings?.order ?? []);
    this.#applyState();
  }

  // A dashboard's position in the order list becomes an overriding weight - descending, to match
  // how the extension registry itself sorts (highest weight first) - so relative order between
  // dashboards in the same section comes out the way the list was arranged, regardless of section.
  // A dashboard absent from the order list keeps its originally-registered weight untouched.
  #weightFor(manifest: ManifestDashboard, order: string[]): number | undefined {
    const index = order.indexOf(manifest.alias);
    return index === -1 ? manifest.weight : ORDER_BASE_WEIGHT - index;
  }

  // Reconciles the live extension registry against the removed set and order that should currently
  // be in effect - the saved values while the power toy is enabled, or the untouched originals
  // while it's disabled. Safe to call any number of times from any trigger (settings loaded,
  // baseline dashboard registered, enabled flag flipped, settings saved) since it always compares
  // desired vs. actual state rather than diffing against whatever ran last - re-registering only
  // when a dashboard's visibility or weight actually needs to change, so this doesn't loop forever
  // reacting to its own registry writes.
  #applyState() {
    if (this.#applying) return;
    this.#applying = true;

    try {
      const effectiveRemoved = this.#enabled ? this.#removed.getValue() ?? [] : [];
      const effectiveOrder = this.#enabled ? this.#order.getValue() ?? [] : [];

      this.#baseline.getValue()?.forEach((manifest) => {
        const shouldBeHidden = effectiveRemoved.includes(manifest.alias);
        const current = umbExtensionsRegistry.getByAlias<ManifestDashboard>(manifest.alias);

        if (shouldBeHidden) {
          if (current) umbExtensionsRegistry.unregister(manifest.alias);
          return;
        }

        const desiredWeight = this.#weightFor(manifest, effectiveOrder);
        if (!current) {
          umbExtensionsRegistry.register(desiredWeight === manifest.weight ? manifest : { ...manifest, weight: desiredWeight });
        } else if (current.weight !== desiredWeight) {
          umbExtensionsRegistry.unregister(manifest.alias);
          umbExtensionsRegistry.register({ ...manifest, weight: desiredWeight });
        }
      });
    } finally {
      this.#applying = false;
    }
  }

  observeAvailableDashboards(): Observable<ManifestDashboard[]> {
    return this.#baseline$;
  }

  observeRemovedAliases(): Observable<string[]> {
    return this.#removed$;
  }

  observeOrder(): Observable<string[]> {
    return this.#order$;
  }

  /** Persists the given removed-alias set and display order, then immediately re-applies them against the live registry. */
  async save(removedAliases: string[], order: string[]): Promise<void> {
    removedAliases = this.#sanitize(removedAliases);
    await this.#powerToyContext?.saveSettings<DashboardManagerSettings>(DASHBOARD_MANAGER_ALIAS, {
      removedAliases,
      order,
    });
    this.#removed.setValue(removedAliases);
    this.#order.setValue(order);
    this.#applyState();
  }
}

export const DASHBOARD_MANAGER_CONTEXT = new UmbContextToken<DashboardManagerContext>("DashboardManagerContext");

export default DashboardManagerContext;
