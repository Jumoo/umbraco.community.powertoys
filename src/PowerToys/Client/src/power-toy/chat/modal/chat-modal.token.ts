import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { Conversation } from "../signalR/types";

export interface ChatModalData {
  // Open straight into this conversation rather than the list
  conversation?: Conversation;
}

export type ChatModalResult = Record<string, never>;

export const CHAT_MODAL_ALIAS = "PowerToys.Chat.Modal";

export const CHAT_MODAL = new UmbModalToken<ChatModalData, ChatModalResult>(
  CHAT_MODAL_ALIAS,
  {
    modal: {
      size: "small",
      type: "sidebar",
    },
  }
);
