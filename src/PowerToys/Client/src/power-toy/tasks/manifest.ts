import {
  TASKS_PERMISSION_ENTITY_TYPE,
  TASKS_PERMISSION_MANAGE_GLOBAL,
  TASKS_PERMISSION_MANAGE_REVIEWS,
  TASKS_PERMISSION_VIEW_ALL,
  TASKS_POWER_TOY_ALIAS,
} from "./constants.js";

const permission = (verb: string, key: string, weight: number): UmbExtensionManifest => ({
  type: "entityUserPermission",
  alias: `${verb}.Permission`,
  name: `Tasks ${key} Permission`,
  weight,
  forEntityTypes: [TASKS_PERMISSION_ENTITY_TYPE],
  meta: {
    verbs: [verb],
    label: `#powerToysTasks_permission${key}`,
    description: `#powerToysTasks_permission${key}Description`,
  },
});

export const manifests: Array<UmbExtensionManifest> = [
  {
    type: "powerToy",
    alias: TASKS_POWER_TOY_ALIAS,
    name: "Tasks Power Toy",
    // Next to BackChat (10), at the end of the dashboard
    weight: 5,
    meta: {
      label: "Tasks",
      description: "To-do lists for each page and for the whole site, from the backoffice header.",
      icon: "icon-checkbox",
      modal: {
        element: () => import("./settings/tasks-settings-modal.element.js"),
        savable: true,
      },
    },
  },
  // Always registered, but it only asks for the hub connection while the power toy is on
  {
    type: "globalContext",
    alias: "PowerToys.Tasks.Context",
    name: "Tasks Context",
    api: () => import("./tasks.context.js"),
  },
  {
    type: "headerApp",
    alias: "PowerToys.Tasks.HeaderApp",
    name: "Tasks Header App",
    element: () => import("./header/tasks-header.element.js"),
    weight: 18,
    meta: {
      label: "#powerToysTasks_tasks",
      icon: "icon-checkbox",
      path: "tasks",
    },
    conditions: [{ alias: "PowerToys.Condition.PowerToyEnabled", match: TASKS_POWER_TOY_ALIAS }],
  },
  {
    type: "localization",
    alias: "PowerToys.Tasks.Localization.EnUs",
    name: "Tasks English (US) Localization",
    weight: 0,
    meta: {
      culture: "en-us",
    },
    js: () => import("./localization/en-us.js"),
  },
  // In the user group editor whether or not the power toy is on, so groups can be set up first
  permission(TASKS_PERMISSION_MANAGE_GLOBAL, "ManageGlobal", 300),
  permission(TASKS_PERMISSION_VIEW_ALL, "ViewAll", 200),
  permission(TASKS_PERMISSION_MANAGE_REVIEWS, "ManageReviews", 100),
  // Content reviews, part of Tasks
  {
    type: "condition",
    alias: "PowerToys.Condition.ReviewsEnabled",
    name: "Content Reviews Enabled Condition",
    api: () => import("./reviews/reviews-enabled.condition.js"),
  },
  // The review rules screen, in Settings while reviews are on, for users allowed to manage them
  {
    type: "dashboard",
    alias: "PowerToys.Tasks.Dashboard.ReviewRules",
    name: "Review Rules Dashboard",
    element: () => import("./reviews/review-rules-dashboard.element.js"),
    weight: -10,
    meta: {
      label: "#powerToysTasks_reviewRules",
      pathname: "review-rules",
    },
    conditions: [
      { alias: "Umb.Condition.SectionAlias", match: "Umb.Section.Settings" },
      { alias: "PowerToys.Condition.ReviewsEnabled" },
      { alias: "PowerToys.Condition.UserPermission", match: TASKS_PERMISSION_MANAGE_REVIEWS },
    ],
  },
];
