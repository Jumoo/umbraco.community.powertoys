import { css, customElement, html, nothing, query, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import { UMB_EDIT_DOCUMENT_WORKSPACE_PATH_PATTERN } from "@umbraco-cms/backoffice/document";
import { TasksService, type TaskResponseModel } from "../../../api/index.js";
import { UMB_POWER_TOYS_CURRENT_DOCUMENT_CONTEXT } from "../../shared/current-document/current-document.context.js";
import { TASKS_CONTEXT, type TasksContext } from "../tasks.context.js";
import { TASKS_PERMISSION_MANAGE_GLOBAL } from "../constants.js";
import "../components/task-list.element.js";
import "../reviews/document-review.element.js";
import "../reviews/due-reviews.element.js";
import type { DueReviewsElement } from "../reviews/due-reviews.element.js";
import "../../shared/panel/panel-layout.element.js";

const ASSIGNED_PAGE_SIZE = 20;

// The tasks panel docked beside the backoffice: what's assigned to you, the page you're on, and
// the global list. It stays open while you move around the site.
@customElement("power-toys-tasks-panel")
export class TasksPanelElement extends UmbLitElement {
  @state()
  private _assigned: TaskResponseModel[] = [];

  @state()
  private _assignedTotal = 0;

  @state()
  private _assignedLoading = true;

  @state()
  private _currentDocument?: string;

  @state()
  private _canManageGlobal = false;

  @state()
  private _reviewsEnabled = false;

  @state()
  private _dueCount = 0;

  @query("power-toys-due-reviews")
  private _dueReviews?: DueReviewsElement;

  #context?: TasksContext;

  constructor() {
    super();

    this.consumeContext(TASKS_CONTEXT, (context) => {
      this.#context = context;
      if (!context) return;
      this.observe(context.hasPermission(TASKS_PERMISSION_MANAGE_GLOBAL), (can) => (this._canManageGlobal = can), "_canManageGlobal");
      this.observe(context.reviewsEnabled, (enabled) => (this._reviewsEnabled = enabled), "_reviewsEnabled");
      // A task changing anywhere can change who it's assigned to
      this.observe(context.changes, () => this.#loadAssigned(), "_changes");
    });

    this.consumeContext(UMB_POWER_TOYS_CURRENT_DOCUMENT_CONTEXT, (context) => {
      if (!context) return;
      this.observe(context.unique, (unique) => (this._currentDocument = unique ?? undefined), "_currentDocument");
    });
  }

  async #loadAssigned() {
    try {
      const { data } = await TasksService.getOpenTasks({ query: { skip: 0, take: ASSIGNED_PAGE_SIZE } });
      this._assigned = data?.items ?? [];
      this._assignedTotal = data?.total ?? 0;
    } finally {
      this._assignedLoading = false;
    }
  }

  async #complete(task: TaskResponseModel) {
    const { error } = await TasksService.updateTask({
      path: { key: task.key },
      body: { title: task.title, assigneeKey: task.assigneeKey, dueDate: task.dueDate, isComplete: true },
    });

    if (error) {
      const notifications = await this.getContext(UMB_NOTIFICATION_CONTEXT);
      notifications?.peek("danger", { data: { message: this.localize.term("powerToysTasks_failed") } });
      return;
    }

    await this.#loadAssigned();
    this.#context?.refresh();
  }

  // A document's task opens its document, where the panel's "This page" list has it. The panel
  // stays open beside it.
  #open(task: TaskResponseModel) {
    if (!task.documentKey) return;
    window.history.pushState({}, "", UMB_EDIT_DOCUMENT_WORKSPACE_PATH_PATTERN.generateAbsolute({ unique: task.documentKey }));
  }

  #renderAssigned() {
    if (this._assignedLoading) return html`<uui-loader></uui-loader>`;

    if (this._assigned.length === 0) {
      return html`<p class="empty"><umb-icon name="icon-check"></umb-icon> ${this.localize.term("powerToysTasks_noneAssigned")}</p>`;
    }

    return html`
      <uui-ref-list>
        ${this._assigned.map((task) => {
          const overdue = !!task.dueDate && new Date(task.dueDate) < new Date();
          return html`<uui-ref-node
            name=${task.title}
            detail=${task.documentName ?? this.localize.term("powerToysTasks_global")}
            ?readonly=${!task.documentKey}
            @open=${() => this.#open(task)}
          >
            <umb-icon slot="icon" name=${task.documentKey ? "icon-document" : "icon-globe"}></umb-icon>
            ${task.dueDate
              ? html`<uui-tag slot="tag" look=${overdue ? "primary" : "secondary"} color=${overdue ? "danger" : "default"}
                  ><span class="tag-content"
                    ><umb-icon name=${overdue ? "icon-alert" : "icon-calendar"}></umb-icon>
                    ${this.localize.date(task.dueDate, { dateStyle: "medium" })}</span
                  ></uui-tag
                >`
              : nothing}
            <uui-action-bar slot="actions">
              <uui-button
                label=${this.localize.term("powerToysTasks_markDone")}
                @click=${(e: Event) => {
                  e.stopPropagation();
                  this.#complete(task);
                }}
              >
                <uui-icon name="icon-check"></uui-icon>
              </uui-button>
            </uui-action-bar>
          </uui-ref-node>`;
        })}
      </uui-ref-list>
      ${this._assignedTotal > this._assigned.length
        ? html`<p class="more">${this.localize.term("powerToysTasks_moreAssigned", this._assignedTotal - this._assigned.length)}</p>`
        : nothing}
    `;
  }

  override render() {
    return html`
      <power-toys-panel-layout headline=${this.localize.term("powerToysTasks_tasks")} icon="icon-checkbox">
        <div class="layout">
          <uui-box>
            <div slot="headline" class="headline">
              <umb-icon name="icon-user"></umb-icon>
              <span>${this.localize.term("powerToysTasks_assignedToYou")}</span>
              ${this._assignedTotal ? html`<uui-tag look="secondary">${this._assignedTotal}</uui-tag>` : nothing}
            </div>
            ${this.#renderAssigned()}
          </uui-box>

          ${this._reviewsEnabled
            ? html`<uui-box>
                <div slot="headline" class="headline">
                  <umb-icon name="icon-calendar"></umb-icon>
                  <span>${this.localize.term("powerToysTasks_dueForReview")}</span>
                  ${this._dueCount ? html`<uui-tag look="secondary">${this._dueCount}</uui-tag>` : nothing}
                </div>
                <power-toys-due-reviews
                  @change=${(e: Event) => (this._dueCount = (e.target as DueReviewsElement).total)}
                ></power-toys-due-reviews>
              </uui-box>`
            : nothing}

          ${this._currentDocument
            ? html`<uui-box>
                <div slot="headline" class="headline">
                  <umb-icon name="icon-document"></umb-icon>
                  <span>${this.localize.term("powerToysTasks_thisPage")}</span>
                </div>
                <power-toys-task-list .documentKey=${this._currentDocument} editable></power-toys-task-list>
              </uui-box>`
            : nothing}

          ${this._currentDocument && this._reviewsEnabled
            ? html`<uui-box>
                <div slot="headline" class="headline">
                  <umb-icon name="icon-calendar"></umb-icon>
                  <span>${this.localize.term("powerToysTasks_review")}</span>
                </div>
                <power-toys-document-review
                  .documentKey=${this._currentDocument}
                  @change=${() => this._dueReviews?.reload()}
                ></power-toys-document-review>
              </uui-box>`
            : nothing}

          <uui-box>
            <div slot="headline" class="headline">
              <umb-icon name="icon-globe"></umb-icon>
              <span>${this.localize.term("powerToysTasks_global")}</span>
            </div>
            <power-toys-task-list .documentKey=${null} ?editable=${this._canManageGlobal}></power-toys-task-list>
          </uui-box>
        </div>
      </power-toys-panel-layout>
    `;
  }

  static override styles = css`
    :host {
      display: block;
      height: 100%;
    }

    .layout {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-layout-1);
    }

    .headline {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .headline umb-icon {
      color: var(--uui-color-text-alt);
    }

    .tag-content {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      white-space: nowrap;
    }

    .empty,
    .more {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      margin: 0;
      color: var(--uui-color-text-alt);
    }

    .more {
      margin-top: var(--uui-size-space-3);
    }

    .empty umb-icon {
      color: var(--uui-color-positive-standalone);
    }
  `;
}

export default TasksPanelElement;

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-tasks-panel": TasksPanelElement;
  }
}
