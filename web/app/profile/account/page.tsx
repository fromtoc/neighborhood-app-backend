'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { clearAuth } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

const PRIVACY_TOGGLES = [
  {
    id: 'show-online',
    icon: '🟢',
    label: '顯示上線狀態',
    subtitle: '其他人可以看到你是否在線上',
  },
];

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, showLoginModal } = useAuth();
  const [privacyToggles, setPrivacyToggles] = useState<Record<string, boolean>>({
    'show-online': true,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!user) {
    return (
      <div className="section" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <p style={{ color: '#666', marginBottom: '1rem' }}>請先登入</p>
        <button onClick={() => showLoginModal()} style={primaryBtnStyle}>登入</button>
      </div>
    );
  }

  const isGuest = user.role === 'GUEST';

  const handleToggle = (id: string) => {
    setPrivacyToggles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDeleteAccount = () => {
    clearAuth();
    router.push('/');
    router.refresh();
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Link href="/profile" style={{ color: '#1c5373', textDecoration: 'none', fontSize: '0.9rem' }}>← 返回</Link>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e1e1e', margin: 0 }}>帳號與隱私</h2>
      </div>

      {/* Login Method */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>登入方式</div>
        <div style={{ padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.2rem' }}>
            {isGuest ? '📱' : '🔑'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#333' }}>
              {isGuest ? '訪客模式' : '社群帳號登入'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#999', marginTop: '0.1rem' }}>
              ID: {user.userId}
            </div>
          </div>
          <span style={{
            fontSize: '0.72rem', padding: '2px 8px', borderRadius: 4,
            background: isGuest ? '#FEF3C7' : '#D1FAE5',
            color: isGuest ? '#92400E' : '#065F46',
            fontWeight: 600,
          }}>
            {isGuest ? '未驗證' : '已連結'}
          </span>
        </div>
        {isGuest && (
          <button
            onClick={() => showLoginModal()}
            style={{
              width: '100%', padding: '0.7rem', border: 'none', borderTop: '1px solid #f0f0f0',
              background: 'transparent', color: '#1c5373', fontSize: '0.88rem',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            升級為正式帳號
          </button>
        )}
      </div>

      {/* Privacy */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>隱私</div>
        {PRIVACY_TOGGLES.map((item, i) => (
          <div key={item.id} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.8rem 1rem',
            borderTop: i > 0 ? '1px solid #f0f0f0' : 'none',
          }}>
            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#333' }}>{item.label}</div>
              <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.1rem' }}>{item.subtitle}</div>
            </div>
            <button
              onClick={() => handleToggle(item.id)}
              style={{
                width: 44, height: 24, borderRadius: 12, border: 'none',
                background: privacyToggles[item.id] ? '#1c5373' : '#ddd',
                cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2,
                left: privacyToggles[item.id] ? 22 : 2,
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
        ))}
      </div>

      {/* Account Management */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>帳號管理</div>
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            width: '100%', padding: '0.8rem 1rem', border: 'none',
            background: 'transparent', cursor: 'pointer', textAlign: 'left',
          }}
          onClick={() => {}}
        >
          <span style={{ fontSize: '1.1rem' }}>🚫</span>
          <span style={{ flex: 1, fontSize: '0.9rem', color: '#333' }}>封鎖名單</span>
          <span style={{ color: '#ccc', fontSize: '0.8rem' }}>›</span>
        </button>
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            width: '100%', padding: '0.8rem 1rem', border: 'none',
            background: 'transparent', cursor: 'pointer', textAlign: 'left',
            borderTop: '1px solid #f0f0f0',
          }}
          onClick={() => setShowDeleteConfirm(true)}
        >
          <span style={{ fontSize: '1.1rem' }}>🗑️</span>
          <span style={{ flex: 1, fontSize: '0.9rem', color: '#e53e3e' }}>刪除帳號</span>
          <span style={{ color: '#ccc', fontSize: '0.8rem' }}>›</span>
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '1.5rem',
            maxWidth: 320, width: '90%', textAlign: 'center',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem' }}>確定要刪除帳號？</h3>
            <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              此操作無法復原，你的所有資料（貼文、留言、收藏）將會被永久刪除。
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1, padding: '0.6rem', border: '1px solid #ddd', borderRadius: 8,
                  background: '#fff', color: '#333', fontSize: '0.88rem', cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={handleDeleteAccount}
                style={{
                  flex: 1, padding: '0.6rem', border: 'none', borderRadius: 8,
                  background: '#e53e3e', color: '#fff', fontSize: '0.88rem',
                  cursor: 'pointer', fontWeight: 600,
                }}
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
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
