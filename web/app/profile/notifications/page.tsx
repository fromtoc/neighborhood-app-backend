'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { CLIENT_BASE_URL } from '@/lib/api';
import { dispatchAuthExpired } from '@/lib/auth-client';

interface Settings {
  master: number;
  infoMedium: number;
  infoNormal: number;
  garbageTruck: number;
  newPost: number;
  followPost: number;
  postReply: number;
  chat: number;
  mention: number;
  privateMessage: number;
}

/** backend field name → UI toggle id */
const FIELD_MAP: Record<string, keyof Settings> = {
  'alert-medium': 'infoMedium',
  'alert-normal': 'infoNormal',
  'garbage-truck': 'garbageTruck',
  'new-post': 'newPost',
  'follow-post': 'followPost',
  'post-reply': 'postReply',
  'chat-message': 'chat',
  'chat-mention': 'mention',
  'chat-private': 'privateMessage',
};

interface ToggleItem {
  id: string;
  icon: string;
  label: string;
  subtitle: string;
  locked?: boolean;
  color?: 'danger' | 'warning' | 'success';
}

const ANNOUNCEMENT_LEVELS: ToggleItem[] = [
  { id: 'alert-urgent', icon: '⚠️', label: '緊急公告', subtitle: '颱風、停水停電、緊急避難等', locked: true, color: 'danger' },
  { id: 'alert-medium', icon: '📢', label: '中等公告', subtitle: '道路施工、社區活動、垃圾車改時等', color: 'warning' },
  { id: 'alert-normal', icon: '📰', label: '一般公告', subtitle: '里辦活動宣傳、生活資訊分享', color: 'success' },
  { id: 'garbage-truck', icon: '🚛', label: '垃圾車接近提醒', subtitle: '垃圾車靠近你的里時推播通知（需開啟 GPS）' },
];

const SOCIAL_ITEMS: ToggleItem[] = [
  { id: 'new-post', icon: '📝', label: '社群貼文', subtitle: '關注的里有新貼文時通知' },
  { id: 'follow-post', icon: '❤️', label: '追蹤對象發文', subtitle: '追蹤的用戶有新貼文時通知' },
  { id: 'post-reply', icon: '💬', label: '我的貼文有新回覆', subtitle: '有人回覆你的貼文或留言時通知' },
];

const CHAT_ITEMS: ToggleItem[] = [
  { id: 'chat-message', icon: '💬', label: '聊聊新訊息', subtitle: '里/區聊天室有新訊息時通知' },
  { id: 'chat-mention', icon: '＠', label: '被 @ 提及', subtitle: '有人在貼文、留言或聊天室 @ 你時通知' },
  { id: 'chat-private', icon: '✉️', label: '私訊通知', subtitle: '收到新的私人訊息時通知' },
];

const TOGGLE_COLORS: Record<string, string> = {
  danger: '#e53e3e',
  warning: '#e67e22',
  success: '#22c55e',
};

const DEFAULTS: Settings = {
  master: 1, infoMedium: 1, infoNormal: 1,
  garbageTruck: 1, newPost: 1, followPost: 1, postReply: 1, chat: 1, mention: 1, privateMessage: 1,
};

export default function NotificationSettingsPage() {
  const { user, token, showLoginModal } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/notifications/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.code === 401) { dispatchAuthExpired(); return; }
      if (json.code === 200 && json.data) {
        setSettings({
          master: json.data.master ?? 1,
          infoMedium: json.data.infoMedium ?? 1,
          infoNormal: json.data.infoNormal ?? 1,
          garbageTruck: json.data.garbageTruck ?? 1,
          newPost: json.data.newPost ?? 1,
          followPost: json.data.followPost ?? 1,
          mention: json.data.mention ?? 1,
          postReply: json.data.postReply ?? 1,
          chat: json.data.chat ?? 1,
          privateMessage: json.data.privateMessage ?? 1,
        });
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveSettings = async (patch: Partial<Settings>) => {
    if (!token) return;
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/notifications/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (json.code === 401) dispatchAuthExpired();
    } catch { /* ignore */ }
  };

  if (!user) {
    return (
      <div className="section" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <p style={{ color: '#666', marginBottom: '1rem' }}>請先登入</p>
        <button onClick={() => showLoginModal()} style={primaryBtnStyle}>登入</button>
      </div>
    );
  }

  const masterOn = settings.master === 1;

  const handleMasterToggle = () => {
    const newVal = masterOn ? 0 : 1;
    setSettings(prev => ({ ...prev, master: newVal }));
    saveSettings({ master: newVal });
  };

  const handleToggle = (item: ToggleItem) => {
    if (!masterOn) return;
    if (item.locked) {
      alert('開啟通知時，緊急公告為必要通知，無法關閉');
      return;
    }
    const field = FIELD_MAP[item.id];
    if (!field) return;
    const newVal = settings[field] === 1 ? 0 : 1;
    setSettings(prev => ({ ...prev, [field]: newVal }));
    saveSettings({ [field]: newVal });
  };

  const getToggleValue = (item: ToggleItem): boolean => {
    if (!masterOn) return false;
    if (item.locked) return true;
    const field = FIELD_MAP[item.id];
    if (!field) return false;
    return settings[field] === 1;
  };

  const renderToggleRow = (item: ToggleItem, i: number) => {
    const isOn = getToggleValue(item);
    const disabled = !masterOn;
    const trackColor = item.color ? TOGGLE_COLORS[item.color] : '#1c5373';

    return (
      <div key={item.id} style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.8rem 1rem',
        borderTop: i > 0 ? '1px solid #f0f0f0' : 'none',
        opacity: disabled ? 0.45 : 1,
        transition: 'opacity 0.2s',
      }}>
        <span style={{ fontSize: '1.1rem', width: 28, textAlign: 'center' }}>{item.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#333' }}>{item.label}</span>
            {item.locked && masterOn && (
              <span style={{
                fontSize: '0.6rem', padding: '1px 4px', borderRadius: 3,
                background: '#FEE2E2', color: '#991B1B', fontWeight: 600,
              }}>
                必要
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.1rem' }}>{item.subtitle}</div>
        </div>
        <button
          onClick={() => handleToggle(item)}
          disabled={disabled}
          style={{
            width: 44, height: 24, borderRadius: 12, border: 'none',
            background: isOn ? trackColor : '#ddd',
            cursor: disabled ? 'default' : 'pointer',
            position: 'relative', transition: 'background 0.2s',
            flexShrink: 0,
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: '50%', background: '#fff',
            position: 'absolute', top: 2,
            left: isOn ? 22 : 2,
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem', textAlign: 'center', color: '#bbb' }}>
        載入中...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Link href="/profile" style={{ color: '#1c5373', textDecoration: 'none', fontSize: '0.9rem' }}>← 返回</Link>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e1e1e', margin: 0 }}>通知與推播設定</h2>
      </div>

      {/* Master toggle */}
      <div style={sectionStyle}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '1rem',
        }}>
          <span style={{ fontSize: '1.3rem' }}>🔔</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#333' }}>提醒</div>
            <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.1rem' }}>
              {masterOn ? '已開啟，您會收到以下類型的提醒' : '已關閉，不會收到任何提醒'}
            </div>
          </div>
          <button
            onClick={handleMasterToggle}
            style={{
              width: 50, height: 28, borderRadius: 14, border: 'none',
              background: masterOn ? '#1c5373' : '#ddd',
              cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 2,
              left: masterOn ? 24 : 2,
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>
      </div>

      {/* Announcement notifications */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>公告通知</div>
        {ANNOUNCEMENT_LEVELS.map((item, i) => renderToggleRow(item, i))}
      </div>

      {/* Social interactions */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>社群互動</div>
        {SOCIAL_ITEMS.map((item, i) => renderToggleRow(item, i))}
      </div>

      {/* Chat messages */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>聊天訊息</div>
        {CHAT_ITEMS.map((item, i) => renderToggleRow(item, i))}
      </div>
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 12, overflow: 'hidden',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: '0.75rem',
};

const sectionTitleStyle: React.CSSProperties = {
  padding: '0.6rem 1rem 0.3rem', fontSize: '0.75rem',
  color: '#999', fontWeight: 600, textTransform: 'uppercase',
};

const primaryBtnStyle: React.CSSProperties = {
  background: '#1c5373', color: '#fff', border: 'none',
  padding: '0.6rem 1.5rem', borderRadius: 8, fontSize: '0.9rem',
  cursor: 'pointer', fontWeight: 600,
};
