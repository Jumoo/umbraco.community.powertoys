// Pieces more than one power toy uses. Each is cheap while nothing needs it: the hub only
// connects when a power toy asks for it.
export const manifests: Array<UmbExtensionManifest> = [
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
  // Reports which document is open, for the "This page" lists in the Chat and Tasks sidebars
  {
    type: "workspaceContext",
    alias: "PowerToys.WorkspaceContext.CurrentDocument",
    name: "Power Toys Current Document Workspace Context",
    api: () => import("./current-document/current-document.workspace-context.js"),
    conditions: [{ alias: "Umb.Condition.WorkspaceAlias", match: "Umb.Workspace.Document" }],
  },
];
