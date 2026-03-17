'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { CLIENT_BASE_URL } from '@/lib/api';

interface AdminPost {
  id: number;
  title: string | null;
  content: string | null;
  type: string;
  status: number;
  likeCount: number;
  commentCount: number;
  nickname: string | null;
  userId: number;
  createdAt: string;
}

interface PageData {
  total: number;
  records: AdminPost[];
}

const TYPE_LABELS: Record<string, string> = {
  info: '資訊', broadcast: '公告', fresh: '新鮮事',
  store_visit: '探店', selling: '出售', renting: '出租',
  group_buy: '團購', group_event: '活動', free_give: '免費送',
  help: '求助', want_rent: '想租', find: '尋找',
  recruit: '招募', report: '通報',
};

const TYPE_OPTIONS = ['', ...Object.keys(TYPE_LABELS)];
const STATUS_OPTIONS = [
  { value: '', label: '所有狀態' },
  { value: '1', label: '正常' },
  { value: '0', label: '隱藏' },
];

export default function AdminPostsPage() {
  const { user, token } = useAuth();
  const [data, setData] = useState<PageData | null>(null);
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [filters, setFilters] = useState({ keyword: '', type: '', status: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const PAGE_SIZE = 20;

  const fetchPosts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
      if (filters.keyword) params.set('keyword', filters.keyword);
      if (filters.type) params.set('type', filters.type);
      if (filters.status) params.set('status', filters.status);
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/mgmt/posts?${params}`, {
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

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setFilters({ keyword: keyword.trim(), type, status });
  }

  function handleReset() {
    setKeyword(''); setType(''); setStatus('');
    setPage(1);
    setFilters({ keyword: '', type: '', status: '' });
  }

  async function toggleStatus(postId: number, currentStatus: number) {
    if (!token || actionLoading) return;
    setActionLoading(postId);
    try {
      const newStatus = currentStatus === 1 ? 0 : 1;
      const res = await fetch(
        `${CLIENT_BASE_URL}/api/v1/mgmt/posts/${postId}/status?value=${newStatus}`,
        { method: 'PUT', headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      if (json.code === 200) {
        setData(prev => prev ? {
          ...prev,
          records: prev.records.map(p => p.id === postId ? { ...p, status: newStatus } : p),
        } : null);
      } else {
        setError(json.message ?? '操作失敗');
      }
    } catch {
      setError('網路錯誤');
    } finally {
      setActionLoading(null);
    }
  }

  async function deletePost(postId: number) {
    if (!token || actionLoading) return;
    if (!window.confirm(`確定要刪除貼文 #${postId} 嗎？此操作無法復原。`)) return;
    setActionLoading(postId);
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/mgmt/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.code === 200) {
        fetchPosts();
      } else {
        setError(json.message ?? '刪除失敗');
      }
    } catch {
      setError('網路錯誤');
    } finally {
      setActionLoading(null);
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
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e1e1e', marginBottom: '0.25rem' }}>
          貼文管理
        </h1>
        <p style={{ fontSize: '0.8rem', color: '#bbb' }}>
          共 {data?.total ?? 0} 篇貼文
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          placeholder="搜尋標題/內容..."
          style={{
            flex: 1, minWidth: 140, padding: '0.5rem 0.75rem',
            border: '1px solid #e6e6e6', borderRadius: 8,
            fontSize: '0.875rem', outline: 'none',
          }}
        />
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem', border: '1px solid #e6e6e6',
            borderRadius: 8, fontSize: '0.875rem', color: '#555',
            background: '#fff', outline: 'none',
          }}
        >
          {TYPE_OPTIONS.map(t => (
            <option key={t} value={t}>{t ? TYPE_LABELS[t] : '所有類型'}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem', border: '1px solid #e6e6e6',
            borderRadius: 8, fontSize: '0.875rem', color: '#555',
            background: '#fff', outline: 'none',
          }}
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button type="submit" style={{
          background: '#1c5373', color: '#fff',
          border: 'none', borderRadius: 8,
          padding: '0.5rem 1rem', fontSize: '0.875rem', cursor: 'pointer',
        }}>
          搜尋
        </button>
        {(filters.keyword || filters.type || filters.status) && (
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
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8f9f9', borderBottom: '1px solid #f0f0f0' }}>
                {['ID', '標題/內容', '類型', '狀態', '讚', '留言', '作者', '建立時間', '操作'].map(h => (
                  <th key={h} style={{
                    padding: '0.65rem 0.75rem', textAlign: 'left',
                    fontSize: '0.75rem', color: '#828282', fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#bbb' }}>載入中...</td>
                </tr>
              ) : data?.records.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#bbb' }}>沒有符合的貼文</td>
                </tr>
              ) : data?.records.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: i < (data.records.length - 1) ? '1px solid #f4f4f4' : 'none' }}>
                  <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.78rem', color: '#bbb', whiteSpace: 'nowrap' }}>#{p.id}</td>
                  <td style={{ padding: '0.6rem 0.75rem', maxWidth: 200 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e1e1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.title || '(無標題)'}
                    </div>
                    {p.content && (
                      <div style={{ fontSize: '0.72rem', color: '#828282', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                        {p.content.slice(0, 50)}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>
                    <span style={{
                      fontSize: '0.68rem', padding: '2px 8px', borderRadius: 10,
                      background: '#e8f4fd', color: '#1c5373', fontWeight: 600,
                    }}>
                      {TYPE_LABELS[p.type] || p.type}
                    </span>
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>
                    <span style={{
                      fontSize: '0.68rem', padding: '2px 8px', borderRadius: 10,
                      background: p.status === 1 ? '#e6fcf5' : '#fff5f5',
                      color: p.status === 1 ? '#0d9488' : '#e53e3e',
                      fontWeight: 600,
                    }}>
                      {p.status === 1 ? '正常' : '隱藏'}
                    </span>
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.82rem', color: '#555', textAlign: 'center' }}>{p.likeCount}</td>
                  <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.82rem', color: '#555', textAlign: 'center' }}>{p.commentCount}</td>
                  <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.78rem', color: '#555', whiteSpace: 'nowrap' }}>
                    {p.nickname || `用戶#${p.userId}`}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.72rem', color: '#bbb', whiteSpace: 'nowrap' }}>
                    {p.createdAt ? new Date(p.createdAt + '+08:00').toLocaleDateString('zh-TW') : '-'}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        onClick={() => toggleStatus(p.id, p.status)}
                        disabled={actionLoading === p.id}
                        style={{
                          fontSize: '0.72rem', padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
                          border: `1px solid ${p.status === 1 ? '#e67e22' : '#22c55e'}`,
                          background: 'none',
                          color: p.status === 1 ? '#e67e22' : '#22c55e',
                          opacity: actionLoading === p.id ? 0.5 : 1,
                        }}
                      >
                        {actionLoading === p.id ? '...' : p.status === 1 ? '隱藏' : '顯示'}
                      </button>
                      <button
                        onClick={() => deletePost(p.id)}
                        disabled={actionLoading === p.id}
                        style={{
                          fontSize: '0.72rem', padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
                          border: '1px solid #e53e3e', background: 'none', color: '#e53e3e',
                          opacity: actionLoading === p.id ? 0.5 : 1,
                        }}
                      >
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginTop: '1rem' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn(page === 1)}>{'\u2039'}</button>
          {getPaginationRange(page, totalPages).map((p, i) =>
            p === '...' ? (
              <span key={`dots-${i}`} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: '#bbb' }}>...</span>
            ) : (
              <button key={p} onClick={() => setPage(p as number)} style={pageBtn(false, p === page)}>{p}</button>
            )
          )}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtn(page === totalPages)}>{'\u203a'}</button>
        </div>
      )}
    </div>
  );
}

function getPaginationRange(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | string)[] = [];
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push('...', total);
  } else if (current >= total - 3) {
    pages.push(1, '...');
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  return pages;
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
