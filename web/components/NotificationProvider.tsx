'use client';

import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from './AuthProvider';
import { getFcmToken, onForegroundMessage } from '@/lib/firebase';
import {
  fetchNotifications, markAllRead, markRead, registerFcmToken,
  type NotificationItem,
} from '@/lib/notifications';
import { CLIENT_BASE_URL } from '@/lib/api';

interface NotificationContextValue {
  items: NotificationItem[];
  unread: number;
  loading: boolean;
  markOne: (id: number) => void;
  markAll: () => void;
  refresh: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  items: [], unread: 0, loading: false,
  markOne: () => {}, markAll: () => {}, refresh: () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [items, setItems]   = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const stompRef = useRef<Client | null>(null);

  // ── 載入通知 ───────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchNotifications(token);
      setItems(data.records);
      setUnread(data.unread);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ── 登入後載入 & 設定 FCM ─────────────────────────────────────────────
  useEffect(() => {
    if (!user || !token) {
      setItems([]); setUnread(0);
      return;
    }
    refresh();
    setupFcm(token);
  }, [user?.userId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── WebSocket 訂閱 /topic/user/{id} ───────────────────────────────────
  useEffect(() => {
    if (!user || !token) {
      stompRef.current?.deactivate();
      stompRef.current = null;
      return;
    }

    const client = new Client({
      webSocketFactory: () => new SockJS(`${CLIENT_BASE_URL}/ws`) as WebSocket,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
    });

    client.onConnect = () => {
      client.subscribe(`/topic/user/${user.userId}`, (msg) => {
        try {
          const notif = JSON.parse(msg.body) as { type: string; title: string; body: string; refType: string; refId: number };
          // 即時加入清單最前面
          setItems(prev => [{
            id: Date.now(),           // 暫時 id，refresh 後覆蓋
            type: notif.type as NotificationItem['type'],
            title: notif.title,
            body: notif.body || null,
            refType: notif.refType || null,
            refId: notif.refId || null,
            isRead: 0,
            createdAt: new Date().toISOString(),
          }, ...prev.slice(0, 49)]);
          setUnread(n => n + 1);
        } catch { /* ignore */ }
      });
    };

    client.activate();
    stompRef.current = client;

    return () => { client.deactivate(); };
  }, [user?.userId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── FCM 前景訊息 ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const unsub = onForegroundMessage((payload) => {
      // 前景時直接 refresh，顯示在 bell 裡
      refresh();
    });
    return unsub;
  }, [user?.userId, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 操作 ───────────────────────────────────────────────────────────────
  const markOne = useCallback(async (id: number) => {
    if (!token) return;
    setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: 1 } : n));
    setUnread(n => Math.max(0, n - 1));
    await markRead(token, id);
  }, [token]);

  const markAll = useCallback(async () => {
    if (!token) return;
    setItems(prev => prev.map(n => ({ ...n, isRead: 1 })));
    setUnread(0);
    await markAllRead(token);
  }, [token]);

  return (
    <NotificationContext.Provider value={{ items, unread, loading, markOne, markAll, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

async function setupFcm(token: string) {
  try {
    if (!('Notification' in window)) return;
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') return;

    const fcmToken = await getFcmToken();
    if (fcmToken) await registerFcmToken(token, fcmToken);
  } catch {
    // FCM 未設定或瀏覽器不支援，靜默忽略
  }
}
