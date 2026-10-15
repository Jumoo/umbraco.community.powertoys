export interface ChatMessage {
  key: string;
  channel: string;
  message: string;
  userName: string;
  userKey?: string;
  date: string;
  // Each recipient is asked to confirm they've read it
  requiresConfirmation?: boolean;
  // Opens over the backoffice until confirmed
  important?: boolean;
  // "activity" for a line about something that happened to the document
  type?: "message" | "activity";
  // JSON details for an activity line
  payload?: string;
}

// Unread messages in one channel. Mentions of the current user are counted separately.
export interface UnreadCount {
  channel: string;
  unread: number;
  mentions: number;
}

export interface MentionableUser {
  key: string;
  name: string;
}

export interface MentionableGroup {
  key: string;
  alias: string;
  name: string;
}

export interface Mentionables {
  users: MentionableUser[];
  groups: MentionableGroup[];
}

export interface SendMessageResult {
  // People the sender mentioned by name who can't see the chat
  unreachable: string[];
}

export type ChannelKind = "Global" | "Document" | "Direct" | "Group";

export interface Conversation {
  channel: string;
  kind: ChannelKind;
  // Group or document name. Direct conversations are named from their participants.
  title?: string;
  participants: string[];
  latest?: ChatMessage;
}

export interface RecipientStatus {
  userKey: string;
  name: string;
  confirmed?: string;
}

export interface ConfirmationStatus {
  messageKey: string;
  recipients: RecipientStatus[];
}
