import { UmbHeaderAppButtonElement } from "@umbraco-cms/backoffice/components";
import { css, customElement, html, nothing, state } from "@umbraco-cms/backoffice/external/lit";
import { UMB_POWER_TOYS_PANEL_CONTEXT } from "../../shared/panel/panel.context.js";
import { TASKS_CONTEXT } from "../tasks.context.js";
import { formatBadgeCount } from "../constants.js";

// The header button for tasks, with a badge for open tasks assigned to you
@customElement("power-toys-tasks-header-app")
export class TasksHeaderAppElement extends UmbHeaderAppButtonElement {
  @state()
  private _assigned = 0;

  @state()
  private _open = false;

  constructor() {
    super();

    this.consumeContext(TASKS_CONTEXT, (context) => {
      if (!context) return;
      this.observe(context.assignedCount, (count) => (this._assigned = count), "_assigned");
    });

    this.consumeContext(UMB_POWER_TOYS_PANEL_CONTEXT, (context) => {
      if (!context) return;
      this.observe(context.isOpen("tasks"), (open) => (this._open = open), "_open");
    });
  }

  override render() {
    return html`
      <uui-button
        look="primary"
        class=${this._open ? "open" : ""}
        label=${this.localize.term("powerToysTasks_tasks")}
        aria-pressed=${this._open ? "true" : "false"}
        compact
        @click=${this.#onClick}
      >
        <uui-icon name="icon-checkbox"></uui-icon>
        ${this._assigned > 0
          ? html`<uui-badge label=${this.localize.term("powerToysTasks_assignedCount", this._assigned)}
              >${formatBadgeCount(this._assigned)}</uui-badge
            >`
          : nothing}
      </uui-button>
    `;
  }

  async #onClick() {
    const panel = await this.getContext(UMB_POWER_TOYS_PANEL_CONTEXT);
    panel?.toggle("tasks");
  }

  static override readonly styles = [
    ...UmbHeaderAppButtonElement.styles,
    css`
      uui-badge {
        font-size: var(--uui-type-small-size);
      }

      /* Shows which header button's panel is open beside the page */
      uui-button.open {
        --uui-button-background-color: var(--uui-color-current);
      }
    `,
  ];
}

export default TasksHeaderAppElement;
