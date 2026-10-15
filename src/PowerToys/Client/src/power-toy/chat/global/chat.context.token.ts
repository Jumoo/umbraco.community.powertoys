import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import type { ChatContext } from "./chat.context";

export const CHAT_CONTEXT = new UmbContextToken<ChatContext>(
  "PowerToys.Chat.Context"
);
