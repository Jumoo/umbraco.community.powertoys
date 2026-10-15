import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import { UMB_CURRENT_USER_CONTEXT } from "@umbraco-cms/backoffice/current-user";
import { UmbLocalizationController } from "@umbraco-cms/backoffice/localization-api";
import { UmbArrayState, UmbNumberState, UmbObjectState } from "@umbraco-cms/backoffice/observable-api";
import { TasksService, type TaskAssigneeResponseModel } from "../../api/index.js";
import { UMB_POWER_TOYS_HUB_CONTEXT, type PowerToysHubContext } from "../shared/hub/hub.context.js";
import { PowerToyEnabledController } from "../shared/power-toy-enabled.js";
import { TASKS_POWER_TOY_ALIAS } from "./constants.js";

/** A change to a list of tasks: a document's (by key) or the global one (null). */
export interface TasksChange {
  documentKey: string | null;
  // Stamped, so the same list changing twice still counts as two changes
  at: number;
}

// The Tasks state for the whole backoffice: the badge count, the people tasks can be assigned
// to, and live changes from the shared Power Toys hub, which this asks for while Tasks is on.
export class TasksContext extends UmbContextBase {
  #hub?: PowerToysHubContext;
  #enabled = false;
  #localize = new UmbLocalizationController(this);

  #changes = new UmbObjectState<TasksChange | undefined>(undefined);
  public readonly changes = this.#changes.asObservable();

  // Open tasks assigned to the current user, for the header badge
  #assignedCount = new UmbNumberState(0);
  public readonly assignedCount = this.#assignedCount.asObservable();

  #assignees = new UmbArrayState<TaskAssigneeResponseModel>([], (a) => a.key);
  public readonly assignees = this.#assignees.asObservable();
  #assigneesLoaded = false;

  #permissions = new UmbArrayState<string>([], (p) => p);

  constructor(host: UmbControllerHost) {
    super(host, TASKS_CONTEXT);

    this.consumeContext(UMB_CURRENT_USER_CONTEXT, (context) => {
      if (!context) return;
      this.observe(
        context.currentUser,
        (user) => this.#permissions.setValue(user?.fallbackPermissions ?? []),
        "_permissions"
      );
    });

    this.consumeContext(UMB_POWER_TOYS_HUB_CONTEXT, (hub) => {
      this.#hub = hub;
      if (!hub) return;

      hub.on("tasksChanged", (documentKey: string | null) => {
        this.#changes.setValue({ documentKey: documentKey ?? null, at: Date.now() });
        this.#loadAssignedCount();
      });

      hub.on("taskAssigned", (task: { title: string; assignedBy: string }) => {
        this.getContext(UMB_NOTIFICATION_CONTEXT).then((notifications) =>
          notifications?.peek("default", {
            data: {
              headline: this.#localize.term("powerToysTasks_assignedHeadline", task.assignedBy),
              message: task.title,
            },
          })
        );
      });

      hub.setWanted("tasks", this.#enabled);
    });

    new PowerToyEnabledController(this, TASKS_POWER_TOY_ALIAS, (enabled) => {
      this.#enabled = enabled;
      this.#hub?.setWanted("tasks", enabled);
      if (enabled) {
        this.#loadAssignedCount();
      } else {
        this.#assignedCount.setValue(0);
      }
    });
  }

  hasPermission(permission: string) {
    return this.#permissions.asObservablePart((list) => list.includes(permission));
  }

  /** Loads the people tasks can be assigned to, once. */
  async loadAssignees() {
    if (this.#assigneesLoaded) return;
    this.#assigneesLoaded = true;

    const { data } = await TasksService.getAssignees();
    this.#assignees.setValue(data ?? []);
  }

  /** Call after this tab changes a task, so the badge doesn't wait for the hub. */
  async refresh() {
    await this.#loadAssignedCount();
  }

  async #loadAssignedCount() {
    if (!this.#enabled) return;
    const { data } = await TasksService.getOpenTasks({ query: { skip: 0, take: 1 } });
    this.#assignedCount.setValue(data?.total ?? 0);
  }
}

export const TASKS_CONTEXT = new UmbContextToken<TasksContext>("PowerToys.Context.Tasks");

export { TasksContext as api };
export default TasksContext;
