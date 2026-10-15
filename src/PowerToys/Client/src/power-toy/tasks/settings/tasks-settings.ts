// Matches TasksSettings on the server
export interface TasksSettings {
  reviewsEnabled: boolean;
  // The user group reminded when a page's last editor can't be found; null means Administrators
  reminderGroupKey: string | null;
  reminderHours: number;
}

export const DEFAULT_TASKS_SETTINGS: TasksSettings = {
  reviewsEnabled: false,
  reminderGroupKey: null,
  reminderHours: 1,
};

export function withDefaults(settings: Partial<TasksSettings> | null | undefined): TasksSettings {
  return { ...DEFAULT_TASKS_SETTINGS, ...settings };
}
