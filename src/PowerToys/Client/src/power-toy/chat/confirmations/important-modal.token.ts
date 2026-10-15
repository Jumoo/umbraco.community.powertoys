import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ChatMessage } from "../signalR/types";

export interface ImportantModalData {
  message: ChatMessage;
}

export type ImportantModalValue = Record<string, never>;

export const CHAT_IMPORTANT_MODAL = new UmbModalToken<ImportantModalData, ImportantModalValue>(
  "PowerToys.Chat.Modal.Important",
  {
    modal: {
      type: "dialog",
      size: "medium",
    },
  }
);
