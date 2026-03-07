'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import { CLIENT_BASE_URL } from '@/lib/api';

export default function HeaderUserSection() {
  const { user, token, nickname, setNickname, showLoginModal, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameError, setNicknameError] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // 點外部關閉 dropdown
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  if (!user) {
    return (
      <button
        onClick={() => showLoginModal()}
        style={{
          background: '#1c5373', color: '#fff',
          border: 'none', borderRadius: 8,
          padding: '0.35rem 1rem', fontSize: '0.82rem',
          cursor: 'pointer', whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        登入
      </button>
    );
  }

  const isGuest = user.role === 'GUEST';
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  const name = isGuest ? `訪客 #${user.userId}` : (nickname || `用戶 #${user.userId}`);
  const initial = isGuest ? '訪' : name.charAt(0).toUpperCase();

  async function handleSaveNickname(e: React.FormEvent) {
    e.preventDefault();
    const n = nicknameInput.trim();
    if (!n) return;
    setNicknameSaving(true);
    setNicknameError('');
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/users/me/nickname`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nickname: n }),
      });
      const json = await res.json();
      if (json.code === 200) {
        setNickname(n);
        setEditingNickname(false);
      } else {
        setNicknameError(json.message ?? '儲存失敗');
      }
    } catch {
      setNicknameError('網路錯誤，請重試');
    } finally {
      setNicknameSaving(false);
    }
  }

  function startEditNickname() {
    setNicknameInput(nickname ?? '');
    setNicknameError('');
    setEditingNickname(true);
  }

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      {/* 頭像按鈕 */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="使用者選單"
        style={{
          background: 'none', border: 'none',
          cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', gap: '0.4rem',
        }}
      >
        <Avatar name={initial} photoURL={user.photoURL} isGuest={isGuest} />
        {/* 桌機才顯示名字 */}
        <span className="header-username" style={{
          fontSize: '0.82rem',
          fontWeight: 600,
          color: isGuest ? '#828282' : '#1c5373',
          maxWidth: 90,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {name}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: '#fff', border: '1px solid #e6e6e6',
          borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          minWidth: 160, zIndex: 200, overflow: 'hidden',
        }}>
          {/* 使用者資訊 */}
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e1e1e' }}>{name}</div>
            <div style={{ fontSize: '0.72rem', color: '#bbb', marginTop: '0.1rem' }}>
              {isGuest ? '訪客' : user.role === 'SUPER_ADMIN' ? '超級管理員' : user.role === 'ADMIN' ? '管理員' : '已登入'}
              {' · '}ID: {user.userId}
            </div>
          </div>

          {/* 升級（僅訪客） */}
          {isGuest && (
            <button
              onClick={() => { setOpen(false); showLoginModal(); }}
              style={menuItemStyle('#1c5373')}
            >
              升級登入
            </button>
          )}

          {/* 編輯暱稱（非訪客） */}
          {!isGuest && (
            <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #f0f0f0' }}>
              {editingNickname ? (
                <form onSubmit={handleSaveNickname} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <input
                    autoFocus
                    value={nicknameInput}
                    onChange={e => setNicknameInput(e.target.value)}
                    placeholder="輸入暱稱..."
                    maxLength={20}
                    disabled={nicknameSaving}
                    style={{
                      padding: '0.3rem 0.6rem',
                      border: '1px solid #1c5373', borderRadius: 6,
                      fontSize: '0.82rem', outline: 'none', width: '100%',
                      boxSizing: 'border-box',
                    }}
                  />
                  {nicknameError && <p style={{ fontSize: '0.72rem', color: '#e53e3e', margin: 0 }}>{nicknameError}</p>}
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button type="submit" disabled={nicknameSaving} style={{ flex: 1, background: '#1c5373', color: '#fff', border: 'none', borderRadius: 6, padding: '0.3rem 0', fontSize: '0.78rem', cursor: 'pointer', opacity: nicknameSaving ? 0.6 : 1 }}>
                      {nicknameSaving ? '儲存中...' : '儲存'}
                    </button>
                    <button type="button" onClick={() => setEditingNickname(false)} disabled={nicknameSaving} style={{ flex: 1, background: 'none', border: '1px solid #e6e6e6', borderRadius: 6, padding: '0.3rem 0', fontSize: '0.78rem', cursor: 'pointer', color: '#828282' }}>
                      取消
                    </button>
                  </div>
                </form>
              ) : (
                <button onClick={startEditNickname} style={{ ...menuItemStyle('#555'), padding: 0, fontSize: '0.82rem' }}>
                  ✏️ 編輯暱稱
                </button>
              )}
            </div>
          )}

          {/* 後台管理（管理員以上） */}
          {isAdmin && (
            <Link
              href="/admin/users"
              onClick={() => setOpen(false)}
              style={{ ...menuItemStyle('#7c3aed'), display: 'block', textDecoration: 'none' }}
            >
              用戶管理
            </Link>
          )}

          {/* 登出 */}
          <button
            onClick={() => { setOpen(false); logout(); }}
            style={menuItemStyle('#e53e3e')}
          >
            登出
          </button>
        </div>
      )}
    </div>
  );
}

function menuItemStyle(color: string): React.CSSProperties {
  return {
    display: 'block', width: '100%', textAlign: 'left',
    padding: '0.6rem 1rem', background: 'none', border: 'none',
    fontSize: '0.85rem', color, cursor: 'pointer',
  };
}

function Avatar({
  name, photoURL, isGuest,
}: { name: string; photoURL?: string | null; isGuest: boolean }) {
  const size = 34;
  const [imgError, setImgError] = useState(false);

  if (photoURL && !imgError) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        overflow: 'hidden', flexShrink: 0,
        border: '2px solid #e6e6e6',
      }}>
        <Image
          src={photoURL}
          alt={name}
          width={size}
          height={size}
          style={{ objectFit: 'cover' }}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: isGuest ? '#e6e6e6' : '#1c5373',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700,
      color: isGuest ? '#828282' : '#fff',
    }}>
      {name}
    </div>
  );
}
