import type { UmbLocalizationDictionary } from "@umbraco-cms/backoffice/localization-api";

// English strings for the Tasks power toy. Read with this.localize.term("powerToysTasks_<key>")
// in code, or "#powerToysTasks_<key>" in manifest labels.
const enUs: UmbLocalizationDictionary = {
  powerToysTasks: {
    tasks: "Tasks",
    assignedToYou: "Assigned to you",
    assignedCount: (count: number) => (count === 1 ? "1 open task assigned to you" : `${count} open tasks assigned to you`),
    assignedHeadline: (name: string) => `${name} assigned you a task`,
    noneAssigned: "Nothing assigned to you.",
    moreAssigned: (count: number) => `And ${count} more`,
    markDone: "Mark done",
    thisPage: "This page",
    global: "Global",
    none: "No tasks yet.",
    add: "Add a task",
    addButton: "Add",
    edit: "Edit task",
    title: "Task",
    assignee: "Assigned to",
    nobody: "Nobody",
    due: "Due",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    moveUp: "Move up",
    moveDown: "Move down",
    failed: "The task couldn't be saved. You may not have permission to change it.",
    permissionManageGlobal: "Manage global tasks",
    permissionManageGlobalDescription: "Add, change, reorder and delete the global tasks, the ones not on a page",
    permissionViewAll: "See everyone's tasks",
    permissionViewAllDescription: "See every open task, not only the ones assigned to you",
  },
  // Heading for the Tasks power toy's permissions in the user group editor
  user: {
    permissionsEntityGroup_powerToysTasks: "Tasks permissions",
  },
};

export default enUs;
