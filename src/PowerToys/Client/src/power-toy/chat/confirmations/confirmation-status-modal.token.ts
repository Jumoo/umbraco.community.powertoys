import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ChatMessage } from "../signalR/types";

export interface ConfirmationStatusModalData {
  message: ChatMessage;
}

export type ConfirmationStatusModalValue = Record<string, never>;

export const CHAT_CONFIRMATION_STATUS_MODAL = new UmbModalToken<
  ConfirmationStatusModalData,
  ConfirmationStatusModalValue
>("PowerToys.Chat.Modal.ConfirmationStatus", {
  modal: {
    type: "sidebar",
    size: "small",
  },
});
