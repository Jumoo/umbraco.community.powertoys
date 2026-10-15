import { css, customElement, html, nothing, property, repeat, state } from "@umbraco-cms/backoffice/external/lit";
import type { PropertyValues } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import { TasksService, type TaskAssigneeResponseModel, type TaskResponseModel } from "../../../api/index.js";
import { TASKS_CONTEXT, type TasksContext } from "../tasks.context.js";

interface TaskDraft {
  title: string;
  assigneeKey: string;
  dueDate: string;
}

const toDateInput = (date?: string | null) => (date ? date.substring(0, 10) : "");
const fromDateInput = (value: string) => (value ? new Date(`${value}T00:00:00Z`).toISOString() : null);

/**
 * A short to-do list: a document's, or the global one when `documentKey` is null. Without
 * `editable` it's read-only. The server checks every change again, and every open list
 * refreshes when anyone changes it.
 */
@customElement("power-toys-task-list")
export class TaskListElement extends UmbLitElement {
  /** The document whose tasks to show, or null for the global tasks. */
  @property({ attribute: false })
  documentKey: string | null = null;

  @property({ type: Boolean })
  editable = false;

  @state()
  private _tasks: TaskResponseModel[] = [];

  @state()
  private _loading = true;

  @state()
  private _assignees: TaskAssigneeResponseModel[] = [];

  @state()
  private _newTitle = "";

  // The task being edited, and its edits so far
  @state()
  private _editing?: string;

  @state()
  private _draft: TaskDraft = { title: "", assigneeKey: "", dueDate: "" };

  #context?: TasksContext;

  constructor() {
    super();

    this.consumeContext(TASKS_CONTEXT, (context) => {
      this.#context = context;
      if (!context) return;
      context.loadAssignees();
      this.observe(context.assignees, (a) => (this._assignees = a), "_assignees");
      this.observe(
        context.changes,
        (change) => {
          if (change && change.documentKey === this.documentKey) this.#load();
        },
        "_changes"
      );
    });
  }

  override willUpdate(changed: PropertyValues) {
    if (changed.has("documentKey")) this.#load();
  }

  /** How many open tasks the list holds, for the box headline around it. */
  get openCount() {
    return this._tasks.filter((t) => !t.isComplete).length;
  }

  async #load() {
    const documentKey = this.documentKey;
    try {
      const { data } = documentKey
        ? await TasksService.getDocumentTasks({ path: { documentKey } })
        : await TasksService.getGlobalTasks();
      if (documentKey !== this.documentKey) return;
      this._tasks = data ?? [];
    } catch (error) {
      this._tasks = [];
      console.warn("Tasks: could not load tasks", error);
    } finally {
      this._loading = false;
      this.dispatchEvent(new Event("change"));
    }
  }

  async #run(action: () => Promise<{ error?: unknown }>) {
    try {
      const { error } = await action();
      if (error) throw error;
      await this.#load();
      this.#context?.refresh();
    } catch (error) {
      console.error("Tasks: change failed", error);
      const notifications = await this.getContext(UMB_NOTIFICATION_CONTEXT);
      notifications?.peek("danger", { data: { message: this.localize.term("powerToysTasks_failed") } });
    }
  }

  #add() {
    const title = this._newTitle.trim();
    if (!title) return;

    const documentKey = this.documentKey;
    this._newTitle = "";
    this.#run(() =>
      documentKey
        ? TasksService.createDocumentTask({ path: { documentKey }, body: { title } })
        : TasksService.createGlobalTask({ body: { title } })
    );
  }

  #update(task: TaskResponseModel, changes: Partial<TaskResponseModel>) {
    const next = { ...task, ...changes };
    return this.#run(() =>
      TasksService.updateTask({
        path: { key: task.key },
        body: {
          title: next.title,
          assigneeKey: next.assigneeKey || null,
          dueDate: next.dueDate || null,
          isComplete: next.isComplete,
        },
      })
    );
  }

  #move(index: number, offset: number) {
    const keys = this._tasks.map((t) => t.key);
    const target = index + offset;
    if (target < 0 || target >= keys.length) return;

    [keys[index], keys[target]] = [keys[target], keys[index]];
    const documentKey = this.documentKey;
    this.#run(() =>
      documentKey
        ? TasksService.sortDocumentTasks({ path: { documentKey }, body: { keys } })
        : TasksService.sortGlobalTasks({ body: { keys } })
    );
  }

  #startEdit(task: TaskResponseModel) {
    this._editing = task.key;
    this._draft = {
      title: task.title,
      assigneeKey: task.assigneeKey ?? "",
      dueDate: toDateInput(task.dueDate),
    };
  }

  async #saveEdit(task: TaskResponseModel) {
    if (!this._draft.title.trim()) return;
    this._editing = undefined;
    await this.#update(task, {
      title: this._draft.title.trim(),
      assigneeKey: this._draft.assigneeKey || null,
      dueDate: fromDateInput(this._draft.dueDate),
    });
  }

  #assigneeName(key?: string | null) {
    return key ? (this._assignees.find((a) => a.key === key)?.name ?? "") : "";
  }

  #renderEditor(task: TaskResponseModel) {
    const options = [
      { name: this.localize.term("powerToysTasks_nobody"), value: "", selected: !this._draft.assigneeKey },
      ...this._assignees.map((a) => ({ name: a.name, value: a.key, selected: a.key === this._draft.assigneeKey })),
    ];

    return html`
      <li class="editor">
        <uui-input
          label=${this.localize.term("powerToysTasks_title")}
          .value=${this._draft.title}
          maxlength="255"
          @input=${(e: Event) => (this._draft = { ...this._draft, title: (e.target as HTMLInputElement).value })}
        ></uui-input>
        <uui-select
          label=${this.localize.term("powerToysTasks_assignee")}
          .options=${options}
          @change=${(e: Event) => (this._draft = { ...this._draft, assigneeKey: (e.target as HTMLSelectElement).value })}
        ></uui-select>
        <uui-input
          type="date"
          label=${this.localize.term("powerToysTasks_due")}
          .value=${this._draft.dueDate}
          @change=${(e: Event) => (this._draft = { ...this._draft, dueDate: (e.target as HTMLInputElement).value })}
        ></uui-input>
        <div class="buttons">
          <uui-button label=${this.localize.term("powerToysTasks_cancel")} @click=${() => (this._editing = undefined)}></uui-button>
          <uui-button look="primary" label=${this.localize.term("powerToysTasks_save")} @click=${() => this.#saveEdit(task)}></uui-button>
        </div>
      </li>
    `;
  }

  #renderDetails(task: TaskResponseModel) {
    const overdue = !task.isComplete && !!task.dueDate && new Date(task.dueDate) < new Date();
    const assignee = this.#assigneeName(task.assigneeKey);
    if (!assignee && !task.dueDate) return nothing;

    return html`<span class="details">
      ${task.dueDate
        ? html`<uui-tag look=${overdue ? "primary" : "secondary"} color=${overdue ? "danger" : "default"}
            ><span class="tag-content"
              ><umb-icon name=${overdue ? "icon-alert" : "icon-calendar"}></umb-icon>
              ${this.localize.date(task.dueDate, { dateStyle: "medium" })}</span
            ></uui-tag
          >`
        : nothing}
      ${assignee ? html`<span class="assignee"><umb-icon name="icon-user"></umb-icon> ${assignee}</span>` : nothing}
    </span>`;
  }

  #renderTask(task: TaskResponseModel, index: number) {
    if (this._editing === task.key) return this.#renderEditor(task);

    return html`
      <li class=${task.isComplete ? "done" : ""}>
        <!-- aria-label, not label: the title is shown beside it -->
        <uui-checkbox
          aria-label=${task.title}
          ?checked=${task.isComplete}
          ?disabled=${!this.editable}
          @change=${(e: Event) => this.#update(task, { isComplete: (e.target as HTMLInputElement).checked })}
        ></uui-checkbox>
        ${this.editable
          ? html`<uui-button
              class="text"
              compact
              label=${this.localize.term("powerToysTasks_edit")}
              @click=${() => this.#startEdit(task)}
            >
              <span class="text-content">
                <span class="title">${task.title}</span>
                ${this.#renderDetails(task)}
              </span>
            </uui-button>`
          : html`<span class="text text-content">
              <span class="title">${task.title}</span>
              ${this.#renderDetails(task)}
            </span>`}
        ${this.editable
          ? html`<uui-action-bar class="row-actions">
              <uui-button
                compact
                label=${this.localize.term("powerToysTasks_moveUp")}
                ?disabled=${index === 0}
                @click=${() => this.#move(index, -1)}
              >
                <uui-icon name="icon-arrow-up"></uui-icon>
              </uui-button>
              <uui-button
                compact
                label=${this.localize.term("powerToysTasks_moveDown")}
                ?disabled=${index === this._tasks.length - 1}
                @click=${() => this.#move(index, 1)}
              >
                <uui-icon name="icon-arrow-down"></uui-icon>
              </uui-button>
              <uui-button
                compact
                color="danger"
                label=${this.localize.term("powerToysTasks_delete")}
                @click=${() => this.#run(() => TasksService.deleteTask({ path: { key: task.key } }))}
              >
                <uui-icon name="icon-trash"></uui-icon>
              </uui-button>
            </uui-action-bar>`
          : nothing}
      </li>
    `;
  }

  override render() {
    if (this._loading) return html`<uui-loader></uui-loader>`;

    return html`
      ${this._tasks.length === 0
        ? html`<p class="empty"><umb-icon name="icon-check"></umb-icon> ${this.localize.term("powerToysTasks_none")}</p>`
        : html`<ul>
            ${repeat(
              this._tasks,
              (t) => t.key,
              (t, i) => this.#renderTask(t, i)
            )}
          </ul>`}
      ${this.editable
        ? html`<uui-input
            class="add"
            label=${this.localize.term("powerToysTasks_add")}
            placeholder=${this.localize.term("powerToysTasks_add")}
            maxlength="255"
            .value=${this._newTitle}
            @input=${(e: Event) => (this._newTitle = (e.target as HTMLInputElement).value)}
            @keydown=${(e: KeyboardEvent) => e.key === "Enter" && this.#add()}
          >
            <uui-button slot="append" compact label=${this.localize.term("powerToysTasks_addButton")} @click=${this.#add}>
              <uui-icon name="icon-add"></uui-icon>
            </uui-button>
          </uui-input>`
        : nothing}
    `;
  }

  static override styles = css`
    :host {
      display: block;
    }

    /* Icon and text side by side inside a tag */
    .tag-content {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      white-space: nowrap;
    }

    ul {
      list-style: none;
      margin: 0 0 var(--uui-size-space-3);
      padding: 0;
    }

    li {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3) 0;
      border-bottom: 1px solid var(--uui-color-divider);
    }

    li.editor {
      flex-direction: column;
      align-items: stretch;
    }

    .text {
      flex: 1 1 auto;
      min-width: 0;
      --uui-button-content-align: left;
    }

    .text-content {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--uui-size-space-1);
      text-align: left;
      font-weight: normal;
    }

    .title {
      overflow-wrap: anywhere;
    }

    li.done .title {
      text-decoration: line-through;
      color: var(--uui-color-text-alt);
    }

    .details {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--uui-size-space-2);
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .assignee {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-1);
    }

    /* Row actions stay out of the way until the row is pointed at or focused */
    .row-actions {
      opacity: 0;
      transition: opacity 120ms;
    }

    li:hover .row-actions,
    li:focus-within .row-actions {
      opacity: 1;
    }

    .buttons {
      display: flex;
      justify-content: flex-end;
      gap: var(--uui-size-space-2);
    }

    .add,
    uui-select,
    li.editor uui-input {
      width: 100%;
    }

    .empty {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      margin: 0 0 var(--uui-size-space-4);
      color: var(--uui-color-text-alt);
    }

    .empty umb-icon {
      color: var(--uui-color-positive-standalone);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "power-toys-task-list": TaskListElement;
  }
}
