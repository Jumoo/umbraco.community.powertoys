import type { Conversation, Mentionables } from "../signalR/types";

/**
 * The name to show for a conversation. Direct conversations list the other people in them,
 * using current names, so a rename shows up straight away.
 */
export function conversationTitle(
  conversation: Conversation,
  mentionables: Mentionables,
  currentUserKey: string | undefined,
  term: (key: string) => string
) {
  switch (conversation.kind) {
    case "Global":
      return term("powerToysChat_globalChannel");
    case "Direct":
      return conversation.participants
        .filter((key) => key !== currentUserKey)
        .map((key) => mentionables.users.find((u) => u.key === key)?.name ?? term("powerToysChat_unknownUser"))
        .join(", ");
    default:
      return conversation.title ?? "";
  }
}

export const conversationIcon = (conversation: Conversation) => {
  switch (conversation.kind) {
    case "Global":
      return "icon-globe";
    case "Group":
      return "icon-users";
    case "Document":
      return "icon-document";
    default:
      return "icon-user";
  }
};
