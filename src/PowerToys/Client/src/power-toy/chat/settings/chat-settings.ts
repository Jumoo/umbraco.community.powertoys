// Matches ChatActivitySettings on the server
export interface ChatSettings {
  activityEnabled: boolean;
  activityEvents: string[];
  collapseMinutes: number;
}

// The content events the settings offer. The task and review events are posted by the Tasks
// power toy and are left on, so they aren't listed here.
export const CONTENT_ACTIVITY_EVENTS = [
  "Saved",
  "Published",
  "Unpublished",
  "Moved",
  "Copied",
  "RolledBack",
  "Trashed",
  "Restored",
];

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  activityEnabled: true,
  activityEvents: [...CONTENT_ACTIVITY_EVENTS, "TaskAssigned", "TaskCompleted", "Reviewed", "ReviewDue"],
  collapseMinutes: 30,
};

export function withDefaults(settings: Partial<ChatSettings> | null | undefined): ChatSettings {
  return { ...DEFAULT_CHAT_SETTINGS, ...settings };
}
