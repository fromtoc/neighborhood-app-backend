'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getToken, dispatchAuthExpired } from '@/lib/auth-client';
import {
  fetchFollowing,
  unfollowNeighborhood,
  setDefaultNeighborhood,
  updateFollowAlias,
  followNeighborhood,
  type FollowedNeighborhood,
  type FollowListResponse,
} from '@/lib/follow';
import { CLIENT_BASE_URL } from '@/lib/api';

export default function FollowsManagePage() {
  const router = useRouter();
  const { user, showLoginModal } = useAuth();
  const [data, setData] = useState<FollowListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // alias editing
  const [editingVillage, setEditingVillage] = useState<FollowedNeighborhood | null>(null);
  const [editText, setEditText] = useState('');

  // delete confirm
  const [confirmDelete, setConfirmDelete] = useState<FollowedNeighborhood | null>(null);

  // help info
  const [showHelp, setShowHelp] = useState(false);

  // search to add (two-step: search → pick)
  const [showSearch, setShowSearch] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: number; name: string; city: string; district: string }>>([]);
  const [searching, setSearching] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    try {
      const result = await fetchFollowing(token);
      setData(result);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (!user) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <p style={{ color: '#666', marginBottom: '1rem' }}>請先登入</p>
        <button onClick={() => showLoginModal()} style={primaryBtnStyle}>登入</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center', color: '#999' }}>
        載入中...
      </div>
    );
  }

  const follows = data?.follows ?? [];
  const cooldownSlots = data?.cooldownSlots ?? 0;
  const cooldownExpiredAt = data?.cooldownExpiredAt;
  const canAdd = follows.length + cooldownSlots < 3;

  const handleSetDefault = async (nhId: number) => {
    const token = getToken();
    if (!token) { dispatchAuthExpired(); return; }
    setActionLoading(true);
    try {
      await setDefaultNeighborhood(token, nhId);
      await loadData();
      window.dispatchEvent(new Event('follow-changed'));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '操作失敗');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveAlias = async () => {
    if (!editingVillage) return;
    const token = getToken();
    if (!token) { dispatchAuthExpired(); return; }
    setActionLoading(true);
    try {
      await updateFollowAlias(token, editingVillage.id, editText.trim());
      setEditingVillage(null);
      await loadData();
      window.dispatchEvent(new Event('follow-changed'));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '操作失敗');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const token = getToken();
    if (!token) { dispatchAuthExpired(); return; }
    setActionLoading(true);
    try {
      await unfollowNeighborhood(token, confirmDelete.id);
      setConfirmDelete(null);
      await loadData();
      window.dispatchEvent(new Event('follow-changed'));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '操作失敗');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClick = (f: FollowedNeighborhood) => {
    if (follows.length <= 1) {
      alert('至少需要保留一個關注里。');
      return;
    }
    if (f.isDefault) {
      alert('請先將其他里設為預設，再刪除此里。');
      return;
    }
    setConfirmDelete(f);
  };

  const handleSearch = async () => {
    if (!searchKeyword.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/neighborhoods?keyword=${encodeURIComponent(searchKeyword.trim())}&page=1&size=10`);
      const json = await res.json();
      const records = json.data?.records ?? json.data ?? [];
      setSearchResults(records);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleFollow = async (nhId: number) => {
    const token = getToken();
    if (!token) { dispatchAuthExpired(); return; }
    setActionLoading(true);
    try {
      await followNeighborhood(token, nhId);
      setShowSearch(false);
      setSearchKeyword('');
      setSearchResults([]);
      await loadData();
      window.dispatchEvent(new Event('follow-changed'));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '關注失敗');
    } finally {
      setActionLoading(false);
    }
  };

  const cooldownDaysLeft = cooldownExpiredAt
    ? Math.max(1, Math.ceil((new Date(cooldownExpiredAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 0' }}>
        <button onClick={() => router.back()} style={backBtnStyle}>
          <span style={{ fontSize: '1.1rem' }}>‹</span>
        </button>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#1c5373', flex: 1 }}>
          關注里
        </h1>
        <button
          onClick={() => setShowHelp(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#999', fontSize: '1.1rem' }}
          title="關於關注里"
        >
          &#9432;
        </button>
      </div>

      {/* Village list card */}
      <div style={{
        background: '#fff', borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {follows.map((f, i) => (
          <div key={f.id} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.875rem 1rem',
            borderBottom: i < follows.length - 1 || canAdd || (cooldownSlots > 0 && follows.length < 3)
              ? '1px solid #f0f0f0' : 'none',
          }}>
            {/* Location icon */}
            <span style={{ fontSize: '1.15rem', color: '#1c5373', flexShrink: 0 }}>
              &#x1F4CD;
            </span>

            {/* Village info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  fontSize: '0.93rem', fontWeight: 500, color: '#1e1e1e',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {f.district} · {f.name}
                </span>
                {f.isDefault && (
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 600,
                    padding: '1px 8px', borderRadius: 6,
                    background: 'rgba(217, 170, 56, 0.13)',
                    color: '#b8860b',
                    flexShrink: 0,
                  }}>
                    預設
                  </span>
                )}
              </div>
              {f.alias && (
                <div style={{ fontSize: '0.82rem', color: '#888', marginTop: '2px' }}>
                  {f.alias}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexShrink: 0 }}>
              {!f.isDefault && follows.length > 1 && (
                <button
                  onClick={() => handleSetDefault(f.id)}
                  disabled={actionLoading}
                  title="設為預設"
                  style={actionIconStyle}
                >
                  <span style={{ color: '#d9aa38' }}>&#9873;</span>
                </button>
              )}
              <button
                onClick={() => { setEditingVillage(f); setEditText(f.alias || ''); }}
                title="編輯別名"
                style={actionIconStyle}
              >
                <span style={{ color: '#1c5373' }}>&#9998;</span>
              </button>
              {follows.length > 1 && !f.isDefault && (
                <button
                  onClick={() => handleDeleteClick(f)}
                  disabled={actionLoading}
                  title="刪除"
                  style={actionIconStyle}
                >
                  <span style={{ color: '#e53e3e' }}>&#128465;</span>
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Add button */}
        {canAdd && !cooldownSlots && (
          <button
            onClick={() => setShowSearch(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              width: '100%', padding: '0.875rem 1rem',
              background: 'none', border: 'none', cursor: 'pointer',
              borderTop: follows.length > 0 ? 'none' : undefined,
            }}
          >
            <span style={{ fontSize: '1.15rem', color: '#d9aa38' }}>&#10133;</span>
            <span style={{ fontSize: '0.93rem', fontWeight: 500, color: '#d9aa38' }}>新增關注里</span>
          </button>
        )}

        {/* Cooldown notice */}
        {cooldownSlots > 0 && follows.length < 3 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.65rem',
            padding: '0.875rem 1rem',
          }}>
            <span style={{ fontSize: '1rem', color: '#999' }}>&#9201;</span>
            <span style={{ fontSize: '0.85rem', color: '#999' }}>
              冷卻中，{cooldownDaysLeft} 天後可新增
            </span>
          </div>
        )}
      </div>

      {/* Help info modal */}
      {showHelp && (
        <ModalOverlay onClose={() => setShowHelp(false)}>
          <div style={{ padding: '1.5rem' }}>
            <p style={{ fontSize: '1.05rem', fontWeight: 700, textAlign: 'center', marginBottom: '1rem', color: '#1e1e1e' }}>
              關於關注里
            </p>
            <div style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.7 }}>
              <p>您最多可以關注 3 個里，主頁會根據您選擇的里顯示對應的社區資訊與天氣。</p>
              <p style={{ marginTop: '0.5rem' }}>
                • 設為「預設」的里會在開啟時自動載入<br />
                • 有多個關注里時，可快速切換<br />
                • 刪除關注里後會進入 7 天冷卻期，期間無法新增新的關注里，請謹慎操作
              </p>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              style={{ ...modalConfirmBtnStyle, width: '100%', marginTop: '1.25rem' }}
            >
              我知道了
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* Edit alias modal — matching app style */}
      {editingVillage && (
        <ModalOverlay onClose={() => setEditingVillage(null)}>
          <div style={{ padding: '1.5rem' }}>
            <p style={{ fontSize: '1.05rem', fontWeight: 700, textAlign: 'center', marginBottom: '0.35rem', color: '#1e1e1e' }}>
              編輯別名
            </p>
            <p style={{ fontSize: '0.82rem', color: '#999', textAlign: 'center', marginBottom: '1rem' }}>
              {editingVillage.district} · {editingVillage.name}
            </p>
            <input
              value={editText}
              onChange={e => setEditText(e.target.value)}
              maxLength={30}
              placeholder="輸入別名（留空則顯示原名）"
              autoFocus
              style={{
                width: '100%', border: 'none', borderRadius: 10,
                padding: '0.75rem 0.875rem', fontSize: '0.95rem',
                background: '#f5f5f5', outline: 'none',
                boxSizing: 'border-box',
              }}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveAlias(); }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                onClick={() => setEditingVillage(null)}
                style={modalCancelBtnStyle}
              >
                取消
              </button>
              <button
                onClick={handleSaveAlias}
                disabled={actionLoading}
                style={modalConfirmBtnStyle}
              >
                確定
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <ModalOverlay onClose={() => setConfirmDelete(null)}>
          <div style={{ padding: '1.5rem' }}>
            <p style={{ fontSize: '1.05rem', fontWeight: 700, textAlign: 'center', marginBottom: '0.35rem', color: '#1e1e1e' }}>
              刪除關注里
            </p>
            <p style={{ fontSize: '0.88rem', color: '#666', textAlign: 'center', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              確定要刪除「{confirmDelete.district} · {confirmDelete.alias || confirmDelete.name}」嗎？
              <br /><br />
              刪除後將有 7 天冷卻期，期間無法新增關注里。
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setConfirmDelete(null)} style={modalCancelBtnStyle}>
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                style={{ ...modalConfirmBtnStyle, background: '#e53e3e' }}
              >
                {actionLoading ? '處理中...' : '確定刪除'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Search modal */}
      {showSearch && (
        <ModalOverlay onClose={() => { setShowSearch(false); setSearchResults([]); setSearchKeyword(''); }}>
          <div style={{ padding: '1.5rem' }}>
            <p style={{ fontSize: '1.05rem', fontWeight: 700, textAlign: 'center', marginBottom: '1rem', color: '#1e1e1e' }}>
              新增關注里
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                placeholder="搜尋里名、區名或城市"
                autoFocus
                style={{
                  flex: 1, border: 'none', borderRadius: 10,
                  padding: '0.65rem 0.875rem', fontSize: '0.93rem',
                  background: '#f5f5f5', outline: 'none',
                }}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              />
              <button onClick={handleSearch} disabled={searching} style={modalConfirmBtnStyle}>
                {searching ? '...' : '搜尋'}
              </button>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {searchResults.length === 0 && !searching && searchKeyword && (
                <p style={{ fontSize: '0.85rem', color: '#999', textAlign: 'center', padding: '1rem 0' }}>無搜尋結果</p>
              )}
              {searchResults.map(nh => {
                const alreadyFollowed = follows.some(f => f.id === nh.id);
                return (
                  <div key={nh.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.65rem 0.25rem', borderBottom: '1px solid #f5f5f5',
                  }}>
                    <span style={{ fontSize: '0.9rem', color: '#333' }}>
                      {nh.city}{nh.district} · {nh.name}
                    </span>
                    {alreadyFollowed ? (
                      <span style={{ fontSize: '0.78rem', color: '#999' }}>已關注</span>
                    ) : (
                      <button onClick={() => handleFollow(nh.id)} disabled={actionLoading}
                        style={{
                          background: '#1c5373', color: '#fff', border: 'none',
                          borderRadius: 8, padding: '0.35rem 0.75rem', fontSize: '0.8rem',
                          cursor: 'pointer', fontWeight: 600,
                        }}>
                        關注
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 340,
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      }}>
        {children}
      </div>
    </div>
  );
}

const primaryBtnStyle: React.CSSProperties = {
  background: '#1c5373', color: '#fff', border: 'none',
  borderRadius: 8, padding: '0.5rem 1.25rem', fontSize: '0.88rem',
  cursor: 'pointer', fontWeight: 600,
};

const backBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: '1.2rem',
  cursor: 'pointer', padding: '4px 8px', color: '#1c5373',
  display: 'flex', alignItems: 'center',
};

const actionIconStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: '2px', fontSize: '1.05rem', lineHeight: 1,
};

const modalCancelBtnStyle: React.CSSProperties = {
  flex: 1, textAlign: 'center',
  padding: '0.7rem', borderRadius: 10,
  border: '1px solid #e0e0e0', background: '#fff',
  fontSize: '0.93rem', fontWeight: 600, color: '#666',
  cursor: 'pointer',
};

const modalConfirmBtnStyle: React.CSSProperties = {
  flex: 1, textAlign: 'center',
  padding: '0.7rem', borderRadius: 10,
  border: 'none', background: '#1c5373',
  fontSize: '0.93rem', fontWeight: 600, color: '#fff',
  cursor: 'pointer',
};
