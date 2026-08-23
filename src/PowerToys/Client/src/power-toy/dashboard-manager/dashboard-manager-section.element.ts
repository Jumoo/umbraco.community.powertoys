import { LitElement, css, html, customElement, property, repeat } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UmbSorterController } from "@umbraco-cms/backoffice/sorter";
import type { ManifestDashboard } from "@umbraco-cms/backoffice/dashboard";
import { POWER_TOYS_DASHBOARD_ALIAS } from "../../dashboards/manifest.js";

// One section's worth of dashboards, with its own drag-and-drop sorter - each section gets its
// own instance/container so a drag can only reorder within that section, never across sections
// (which the section condition alone decides).
@customElement("power-toys-dashboard-manager-section")
export class DashboardManagerSectionElement extends UmbElementMixin(LitElement) {
  @property({ attribute: false })
  public get dashboards(): ManifestDashboard[] {
    return this._dashboards;
  }
  public set dashboards(value: ManifestDashboard[]) {
    this._dashboards = value;
    this.#sorter.setModel(value);
  }
  private _dashboards: ManifestDashboard[] = [];

  @property({ attribute: false })
  pendingRemoved: string[] = [];

  #sorter = new UmbSorterController<ManifestDashboard>(this, {
    getUniqueOfElement: (element) => element.id,
    getUniqueOfModel: (modelEntry) => modelEntry.alias,
    identifier: "Jumoo.SorterIdentifier.DashboardManager",
    itemSelector: "uui-ref-node",
    containerSelector: "uui-ref-list",
    handleSelector: "uui-symbol-drag-handle",
    onChange: ({ model }) => {
      this._dashboards = model;
      this.dispatchEvent(
        new CustomEvent<string[]>("dashboards-sorted", {
          detail: model.map((dashboard) => dashboard.alias),
          bubbles: true,
          composed: true,
        }),
      );
    },
  });

  // Dashboard labels can be either plain text or a legacy "#term" reference - localize.string()
  // resolves the latter and passes plain text straight through.
  #label(dashboard: ManifestDashboard): string {
    return this.localize.string(dashboard.meta.label ?? dashboard.name);
  }

  #onToggle(alias: string, visible: boolean) {
    this.dispatchEvent(
      new CustomEvent("dashboard-toggled", { detail: { alias, visible }, bubbles: true, composed: true }),
    );
  }

  render() {
    return html`
      <uui-ref-list>
        ${repeat(
          this._dashboards,
          (dashboard) => dashboard.alias,
          (dashboard) => {
            const visible = !this.pendingRemoved.includes(dashboard.alias);
            const locked = dashboard.alias === POWER_TOYS_DASHBOARD_ALIAS;
            return html`
              <uui-ref-node
                id=${dashboard.alias}
                class=${visible ? "" : "removed"}
                .name=${this.#label(dashboard)}
                .detail=${dashboard.alias}>
                <uui-symbol-drag-handle
                  slot="icon"
                  label="Drag to reorder"
                  @click=${(e: Event) => e.stopPropagation()}></uui-symbol-drag-handle>
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
          },
        )}
      </uui-ref-list>
    `;
  }

  static styles = [
    css`
      uui-ref-node.removed {
        opacity: 0.5;
      }

      uui-ref-node[drag-placeholder] {
        opacity: 0.2;
      }

      uui-symbol-drag-handle {
        cursor: grab;
      }
    `,
  ];
}

export default DashboardManagerSectionElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-dashboard-manager-section": DashboardManagerSectionElement;
  }
}
