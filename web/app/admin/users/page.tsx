'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { CLIENT_BASE_URL } from '@/lib/api';

interface AdminUser {
  id: number;
  nickname: string | null;
  avatarUrl: string | null;
  isGuest: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  providers: string[];
  createdAt: string;
}

interface PageData {
  total: number;
  records: AdminUser[];
}

const PROVIDER_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  GOOGLE:   { label: 'Google',   color: '#4285f4', bg: '#e8f0fe' },
  LINE:     { label: 'LINE',     color: '#06c755', bg: '#e6faf0' },
  FACEBOOK: { label: 'Facebook', color: '#1877f2', bg: '#e7f0fd' },
  APPLE:    { label: 'Apple',    color: '#1e1e1e', bg: '#f0f0f0' },
  GUEST:    { label: '訪客',     color: '#828282', bg: '#f0f0f0' },
};

const PROVIDER_OPTIONS = ['', 'GOOGLE', 'LINE', 'FACEBOOK', 'APPLE', 'GUEST'];

export default function AdminUsersPage() {
  const { user, token } = useAuth();
  const [data, setData]           = useState<PageData | null>(null);
  const [idInput, setIdInput]     = useState('');
  const [keyword, setKeyword]     = useState('');
  const [provider, setProvider]   = useState('');
  // committed filters (applied on search)
  const [filters, setFilters]     = useState({ id: '', keyword: '', provider: '' });
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [toggling, setToggling]   = useState<number | null>(null);
  const [error, setError]         = useState('');

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'ADMIN' || isSuperAdmin;
  const PAGE_SIZE = 20;

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
      if (filters.id)       params.set('id', filters.id);
      if (filters.keyword)  params.set('keyword', filters.keyword);
      if (filters.provider) params.set('provider', filters.provider);
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/mgmt/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.code === 200) setData(json.data);
      else setError(json.message ?? '載入失敗');
    } catch {
      setError('網路錯誤');
    } finally {
      setLoading(false);
    }
  }, [token, page, filters]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setFilters({ id: idInput.trim(), keyword: idInput.trim() ? '' : keyword.trim(), provider });
  }

  function handleReset() {
    setIdInput(''); setKeyword(''); setProvider('');
    setPage(1);
    setFilters({ id: '', keyword: '', provider: '' });
  }

  async function toggleAdmin(targetId: number, currentIsAdmin: boolean) {
    if (!token || toggling) return;
    setToggling(targetId);
    try {
      const res = await fetch(
        `${CLIENT_BASE_URL}/api/v1/mgmt/users/${targetId}/admin?value=${!currentIsAdmin}`,
        { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      if (json.code === 200) {
        setData(prev => prev ? {
          ...prev,
          records: prev.records.map(u => u.id === targetId ? { ...u, isAdmin: !currentIsAdmin } : u),
        } : null);
      } else {
        setError(json.message ?? '操作失敗');
      }
    } catch {
      setError('網路錯誤');
    } finally {
      setToggling(null);
    }
  }

  if (!user || !isAdmin) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#bbb' }}>
        {!user ? '請先登入' : '需要管理員權限'}
      </div>
    );
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e1e1e', marginBottom: '0.25rem' }}>
          用戶管理
        </h1>
        <p style={{ fontSize: '0.8rem', color: '#bbb' }}>
          共 {data?.total ?? 0} 位用戶
          {isSuperAdmin && ' · 超級管理員可設定/取消管理員'}
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          value={idInput}
          onChange={e => { setIdInput(e.target.value); if (e.target.value) setKeyword(''); }}
          placeholder="用 ID 搜尋..."
          type="number"
          min="1"
          style={{
            width: 130, padding: '0.5rem 0.75rem',
            border: '1px solid #e6e6e6', borderRadius: 8,
            fontSize: '0.875rem', outline: 'none',
          }}
        />
        <input
          value={keyword}
          onChange={e => { setKeyword(e.target.value); if (e.target.value) setIdInput(''); }}
          placeholder="搜尋暱稱..."
          style={{
            flex: 1, minWidth: 120, padding: '0.5rem 0.75rem',
            border: '1px solid #e6e6e6', borderRadius: 8,
            fontSize: '0.875rem', outline: 'none',
          }}
        />
        <select
          value={provider}
          onChange={e => setProvider(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem', border: '1px solid #e6e6e6',
            borderRadius: 8, fontSize: '0.875rem', color: '#555',
            background: '#fff', outline: 'none',
          }}
        >
          {PROVIDER_OPTIONS.map(p => (
            <option key={p} value={p}>{p ? PROVIDER_LABELS[p]?.label : '所有登入方式'}</option>
          ))}
        </select>
        <button type="submit" style={{
          background: '#1c5373', color: '#fff',
          border: 'none', borderRadius: 8,
          padding: '0.5rem 1rem', fontSize: '0.875rem', cursor: 'pointer',
        }}>
          搜尋
        </button>
        {(filters.id || filters.keyword || filters.provider) && (
          <button type="button" onClick={handleReset} style={{
            background: 'none', border: '1px solid #e6e6e6', borderRadius: 8,
            padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: '#828282', cursor: 'pointer',
          }}>
            清除
          </button>
        )}
      </form>

      {error && (
        <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 8, padding: '0.75rem', color: '#c53030', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e6e6e6', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isSuperAdmin ? '60px 1fr 160px 90px 100px' : '60px 1fr 160px 90px',
          padding: '0.65rem 1rem', background: '#f8f9f9',
          borderBottom: '1px solid #f0f0f0',
          fontSize: '0.75rem', color: '#828282', fontWeight: 600,
        }}>
          <span>ID</span>
          <span>用戶</span>
          <span>登入方式</span>
          <span>角色</span>
          {isSuperAdmin && <span style={{ textAlign: 'right' }}>操作</span>}
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#bbb', fontSize: '0.9rem' }}>載入中...</div>
        ) : data?.records.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#bbb', fontSize: '0.9rem' }}>沒有符合的用戶</div>
        ) : data?.records.map((u, i) => (
          <div
            key={u.id}
            style={{
              display: 'grid',
              gridTemplateColumns: isSuperAdmin ? '60px 1fr 160px 90px 100px' : '60px 1fr 160px 90px',
              padding: '0.75rem 1rem',
              borderBottom: i < (data.records.length - 1) ? '1px solid #f4f4f4' : 'none',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '0.78rem', color: '#bbb' }}>#{u.id}</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: u.isSuperAdmin ? '#7c3aed' : u.isAdmin ? '#1c5373' : u.isGuest ? '#e6e6e6' : '#0d9488',
                color: u.isGuest ? '#828282' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.78rem', fontWeight: 700,
              }}>
                {u.nickname ? u.nickname[0].toUpperCase() : '?'}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e1e1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.nickname ?? '（未設定）'}
                </p>
                <p style={{ fontSize: '0.7rem', color: '#bbb' }}>
                  {u.createdAt ? new Date(u.createdAt + '+08:00').toLocaleDateString('zh-TW') : '-'}
                </p>
              </div>
            </div>

            {/* Provider badges */}
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {u.isGuest ? (
                <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: 10, background: '#f0f0f0', color: '#828282' }}>
                  訪客
                </span>
              ) : u.providers.length === 0 ? (
                <span style={{ fontSize: '0.68rem', color: '#bbb' }}>-</span>
              ) : u.providers.map(p => {
                const info = PROVIDER_LABELS[p] ?? { label: p, color: '#828282', bg: '#f0f0f0' };
                return (
                  <span key={p} style={{
                    fontSize: '0.68rem', padding: '1px 6px', borderRadius: 10,
                    background: info.bg, color: info.color, fontWeight: 600,
                  }}>
                    {info.label}
                  </span>
                );
              })}
            </div>

            {/* Role badge */}
            <span style={{
              fontSize: '0.72rem', fontWeight: 600,
              padding: '2px 8px', borderRadius: 12, display: 'inline-block',
              background: u.isSuperAdmin ? '#f3e8ff' : u.isAdmin ? '#e8f4fd' : u.isGuest ? '#f8f9f9' : '#e6fcf5',
              color: u.isSuperAdmin ? '#7c3aed' : u.isAdmin ? '#1c5373' : u.isGuest ? '#828282' : '#0d9488',
            }}>
              {u.isSuperAdmin ? '超管' : u.isAdmin ? '管理員' : u.isGuest ? '訪客' : '用戶'}
            </span>

            {/* Action */}
            {isSuperAdmin && (
              <div style={{ textAlign: 'right' }}>
                {!u.isSuperAdmin && !u.isGuest && u.id !== user?.userId && (
                  <button
                    onClick={() => toggleAdmin(u.id, u.isAdmin)}
                    disabled={toggling === u.id}
                    style={{
                      fontSize: '0.72rem', padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
                      border: `1px solid ${u.isAdmin ? '#e53e3e' : '#1c5373'}`,
                      background: 'none',
                      color: u.isAdmin ? '#e53e3e' : '#1c5373',
                      opacity: toggling === u.id ? 0.5 : 1,
                    }}
                  >
                    {toggling === u.id ? '...' : u.isAdmin ? '取消管理員' : '設為管理員'}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginTop: '1rem' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn(page === 1)}>‹</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} style={pageBtn(false, p === page)}>{p}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtn(page === totalPages)}>›</button>
        </div>
      )}
    </div>
  );
}

function pageBtn(disabled: boolean, active = false): React.CSSProperties {
  return {
    width: 32, height: 32, borderRadius: 6, border: '1px solid #e6e6e6',
    background: active ? '#1c5373' : '#fff',
    color: active ? '#fff' : disabled ? '#bbb' : '#1e1e1e',
    cursor: disabled ? 'default' : 'pointer',
    fontSize: '0.85rem',
  };
}
