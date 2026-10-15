import { UmbHeaderAppButtonElement } from "@umbraco-cms/backoffice/components";
import { css, customElement, html, nothing, state } from "@umbraco-cms/backoffice/external/lit";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import { TASKS_MODAL } from "../modal/tasks-modal.element.js";
import { TASKS_CONTEXT } from "../tasks.context.js";
import { formatBadgeCount } from "../constants.js";

// The header button for tasks, with a badge for open tasks assigned to you
@customElement("power-toys-tasks-header-app")
export class TasksHeaderAppElement extends UmbHeaderAppButtonElement {
  @state()
  private _assigned = 0;

  constructor() {
    super();

    this.consumeContext(TASKS_CONTEXT, (context) => {
      if (!context) return;
      this.observe(context.assignedCount, (count) => (this._assigned = count), "_assigned");
    });
  }

  override render() {
    return html`
      <uui-button look="primary" label=${this.localize.term("powerToysTasks_tasks")} compact @click=${this.#onClick}>
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
    const modalManager = await this.getContext(UMB_MODAL_MANAGER_CONTEXT);
    if (!modalManager) return;

    const modal = modalManager.open(this, TASKS_MODAL, { data: {} });
    await modal.onSubmit().catch(() => undefined);
  }

  static override readonly styles = [
    ...UmbHeaderAppButtonElement.styles,
    css`
      uui-badge {
        font-size: var(--uui-type-small-size);
      }
    `,
  ];
}

export default TasksHeaderAppElement;
