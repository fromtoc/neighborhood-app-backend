'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

interface ToggleItem {
  id: string;
  icon: string;
  label: string;
  subtitle: string;
  locked?: boolean;
  color?: 'danger' | 'warning' | 'success';
}

const ANNOUNCEMENT_LEVELS: ToggleItem[] = [
  {
    id: 'alert-urgent',
    icon: '⚠️',
    label: '緊急公告',
    subtitle: '颱風、停水停電、緊急避難等',
    locked: true,
    color: 'danger',
  },
  {
    id: 'alert-medium',
    icon: '📢',
    label: '中等公告',
    subtitle: '道路施工、社區活動、垃圾車改時等',
    color: 'warning',
  },
  {
    id: 'alert-normal',
    icon: '📰',
    label: '一般公告',
    subtitle: '里辦活動宣傳、生活資訊分享',
    color: 'success',
  },
  {
    id: 'garbage-truck',
    icon: '🚛',
    label: '垃圾車接近提醒',
    subtitle: '垃圾車靠近你的里時推播通知（需開啟 GPS）',
  },
];

const SOCIAL_ITEMS: ToggleItem[] = [
  {
    id: 'follow-post',
    icon: '❤️',
    label: '收藏與追蹤對象發文',
    subtitle: '追蹤的用戶或收藏的店家有新貼文時通知',
  },
  {
    id: 'post-reply',
    icon: '💬',
    label: '我的貼文有新回覆',
    subtitle: '有人回覆你的貼文或留言時通知',
  },
];

const CHAT_ITEMS: ToggleItem[] = [
  {
    id: 'chat-mention',
    icon: '＠',
    label: '群組中被 @ 提及',
    subtitle: '里聊天室有人 @ 你時通知',
  },
  {
    id: 'chat-private',
    icon: '✉️',
    label: '私訊通知',
    subtitle: '收到新的私人訊息時通知',
  },
];

const TOGGLE_COLORS: Record<string, string> = {
  danger: '#e53e3e',
  warning: '#e67e22',
  success: '#22c55e',
};

export default function NotificationSettingsPage() {
  const { user, showLoginModal } = useAuth();
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    'alert-urgent': true,
    'alert-medium': false,
    'alert-normal': false,
    'garbage-truck': true,
    'follow-post': true,
    'post-reply': true,
    'chat-mention': true,
    'chat-private': true,
  });

  if (!user) {
    return (
      <div className="section" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <p style={{ color: '#666', marginBottom: '1rem' }}>請先登入</p>
        <button onClick={() => showLoginModal()} style={primaryBtnStyle}>登入</button>
      </div>
    );
  }

  const handleToggle = (id: string, item: ToggleItem) => {
    if (!masterEnabled) return;
    if (item.locked && masterEnabled) {
      alert('開啟通知時，緊急公告為必要通知，無法關閉');
      return;
    }
    setToggles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderToggleRow = (item: ToggleItem, i: number) => {
    const isOn = masterEnabled && (item.locked ? true : toggles[item.id]);
    const disabled = !masterEnabled;
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
            {item.locked && masterEnabled && (
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
          onClick={() => handleToggle(item.id, item)}
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
              {masterEnabled ? '已開啟，您會收到以下類型的提醒' : '已關閉，不會收到任何提醒'}
            </div>
          </div>
          <button
            onClick={() => setMasterEnabled(v => !v)}
            style={{
              width: 50, height: 28, borderRadius: 14, border: 'none',
              background: masterEnabled ? '#1c5373' : '#ddd',
              cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 2,
              left: masterEnabled ? 24 : 2,
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
