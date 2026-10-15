import type { Mentionables } from "../signalR/types";

// Mentions travel as tokens, @[user:<key>] and @[group:<alias>], so a rename shows up in
// old messages. These turn tokens into names for display. Matches MentionService on the server.
const MENTION_TOKEN = /@\[(user|group):([^\]\s]+)\]/g;

export type MessageSegment =
  | { kind: "text"; text: string }
  | { kind: "user"; key: string; name: string }
  | { kind: "group"; alias: string; key?: string; name: string };

export const userToken = (key: string) => `@[user:${key}]`;
export const groupToken = (alias: string) => `@[group:${alias}]`;

export function parseMessage(message: string, mentionables?: Mentionables): MessageSegment[] {
  const segments: MessageSegment[] = [];
  let last = 0;

  for (const match of message.matchAll(MENTION_TOKEN)) {
    if (match.index > last) segments.push({ kind: "text", text: message.slice(last, match.index) });

    const [, kind, value] = match;
    if (kind === "user") {
      const user = mentionables?.users.find((u) => u.key === value);
      segments.push({ kind: "user", key: value, name: user?.name ?? "unknown" });
    } else {
      const group = mentionables?.groups.find((g) => g.alias === value);
      segments.push({ kind: "group", alias: value, key: group?.key, name: group?.name ?? value });
    }

    last = match.index + match[0].length;
  }

  if (last < message.length) segments.push({ kind: "text", text: message.slice(last) });
  return segments;
}

/** The message as plain text, with each mention shown as @Name. */
export const toPlainText = (message: string, mentionables?: Mentionables) =>
  parseMessage(message, mentionables)
    .map((s) => (s.kind === "text" ? s.text : `@${s.name}`))
    .join("");
