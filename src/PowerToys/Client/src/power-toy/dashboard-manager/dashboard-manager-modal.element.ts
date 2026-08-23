import { LitElement, css, html, customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { umbExtensionsRegistry } from "@umbraco-cms/backoffice/extension-registry";
import { UMB_SECTION_ALIAS_CONDITION_ALIAS, type ManifestSection } from "@umbraco-cms/backoffice/section";
import type { ManifestDashboard } from "@umbraco-cms/backoffice/dashboard";
import type { ManifestPowerToy } from "../power-toy.extension.js";
import type { UmbPowerToyElement } from "../power-toy-element.interface.js";
import { POWER_TOYS_DASHBOARD_ALIAS } from "../../dashboards/manifest.js";
import { DASHBOARD_MANAGER_CONTEXT, type DashboardManagerContext } from "./dashboard-manager.context.js";
import "./dashboard-manager-section.element.js";

interface DashboardManagerSectionGroup {
  section: string | undefined;
  dashboards: ManifestDashboard[];
}

// Loaded into the shared power-toys-modal - lists every dashboard ever seen (the baseline,
// which survives unregistering) grouped by section, each with a toggle and a drag handle so
// order can be customised per section. Pending changes are kept local until the modal's Save
// button calls save(), which is when they're persisted and applied.
@customElement("power-toys-dashboard-manager-modal")
export class DashboardManagerModalElement extends UmbElementMixin(LitElement) implements UmbPowerToyElement {
  @property({ attribute: false })
  manifest?: ManifestPowerToy;

  @state()
  private _dashboards: ManifestDashboard[] = [];

  @state()
  private _pendingRemoved: string[] = [];

  @state()
  private _pendingOrder: string[] = [];

  #context?: DashboardManagerContext;

  constructor() {
    super();
    this.consumeContext(DASHBOARD_MANAGER_CONTEXT, (context) => {
      this.#context = context;
      if (!context) return;
      this.observe(context.observeAvailableDashboards(), (dashboards) => {
        this._dashboards = dashboards;
      });
      this.observe(context.observeRemovedAliases(), (removed) => {
        this._pendingRemoved = removed;
      });
      this.observe(context.observeOrder(), (order) => {
        this._pendingOrder = order;
      });
    });
  }

  async save(): Promise<void> {
    await this.#context?.save(this._pendingRemoved, this._pendingOrder);
  }

  #onToggle = (alias: string, visible: boolean) => {
    if (alias === POWER_TOYS_DASHBOARD_ALIAS) return;
    this._pendingRemoved = visible
      ? this._pendingRemoved.filter((a) => a !== alias)
      : [...this._pendingRemoved, alias];
  };

  // Replaces just the reordered section's run of aliases within the full display order, leaving
  // every other section's aliases exactly where they already were.
  #onSectionSorted = (sectionOrder: string[]) => {
    const fullOrder = this.#groupedSections().flatMap((group) => group.dashboards.map((d) => d.alias));
    const sectionAliases = new Set(sectionOrder);
    let cursor = 0;
    this._pendingOrder = fullOrder.map((alias) => (sectionAliases.has(alias) ? sectionOrder[cursor++] : alias));
  };

  // Clears the custom order for just this section's dashboards, leaving every other section's
  // saved order untouched.
  #onResetSectionOrder = (dashboards: ManifestDashboard[]) => {
    const aliases = new Set(dashboards.map((dashboard) => dashboard.alias));
    this._pendingOrder = this._pendingOrder.filter((alias) => !aliases.has(alias));
  };

  // Dashboard labels/section labels can be either plain text or a legacy "#term" reference -
  // localize.string() resolves the latter and passes plain text straight through.
  #label(dashboard: ManifestDashboard): string {
    return this.localize.string(dashboard.meta.label ?? dashboard.name);
  }

  #sectionLabel(dashboard: ManifestDashboard): string | undefined {
    const condition = dashboard.conditions?.find(
      (condition) => condition.alias === UMB_SECTION_ALIAS_CONDITION_ALIAS,
    ) as { match?: string } | undefined;
    const sectionAlias = condition?.match;
    if (!sectionAlias) return undefined;

    const section = umbExtensionsRegistry.getByAlias<ManifestSection>(sectionAlias);
    return this.localize.string(section?.meta.label ?? sectionAlias);
  }

  // Groups dashboards by section, ordered by the pending custom order first. Anything not yet
  // customised (which, before the first save, is everything) falls back to registered weight,
  // descending - the same key the extension registry itself sorts by - so the modal's default
  // listing actually matches what's on screen instead of just alphabetising it.
  #groupedSections(): DashboardManagerSectionGroup[] {
    const orderIndex = (dashboard: ManifestDashboard) => {
      const index = this._pendingOrder.indexOf(dashboard.alias);
      return index === -1 ? this._pendingOrder.length : index;
    };

    const sorted = [...this._dashboards].sort((a, b) => {
      const sectionCompare = (this.#sectionLabel(a) ?? "").localeCompare(this.#sectionLabel(b) ?? "");
      if (sectionCompare !== 0) return sectionCompare;
      return (
        orderIndex(a) - orderIndex(b) ||
        (b.weight ?? 0) - (a.weight ?? 0) ||
        this.#label(a).localeCompare(this.#label(b))
      );
    });

    const groups: DashboardManagerSectionGroup[] = [];
    for (const dashboard of sorted) {
      const section = this.#sectionLabel(dashboard);
      const group = groups[groups.length - 1];
      if (group?.section === section) group.dashboards.push(dashboard);
      else groups.push({ section, dashboards: [dashboard] });
    }
    return groups;
  }

  render() {
    if (!this._dashboards.length) {
      return html`<p>No dashboards are currently registered.</p>`;
    }
    return html`
      <p>Turn dashboards on and off, and drag to reorder them within each section - hidden ones stay listed here so you can bring them back.</p>
      ${this.#groupedSections().map(
        (group) => html`
          <div class="section-heading">
            <h5>${group.section ?? "No section"}</h5>
            <uui-button compact label="Reset order" @click=${() => this.#onResetSectionOrder(group.dashboards)}
              >Reset order</uui-button
            >
          </div>
          <power-toys-dashboard-manager-section
            .dashboards=${group.dashboards}
            .pendingRemoved=${this._pendingRemoved}
            @dashboards-sorted=${(e: CustomEvent<string[]>) => this.#onSectionSorted(e.detail)}
            @dashboard-toggled=${(e: CustomEvent<{ alias: string; visible: boolean }>) =>
              this.#onToggle(e.detail.alias, e.detail.visible)}>
          </power-toys-dashboard-manager-section>
        `,
      )}
    `;
  }

  static styles = [
    css`
      .section-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--uui-size-space-4);
        margin: var(--uui-size-space-4) 0 var(--uui-size-space-2);
      }

      .section-heading:first-of-type {
        margin-top: 0;
      }

      h5 {
        margin: 0;
      }
    `,
  ];
}

export default DashboardManagerModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-dashboard-manager-modal": DashboardManagerModalElement;
  }
}
