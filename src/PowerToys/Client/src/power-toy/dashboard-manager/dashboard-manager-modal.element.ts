import { LitElement, css, html, customElement, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { umbExtensionsRegistry } from "@umbraco-cms/backoffice/extension-registry";
import { UMB_SECTION_ALIAS_CONDITION_ALIAS, type ManifestSection } from "@umbraco-cms/backoffice/section";
import type { ManifestDashboard } from "@umbraco-cms/backoffice/dashboard";
import type { ManifestPowerToy } from "../power-toy.extension.js";
import type { UmbPowerToyElement } from "../power-toy-element.interface.js";
import { POWER_TOYS_DASHBOARD_ALIAS } from "../../dashboards/manifest.js";
import { DASHBOARD_MANAGER_CONTEXT, type DashboardManagerContext } from "./dashboard-manager.context.js";

// Loaded into the shared power-toys-modal - lists every dashboard ever seen (the baseline,
// which survives unregistering) with a toggle per row, and keeps pending changes local until
// the modal's Save button calls save(), which is when they're persisted and applied.
@customElement("power-toys-dashboard-manager-modal")
export class DashboardManagerModalElement extends UmbElementMixin(LitElement) implements UmbPowerToyElement {
  @property({ attribute: false })
  manifest?: ManifestPowerToy;

  @state()
  private _dashboards: ManifestDashboard[] = [];

  @state()
  private _pendingRemoved: string[] = [];

  #context?: DashboardManagerContext;

  constructor() {
    super();
    this.consumeContext(DASHBOARD_MANAGER_CONTEXT, (context) => {
      this.#context = context;
      if (!context) return;
      this.observe(context.observeAvailableDashboards(), (dashboards) => {
        this._dashboards = [...dashboards].sort((a, b) => {
          const section = (this.#sectionLabel(a) ?? "").localeCompare(this.#sectionLabel(b) ?? "");
          return section !== 0 ? section : this.#label(a).localeCompare(this.#label(b));
        });
      });
      this.observe(context.observeRemovedAliases(), (removed) => {
        this._pendingRemoved = removed;
      });
    });
  }

  async save(): Promise<void> {
    await this.#context?.save(this._pendingRemoved);
  }

  #onToggle = (alias: string, visible: boolean) => {
    if (alias === POWER_TOYS_DASHBOARD_ALIAS) return;
    this._pendingRemoved = visible
      ? this._pendingRemoved.filter((a) => a !== alias)
      : [...this._pendingRemoved, alias];
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

  render() {
    if (!this._dashboards.length) {
      return html`<p>No dashboards are currently registered.</p>`;
    }
    let previousSection: string | undefined;
    return html`
      <p>Turn dashboards on and off - hidden ones stay listed here so you can bring them back.</p>
      <uui-ref-list>
        ${this._dashboards.map((dashboard) => {
          const visible = !this._pendingRemoved.includes(dashboard.alias);
          const locked = dashboard.alias === POWER_TOYS_DASHBOARD_ALIAS;
          const section = this.#sectionLabel(dashboard);
          const heading = section !== previousSection ? html`<h5>${section ?? "No section"}</h5>` : "";
          previousSection = section;
          return html`
            ${heading}
            <uui-ref-node
              class=${visible ? "" : "removed"}
              .name=${this.#label(dashboard)}
              .detail=${dashboard.alias}>
              <uui-toggle
                slot="actions"
                label="Show this dashboard"
                label-position="left"
                ?disabled=${locked}
                title=${locked ? "The Power Toys dashboard can't be hidden." : ""}
                .checked=${visible}
                @change=${(e: Event) => this.#onToggle(dashboard.alias, (e.target as HTMLInputElement).checked)}>
              </uui-toggle>
            </uui-ref-node>
          `;
        })}
      </uui-ref-list>
    `;
  }

  static styles = [
    css`
      uui-ref-node.removed {
        opacity: 0.5;
      }

      h5 {
        margin: var(--uui-size-space-4) 0 var(--uui-size-space-2);
      }

      h5:first-child {
        margin-top: 0;
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
