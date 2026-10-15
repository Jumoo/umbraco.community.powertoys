// Pieces more than one power toy uses. Each is cheap while nothing needs it: the hub only
// connects when a power toy asks for it.
export const manifests: Array<UmbExtensionManifest> = [
  // The side panel docked beside the backoffice, which the Chat and Tasks header buttons open
  {
    type: "globalContext",
    alias: "PowerToys.GlobalContext.Panel",
    name: "Power Toys Panel Context",
    api: () => import("./panel/panel.context.js"),
  },
  {
    type: "backofficeEntryPoint",
    alias: "PowerToys.BackofficeEntryPoint.Panel",
    name: "Power Toys Docked Panel Entry Point",
    js: () => import("./panel/entry-point.js"),
  },
  {
    type: "globalContext",
    alias: "PowerToys.GlobalContext.Hub",
    name: "Power Toys Hub Context",
    api: () => import("./hub/hub.context.js"),
  },
  {
    type: "globalContext",
    alias: "PowerToys.GlobalContext.CurrentDocument",
    name: "Power Toys Current Document Context",
    api: () => import("./current-document/current-document.context.js"),
  },
  // Gates an extension on one of the power toys' own user group permissions
  {
    type: "condition",
    alias: "PowerToys.Condition.UserPermission",
    name: "Power Toys User Permission Condition",
    api: () => import("./user-permission.condition.js"),
  },
  // Reports which document is open, for the "This page" lists in the Chat and Tasks sidebars
  {
    type: "workspaceContext",
    alias: "PowerToys.WorkspaceContext.CurrentDocument",
    name: "Power Toys Current Document Workspace Context",
    api: () => import("./current-document/current-document.workspace-context.js"),
    conditions: [{ alias: "Umb.Condition.WorkspaceAlias", match: "Umb.Workspace.Document" }],
  },
];
