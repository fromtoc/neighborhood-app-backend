'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from './NotificationProvider';
import { useAuth } from './AuthProvider';
import { fetchSettings, updateSettings, typeLabel, type NotificationSettings } from '@/lib/notifications';
import type { NotificationItem } from '@/lib/notifications';
import PrivateChatModal from './PrivateChatModal';

export default function NotificationBell() {
  const { user, token } = useAuth();
  const { items, unread, loading, markOne, markAll, refresh } = useNotifications();
  const [open, setOpen]             = useState(false);
  const [tab, setTab]               = useState<'list' | 'settings'>('list');
  const [settings, setSettings]     = useState<NotificationSettings | null>(null);
  const [savingSettings, setSaving] = useState(false);
  const [privateChat, setPrivateChat] = useState<{ userId: number; nickname: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // 點外部關閉
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // 開啟時載入設定
  useEffect(() => {
    if (!open || !token || settings) return;
    fetchSettings(token).then(setSettings).catch(() => {});
  }, [open, token, settings]);

  if (!user) return null;

  async function handleToggleSetting(key: keyof NotificationSettings) {
    if (!token || !settings) return;
    const next = { ...settings, [key]: settings[key] ? 0 : 1 };
    setSettings(next);
    setSaving(true);
    try { await updateSettings(token, next); } finally { setSaving(false); }
  }

  function handleOpen() {
    setOpen(o => !o);
    if (!open) refresh();
  }

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      {/* 鈴鐺按鈕 */}
      <button
        onClick={handleOpen}
        aria-label="通知"
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', padding: '4px 6px', display: 'flex',
          alignItems: 'center', color: '#555',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: '#e53e3e', color: '#fff',
            borderRadius: '50%', fontSize: '0.6rem', fontWeight: 700,
            minWidth: 16, height: 16, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', lineHeight: 1,
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: '#fff', border: '1px solid #e6e6e6',
          borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          width: 320, zIndex: 300, overflow: 'hidden',
          display: 'flex', flexDirection: 'column', maxHeight: 480,
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center',
            padding: '0.7rem 1rem', borderBottom: '1px solid #f0f0f0',
            gap: '0.5rem',
          }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', flex: 1 }}>通知</span>
            <button
              onClick={() => setTab(t => t === 'list' ? 'settings' : 'list')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '0.8rem' }}
            >
              {tab === 'list' ? '⚙️ 設定' : '← 返回'}
            </button>
            {tab === 'list' && unread > 0 && (
              <button
                onClick={markAll}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1c5373', fontSize: '0.78rem' }}
              >
                全部已讀
              </button>
            )}
          </div>

          {tab === 'settings' ? (
            <SettingsPanel settings={settings} saving={savingSettings} onToggle={handleToggleSetting} />
          ) : (
            <NotificationList
              items={items} loading={loading} onMark={markOne}
              onClose={() => setOpen(false)}
              onOpenPrivateChat={(userId, nickname) => {
                setOpen(false);
                setPrivateChat({ userId, nickname });
              }}
            />
          )}
        </div>
      )}

      {privateChat && (
        <PrivateChatModal
          targetUserId={privateChat.userId}
          targetNickname={privateChat.nickname}
          onClose={() => setPrivateChat(null)}
        />
      )}
    </div>
  );
}

function NotificationList({
  items, loading, onMark, onClose, onOpenPrivateChat,
}: {
  items: NotificationItem[];
  loading: boolean;
  onMark: (id: number) => void;
  onClose: () => void;
  onOpenPrivateChat: (userId: number, nickname: string) => void;
}) {
  const router = useRouter();

  function handleClick(n: NotificationItem) {
    if (!n.isRead) onMark(n.id);

    // 私訊：開啟對話框
    if (n.type === 'private_message' && n.refType === 'user' && n.refId) {
      const senderName = n.title.replace(' 傳給你私訊', '') || `用戶 #${n.refId}`;
      onOpenPrivateChat(n.refId, senderName);
      return;
    }

    const url = buildNavUrl(n);
    if (url) {
      onClose();
      router.push(url);
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#bbb', fontSize: '0.85rem' }}>載入中...</div>;
  }
  if (items.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#bbb', fontSize: '0.85rem' }}>沒有通知</div>;
  }

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {items.map(n => (
        <div
          key={n.id}
          onClick={() => handleClick(n)}
          style={{
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #f5f5f5',
            background: n.isRead ? '#fff' : '#f0f6ff',
            cursor: buildNavUrl(n) || !n.isRead ? 'pointer' : 'default',
            display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
          }}
        >
          <span style={{
            fontSize: '0.65rem', fontWeight: 600,
            background: typeColor(n.type), color: '#fff',
            borderRadius: 4, padding: '2px 5px', whiteSpace: 'nowrap', marginTop: 2,
          }}>
            {typeLabel(n.type)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: n.isRead ? 400 : 600, color: '#1e1e1e' }}>
              {n.title}
            </div>
            {n.body && (
              <div style={{
                fontSize: '0.75rem', color: '#828282', marginTop: '0.15rem',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {n.body}
              </div>
            )}
            {n.neighborhoodName && (
              <div style={{ fontSize: '0.68rem', color: '#1c5373', marginTop: '0.1rem' }}>
                {n.city}{n.district}{n.neighborhoodName}
              </div>
            )}
            <div style={{ fontSize: '0.68rem', color: '#bbb', marginTop: '0.1rem' }}>
              {formatTime(n.createdAt)}
            </div>
          </div>
          {!n.isRead && (
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1c5373', flexShrink: 0, marginTop: 4 }} />
          )}
        </div>
      ))}
    </div>
  );
}

/** 根據通知類型建立導頁 URL */
function buildNavUrl(n: NotificationItem): string | null {
  if (n.city && n.district && n.neighborhoodName) {
    const base = `/${encodeURIComponent(n.city)}/${encodeURIComponent(n.district)}/${encodeURIComponent(n.neighborhoodName)}`;
    if (n.type === 'chat')     return `${base}?tab=chat`;
    if (n.type === 'new_info') return `${base}?tab=info`;
    return `${base}?tab=community`;
  }
  return null;
}

function SettingsPanel({
  settings, saving, onToggle,
}: {
  settings: NotificationSettings | null;
  saving: boolean;
  onToggle: (key: keyof NotificationSettings) => void;
}) {
  const items: { key: keyof NotificationSettings; label: string; desc: string }[] = [
    { key: 'newPost',        label: '新貼文',  desc: '關注的里有新貼文時通知' },
    { key: 'newInfo',        label: '新資訊',  desc: '關注的里有防災/停水等資訊' },
    { key: 'chat',           label: '聊聊',    desc: '關注的里聊天室有新訊息' },
    { key: 'privateMessage', label: '私訊',    desc: '收到私訊時通知' },
  ];

  if (!settings) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#bbb', fontSize: '0.85rem' }}>載入中...</div>;
  }

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {items.map(({ key, label, desc }) => (
        <div
          key={key}
          style={{
            display: 'flex', alignItems: 'center',
            padding: '0.65rem 1rem', gap: '0.75rem',
            borderBottom: '1px solid #f5f5f5',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e1e1e' }}>{label}</div>
            <div style={{ fontSize: '0.73rem', color: '#aaa', marginTop: 1 }}>{desc}</div>
          </div>
          <Toggle
            enabled={!!settings[key]}
            disabled={saving}
            onChange={() => onToggle(key)}
          />
        </div>
      ))}
    </div>
  );
}

function Toggle({ enabled, disabled, onChange }: { enabled: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      aria-checked={enabled}
      role="switch"
      style={{
        width: 40, height: 22, borderRadius: 11,
        background: enabled ? '#1c5373' : '#d1d5db',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background 0.2s',
        flexShrink: 0, opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 3,
        left: enabled ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
      }} />
    </button>
  );
}

function typeColor(type: NotificationItem['type']) {
  const map: Record<string, string> = {
    new_post: '#1c5373', new_info: '#e07b00', chat: '#059669', private_message: '#7c3aed',
  };
  return map[type] ?? '#888';
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60)    return '剛剛';
    if (diff < 3600)  return `${Math.floor(diff / 60)} 分鐘前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return '';
  }
}
