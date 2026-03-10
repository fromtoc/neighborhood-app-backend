import { CLIENT_BASE_URL } from './api';

export interface NotificationItem {
  id: number;
  type: 'new_post' | 'new_info' | 'chat' | 'private_message';
  title: string;
  body: string | null;
  refType: string | null;
  refId: number | null;
  isRead: number;
  createdAt: string;
  /** 供點擊後導頁用 */
  neighborhoodId:   number | null;
  neighborhoodName: string | null;
  city:             string | null;
  district:         string | null;
}

export interface NotificationSettings {
  newPost: number;
  newInfo: number;
  chat: number;
  privateMessage: number;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function fetchNotifications(token: string, page = 1) {
  const res = await fetch(
    `${CLIENT_BASE_URL}/api/v1/notifications?page=${page}&size=20`,
    { headers: authHeaders(token) },
  );
  const json = await res.json();
  return json.data as { records: NotificationItem[]; total: number; unread: number };
}

export async function markRead(token: string, id: number) {
  await fetch(`${CLIENT_BASE_URL}/api/v1/notifications/${id}/read`, {
    method: 'PUT', headers: authHeaders(token),
  });
}

export async function markAllRead(token: string) {
  await fetch(`${CLIENT_BASE_URL}/api/v1/notifications/read-all`, {
    method: 'PUT', headers: authHeaders(token),
  });
}

export async function fetchSettings(token: string): Promise<NotificationSettings> {
  const res = await fetch(`${CLIENT_BASE_URL}/api/v1/notifications/settings`, {
    headers: authHeaders(token),
  });
  const json = await res.json();
  return json.data;
}

export async function updateSettings(token: string, settings: Partial<NotificationSettings>) {
  await fetch(`${CLIENT_BASE_URL}/api/v1/notifications/settings`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(settings),
  });
}

export async function registerFcmToken(token: string, fcmToken: string) {
  await fetch(`${CLIENT_BASE_URL}/api/v1/notifications/token`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ token: fcmToken, platform: 'web' }),
  });
}

export function typeLabel(type: NotificationItem['type']) {
  const map: Record<string, string> = {
    new_post: '新貼文', new_info: '新資訊', chat: '聊聊', private_message: '私訊',
  };
  return map[type] ?? type;
}
