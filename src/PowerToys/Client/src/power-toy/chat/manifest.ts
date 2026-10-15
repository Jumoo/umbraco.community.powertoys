import { CHAT_POWER_TOY_ALIAS } from "./constants.js";
import { manifests as permissions } from "./permissions/manifest.js";

const enabled = { alias: "PowerToys.Condition.PowerToyEnabled", match: CHAT_POWER_TOY_ALIAS };

export const manifests: Array<UmbExtensionManifest> = [
  {
    type: "powerToy",
    alias: CHAT_POWER_TOY_ALIAS,
    name: "Chat Power Toy",
    // Below Logo Changer (50), the last of the existing power toys
    weight: 10,
    meta: {
      label: "Chat",
      description: "Chat with other editors, everyone at once or about the page you're on, from the backoffice header.",
      icon: "icon-chat",
      modal: {
        element: () => import("./settings/chat-settings-modal.element.js"),
        savable: true,
      },
    },
  },
  // Holds the hub connection. Always registered, but it only connects while the power toy
  // is on, so it can follow the toggle without a reload.
  {
    type: "globalContext",
    alias: "PowerToys.Chat.Context",
    name: "Chat Context",
    api: () => import("./global/chat.context.js"),
  },
  {
    type: "headerApp",
    alias: "PowerToys.Chat.HeaderApp",
    name: "Chat Header App",
    element: () => import("./header/chat-header.element.js"),
    weight: 19,
    meta: {
      label: "#powerToysChat_chat",
      icon: "icon-chat",
      path: "chat",
    },
    conditions: [enabled],
  },
  // Tells the chat which document is open, for the sidebar's "This page" chat
  {
    type: "workspaceContext",
    alias: "PowerToys.Chat.WorkspaceContext.CurrentDocument",
    name: "Chat Current Document Workspace Context",
    api: () => import("./workspace/current-document.workspace-context.js"),
    conditions: [{ alias: "Umb.Condition.WorkspaceAlias", match: "Umb.Workspace.Document" }, enabled],
  },
  {
    type: "modal",
    alias: "PowerToys.Chat.Modal",
    name: "Chat Modal",
    element: () => import("./modal/chat-modal.element.js"),
  },
  {
    type: "modal",
    alias: "PowerToys.Chat.Modal.Important",
    name: "Chat Important Message Modal",
    element: () => import("./confirmations/important-modal.element.js"),
  },
  {
    type: "modal",
    alias: "PowerToys.Chat.Modal.ConfirmationStatus",
    name: "Chat Confirmation Status Modal",
    element: () => import("./confirmations/confirmation-status-modal.element.js"),
  },
  {
    type: "localization",
    alias: "PowerToys.Chat.Localization.EnUs",
    name: "Chat English (US) Localization",
    weight: 0,
    meta: {
      culture: "en-us",
    },
    js: () => import("./localization/en-us.js"),
  },
  ...permissions,
];
