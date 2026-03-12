'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getToken, getNickname, saveNickname, clearAuth, dispatchAuthExpired } from '@/lib/auth-client';
import { CLIENT_BASE_URL } from '@/lib/api';

interface ProfileData {
  nickname: string | null;
  bio: string | null;
  useAvatar: boolean;
  avatarUrl: string | null;
  postCount: number;
  bookmarkCount: number;
}

const MENU_SECTIONS = [
  {
    title: '內容',
    items: [
      { id: 'my-posts', icon: '📝', label: '我的貼文' },
      { id: 'bookmarks', icon: '🔖', label: '我的收藏' },
    ],
  },
  {
    title: '設定',
    items: [
      { id: 'follows', icon: '📍', label: '關注里管理' },
      { id: 'account', icon: '👤', label: '帳號與隱私' },
      { id: 'notifications', icon: '🔔', label: '通知與推播設定' },
    ],
  },
  {
    title: '其他',
    items: [
      { id: 'about', icon: 'ℹ️', label: '關於巷口' },
      { id: 'privacy-policy', icon: '🛡️', label: '隱私權政策' },
      { id: 'terms', icon: '📄', label: '服務條款' },
      { id: 'community-guidelines', icon: '👥', label: '社群公約' },
      { id: 'feedback', icon: '💬', label: '意見回饋' },
      { id: 'logout', icon: '🚪', label: '登出' },
    ],
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, showLoginModal } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // edit states
  const [editing, setEditing] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [useAvatarInput, setUseAvatarInput] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.code === 401) { dispatchAuthExpired(); return; }
      if (json.code === 200) setProfile(json.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (!user) {
    return (
      <div className="section" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👤</div>
        <p style={{ color: '#666', marginBottom: '1rem' }}>請先登入以查看個人資料</p>
        <button
          onClick={() => showLoginModal()}
          style={{
            background: '#1c5373', color: '#fff', border: 'none',
            padding: '0.6rem 1.5rem', borderRadius: 8, fontSize: '0.9rem',
            cursor: 'pointer', fontWeight: 600,
          }}
        >
          登入
        </button>
      </div>
    );
  }

  const isGuest = user.role === 'GUEST';
  const displayName = profile?.nickname || getNickname() || user.displayName || `里民 #${user.userId}`;
  const avatarLetter = displayName[0]?.toUpperCase() ?? '?';
  const showPhoto = profile ? (profile.useAvatar && !!profile.avatarUrl) : !!user.photoURL;

  const handleStartEdit = () => {
    setNicknameInput(profile?.nickname || getNickname() || '');
    setBioInput(profile?.bio || '');
    setUseAvatarInput(profile?.useAvatar ?? true);
    setEditing(true);
  };

  const handleSave = async () => {
    const token = getToken();
    if (!token) return;
    if (!nicknameInput.trim()) return;
    if (nicknameInput.trim().length > 20) return;

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        nickname: nicknameInput.trim(),
        bio: bioInput.trim() || null,
        useAvatar: useAvatarInput,
      };
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/users/me/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.code === 401) { dispatchAuthExpired(); return; }
      if (json.code === 200) {
        setProfile(json.data);
        saveNickname(json.data.nickname || nicknameInput.trim());
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (confirm('確定要登出嗎？')) {
      clearAuth();
      router.push('/');
      router.refresh();
    }
  };

  const handleMenuClick = (id: string) => {
    switch (id) {
      case 'my-posts': router.push('/profile/my-posts'); return;
      case 'bookmarks': router.push('/profile/bookmarks'); return;
      case 'follows': router.push('/profile/follows'); return;
      case 'account': router.push('/profile/account'); return;
      case 'notifications': router.push('/profile/notifications'); return;
      case 'about': router.push('/about'); return;
      case 'privacy-policy': router.push('/privacy'); return;
      case 'terms': router.push('/terms'); return;
      case 'community-guidelines': router.push('/community-guidelines'); return;
      case 'feedback':
        alert('如有任何建議或問題，歡迎透過平台內私訊功能聯繫巷口開發團隊。');
        return;
      case 'logout': handleLogout(); return;
    }
  };

  const roleLabel: Record<string, string> = {
    GUEST: '訪客', USER: '里民', ADMIN: '管理員', SUPER_ADMIN: '超級管理員',
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Profile Card */}
      <div style={{
        background: '#fff', borderRadius: 16, padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '1rem',
      }}>
        {/* Avatar + Name row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {showPhoto && user.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="" style={{
              width: 72, height: 72, borderRadius: '50%', objectFit: 'cover',
              border: '3px solid #e8e8e8',
            }} />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: '#1c5373', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.8rem', fontWeight: 700, flexShrink: 0,
              border: '3px solid #e8e8e8',
            }}>
              {avatarLetter}
            </div>
          )}

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e1e1e' }}>{displayName}</span>
              <span style={{
                fontSize: '0.75rem', padding: '2px 8px', borderRadius: 4,
                background: isGuest ? '#f0f0f0' : '#f0f7ff',
                color: isGuest ? '#999' : '#1c5373', fontWeight: 600,
              }}>
                {roleLabel[user.role] ?? user.role}
              </span>
            </div>

            {/* Bio */}
            {profile?.bio && (
              <p style={{ fontSize: '0.85rem', color: '#666', margin: '0.2rem 0 0', lineHeight: 1.5 }}>
                {profile.bio}
              </p>
            )}
            {!profile?.bio && !isGuest && !editing && (
              <p style={{ fontSize: '0.82rem', color: '#bbb', margin: '0.2rem 0 0' }}>
                尚未填寫自我介紹
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        {!loading && profile && !isGuest && (
          <div style={{
            display: 'flex', gap: '1.5rem', marginTop: '1rem',
            paddingTop: '1rem', borderTop: '1px solid #f0f0f0',
          }}>
            <button onClick={() => router.push('/profile/my-posts')} style={statBtnStyle}>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e1e1e' }}>{profile.postCount}</span>
              <span style={{ fontSize: '0.75rem', color: '#999' }}>貼文</span>
            </button>
            <button onClick={() => router.push('/profile/bookmarks')} style={statBtnStyle}>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e1e1e' }}>{profile.bookmarkCount}</span>
              <span style={{ fontSize: '0.75rem', color: '#999' }}>收藏</span>
            </button>
          </div>
        )}

        {/* Edit button */}
        {!isGuest && !editing && (
          <button onClick={handleStartEdit} style={{
            width: '100%', marginTop: '1rem', padding: '0.55rem',
            background: '#f5f5f5', border: '1px solid #e8e8e8', borderRadius: 8,
            fontSize: '0.88rem', fontWeight: 600, color: '#1c5373', cursor: 'pointer',
          }}>
            編輯個人資料
          </button>
        )}

        {/* Edit form */}
        {editing && (
          <div style={{
            marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f0f0f0',
          }}>
            {/* Nickname */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>暱稱</label>
              <input
                value={nicknameInput}
                onChange={e => setNicknameInput(e.target.value)}
                maxLength={20}
                placeholder="輸入暱稱（最多 20 字）"
                style={inputStyle}
                autoFocus
              />
              <div style={{ fontSize: '0.72rem', color: '#bbb', textAlign: 'right', marginTop: 2 }}>
                {nicknameInput.length}/20
              </div>
            </div>

            {/* Bio */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>自我介紹</label>
              <textarea
                value={bioInput}
                onChange={e => setBioInput(e.target.value)}
                maxLength={100}
                placeholder="介紹一下自己（最多 100 字）"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
              />
              <div style={{ fontSize: '0.72rem', color: '#bbb', textAlign: 'right', marginTop: 2 }}>
                {bioInput.length}/100
              </div>
            </div>

            {/* Avatar toggle */}
            {user.photoURL && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '1rem', padding: '0.75rem', background: '#fafafa', borderRadius: 8,
              }}>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#333' }}>顯示第三方頭像</div>
                  <div style={{ fontSize: '0.75rem', color: '#999', marginTop: 2 }}>
                    關閉後將顯示暱稱首字母頭像
                  </div>
                </div>
                <button
                  onClick={() => setUseAvatarInput(v => !v)}
                  style={{
                    width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                    background: useAvatarInput ? '#1c5373' : '#ddd',
                    position: 'relative', transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 3,
                    left: useAvatarInput ? 23 : 3,
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  }} />
                </button>
              </div>
            )}

            {/* Save / Cancel */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleSave} disabled={saving || !nicknameInput.trim()} style={{
                flex: 1, padding: '0.55rem', background: '#1c5373', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600,
                cursor: 'pointer', opacity: saving || !nicknameInput.trim() ? 0.5 : 1,
              }}>
                {saving ? '儲存中...' : '儲存'}
              </button>
              <button onClick={() => setEditing(false)} style={{
                flex: 1, padding: '0.55rem', background: '#f5f5f5', color: '#666',
                border: '1px solid #e8e8e8', borderRadius: 8, fontSize: '0.9rem',
                cursor: 'pointer',
              }}>
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Menu sections */}
      {MENU_SECTIONS.map(section => (
        <div key={section.title} style={{
          background: '#fff', borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: '0.75rem',
        }}>
          <div style={{
            padding: '0.6rem 1rem 0.3rem', fontSize: '0.75rem',
            color: '#999', fontWeight: 600, textTransform: 'uppercase',
          }}>
            {section.title}
          </div>
          {section.items.map((item, i) => (
            <button key={item.id} onClick={() => handleMenuClick(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                width: '100%', padding: '0.8rem 1rem', border: 'none',
                background: 'transparent', cursor: 'pointer', textAlign: 'left',
                borderTop: i > 0 ? '1px solid #f0f0f0' : 'none',
                fontSize: '0.9rem', color: item.id === 'logout' ? '#e53e3e' : '#333',
              }}>
              <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              <span style={{ color: '#ccc', fontSize: '0.8rem' }}>›</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.82rem', fontWeight: 600,
  color: '#555', marginBottom: '0.35rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.75rem',
  border: '1px solid #ddd', borderRadius: 8,
  fontSize: '0.9rem', outline: 'none', background: '#fafafa',
  boxSizing: 'border-box', fontFamily: 'inherit',
};

const statBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
};
