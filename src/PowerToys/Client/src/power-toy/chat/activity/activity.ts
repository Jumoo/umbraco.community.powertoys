import type { ChatMessage } from "../signalR/types";

interface ActivityPayload {
  action: string;
  count?: number;
  title?: string | null;
  target?: string | null;
}

export const isActivity = (message: ChatMessage) => message.type === "activity";

/**
 * The sentence for an activity line, e.g. "Kevin published this". Built here rather than on
 * the server so it can be localised. Unknown actions fall back to the action name.
 */
export function activityText(message: ChatMessage, term: (key: string, ...args: unknown[]) => string) {
  let payload: ActivityPayload | undefined;
  try {
    payload = message.payload ? (JSON.parse(message.payload) as ActivityPayload) : undefined;
  } catch {
    payload = undefined;
  }

  const action = payload?.action ?? "";
  const text = term(
    `powerToysChat_activity${action}`,
    message.userName,
    payload?.count ?? 1,
    payload?.title ?? "",
    payload?.target ?? ""
  );
  return text.startsWith("powerToysChat_") ? `${message.userName}: ${action}` : text;
}
