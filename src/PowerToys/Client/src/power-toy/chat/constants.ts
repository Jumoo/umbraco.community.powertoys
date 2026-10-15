// The Chat power toy's alias. Matches ChatConstants.PowerToyAlias on the server.
export const CHAT_POWER_TOY_ALIAS = "PowerToys.PowerToy.Chat";

export const CHAT_GLOBAL_CHANNEL = "global";
export const CHAT_MAX_MESSAGE_LENGTH = 2000;

export const ChatTimeOptions: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
};

// Badges stop counting here, so a busy channel shows "9+" rather than a wide number
export const CHAT_BADGE_MAX = 9;

export const formatBadgeCount = (count: number) =>
  count > CHAT_BADGE_MAX ? `${CHAT_BADGE_MAX}+` : `${count}`;

// Channels whose readers are a list of people, so a message there can ask each to confirm.
// Matches ConfirmationService.CanAskForConfirmation on the server.
export const canAskForConfirmation = (channel: string) =>
  channel === CHAT_GLOBAL_CHANNEL || channel.startsWith("dm:") || channel.startsWith("group:");
