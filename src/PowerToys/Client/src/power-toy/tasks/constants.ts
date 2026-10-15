// The Tasks power toy's alias. Matches TasksConstants.PowerToyAlias on the server.
export const TASKS_POWER_TOY_ALIAS = "PowerToys.PowerToy.Tasks";

// The Tasks power toy's user group permissions. Match TasksPermissions on the server.
export const TASKS_PERMISSION_MANAGE_GLOBAL = "PowerToys.Tasks.ManageGlobal";
export const TASKS_PERMISSION_VIEW_ALL = "PowerToys.Tasks.ViewAll";

// The user group editor groups permissions by entity type, with a heading for each.
export const TASKS_PERMISSION_ENTITY_TYPE = "powerToysTasks";

// Badges stop counting here, so a long list shows "9+" rather than a wide number
const TASKS_BADGE_MAX = 9;

export const formatBadgeCount = (count: number) => (count > TASKS_BADGE_MAX ? `${TASKS_BADGE_MAX}+` : `${count}`);
