import type {
  ContentReminder,
  DailyTask,
  Interaction,
  Lead,
  Message,
  Project,
  TelegramConnection,
  TelegramReminderSettings,
  UserProfile,
} from '../types';

const API_BASE = import.meta.env.VITE_TELEGRAM_API_URL || '/api';

export const DEFAULT_TELEGRAM_SETTINGS: TelegramReminderSettings = {
  enabled: true,
  taskReminders: true,
  followUpReminders: true,
  postReminders: true,
  leadAlerts: true,
  dailyTaskReminderTime: '09:00',
  followUpReminderTime: '09:00',
  highScoreThreshold: 75,
};

export function getTelegramSettings(): TelegramReminderSettings {
  try {
    const stored = localStorage.getItem('linked_lead_ai_telegram_settings');
    return { ...DEFAULT_TELEGRAM_SETTINGS, ...(stored ? JSON.parse(stored) : {}) };
  } catch {
    return DEFAULT_TELEGRAM_SETTINGS;
  }
}

export function saveTelegramSettings(settings: TelegramReminderSettings): void {
  localStorage.setItem('linked_lead_ai_telegram_settings', JSON.stringify(settings));
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || 'Telegram backend request failed.');
  }
  return data as T;
}

export async function getTelegramStatus(userId: string): Promise<TelegramConnection & { settings?: TelegramReminderSettings; doneTaskIds?: string[] }> {
  const data = await request<{
    botConfigured: boolean;
    bot?: { username?: string };
    connected: boolean;
    telegram?: TelegramConnection;
    settings?: TelegramReminderSettings;
    doneTaskIds?: string[];
  }>(`/telegram/status?userId=${encodeURIComponent(userId)}`);

  return {
    connected: data.connected,
    botConfigured: data.botConfigured,
    botUsername: data.bot?.username,
    chatId: data.telegram?.chatId,
    username: data.telegram?.username,
    firstName: data.telegram?.firstName,
    connectedAt: data.telegram?.connectedAt,
    settings: data.settings,
    doneTaskIds: data.doneTaskIds || [],
  };
}

export async function syncTelegramSnapshot(input: {
  userId: string;
  name: string;
  email: string;
  profile: UserProfile | null;
  projects: Project[];
  interactions: Interaction[];
  settings: TelegramReminderSettings;
  tasks: DailyTask[];
  leads: Lead[];
  messages: Message[];
  contentReminders: ContentReminder[];
}): Promise<{ connected: boolean; doneTaskIds: string[] }> {
  return request('/telegram/sync', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function syncAppSnapshot(input: {
  userId: string;
  name: string;
  email: string;
  profile: UserProfile | null;
  projects: Project[];
  interactions: Interaction[];
  settings: TelegramReminderSettings;
  tasks: DailyTask[];
  leads: Lead[];
  messages: Message[];
  contentReminders: ContentReminder[];
}): Promise<{ databaseConfigured: boolean; updatedAt?: string }> {
  return request('/app/state', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getBackendHealth(): Promise<{
  botConfigured: boolean;
  databaseConfigured: boolean;
}> {
  return request('/health');
}

export async function loadAppSnapshot(userId: string): Promise<{
  databaseConfigured: boolean;
  user: {
    profile?: UserProfile | null;
    projects?: Project[];
    leads?: Lead[];
    messages?: Message[];
    interactions?: Interaction[];
    tasks?: DailyTask[];
    contentReminders?: ContentReminder[];
    settings?: TelegramReminderSettings;
  } | null;
}> {
  return request(`/app/state?userId=${encodeURIComponent(userId)}`);
}

export async function sendTelegramTest(userId: string): Promise<void> {
  await request('/telegram/test', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}
