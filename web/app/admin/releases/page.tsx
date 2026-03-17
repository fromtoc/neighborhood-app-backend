'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { CLIENT_BASE_URL } from '@/lib/api';

interface Release {
  id: number;
  version: string;
  platform: string;
  title: string;
  content: string | null;
  downloadUrl: string | null;
  isForce: number;
  isPublished: number;
  createdAt: string;
  updatedAt: string;
}

interface ReleaseForm {
  version: string;
  platform: string;
  title: string;
  content: string;
  downloadUrl: string;
  isForce: boolean;
}

const EMPTY_FORM: ReleaseForm = {
  version: '', platform: 'all', title: '', content: '', downloadUrl: '', isForce: false,
};

const PLATFORM_LABELS: Record<string, string> = {
  all: '全平台', ios: 'iOS', android: 'Android',
};

export default function AdminReleasesPage() {
  const { user, token } = useAuth();
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ReleaseForm>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const fetchReleases = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/mgmt/releases`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.code === 200) setReleases(json.data?.records ?? []);
      else setError(json.message ?? '載入失敗');
    } catch {
      setError('網路錯誤');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchReleases(); }, [fetchReleases]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(r: Release) {
    setForm({
      version: r.version,
      platform: r.platform,
      title: r.title,
      content: r.content ?? '',
      downloadUrl: r.downloadUrl ?? '',
      isForce: !!r.isForce,
    });
    setEditingId(r.id);
    setFormError('');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!form.version.trim() || !form.title.trim()) {
      setFormError('版本號和標題為必填');
      return;
    }
    setFormLoading(true);
    setFormError('');
    try {
      const url = editingId
        ? `${CLIENT_BASE_URL}/api/v1/mgmt/releases/${editingId}`
        : `${CLIENT_BASE_URL}/api/v1/mgmt/releases`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: form.version.trim(),
          platform: form.platform,
          title: form.title.trim(),
          content: form.content.trim() || null,
          downloadUrl: form.downloadUrl.trim() || null,
          isForce: form.isForce ? 1 : 0,
        }),
      });
      const json = await res.json();
      if (json.code === 200) {
        setShowForm(false);
        fetchReleases();
      } else {
        setFormError(json.message ?? '操作失敗');
      }
    } catch {
      setFormError('網路錯誤');
    } finally {
      setFormLoading(false);
    }
  }

  async function togglePublish(r: Release) {
    if (!token || actionLoading) return;
    setActionLoading(r.id);
    try {
      const res = await fetch(
        `${CLIENT_BASE_URL}/api/v1/mgmt/releases/${r.id}/publish?value=${!r.isPublished}`,
        { method: 'PUT', headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      if (json.code === 200) {
        setReleases(prev => prev.map(rel => rel.id === r.id ? { ...rel, isPublished: !r.isPublished } : rel));
      } else {
        setError(json.message ?? '操作失敗');
      }
    } catch {
      setError('網路錯誤');
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteRelease(id: number) {
    if (!token || actionLoading) return;
    if (!window.confirm(`確定要刪除此版本發佈嗎？`)) return;
    setActionLoading(id);
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/mgmt/releases/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.code === 200) {
        fetchReleases();
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

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e1e1e', marginBottom: '0.25rem' }}>
            版本發佈
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#bbb' }}>
            共 {releases.length} 個版本
          </p>
        </div>
        <button onClick={openCreate} style={{
          background: '#1c5373', color: '#fff',
          border: 'none', borderRadius: 8,
          padding: '0.5rem 1rem', fontSize: '0.875rem', cursor: 'pointer',
        }}>
          新增版本
        </button>
      </div>

      {error && (
        <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 8, padding: '0.75rem', color: '#c53030', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: '1.5rem',
            width: '100%', maxWidth: 480,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1e1e', marginBottom: '1rem' }}>
              {editingId ? '編輯版本' : '新增版本'}
            </h2>

            {formError && (
              <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 8, padding: '0.75rem', color: '#c53030', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>版本號 *</label>
                  <input
                    value={form.version}
                    onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                    placeholder="例如 1.0.0"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>平台</label>
                  <select
                    value={form.platform}
                    onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="all">全平台</option>
                    <option value="ios">iOS</option>
                    <option value="android">Android</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>標題 *</label>
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="版本更新標題"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>內容</label>
                  <textarea
                    value={form.content}
                    onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    placeholder="更新說明..."
                    rows={4}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>下載連結</label>
                  <input
                    value={form.downloadUrl}
                    onChange={e => setForm(f => ({ ...f, downloadUrl: e.target.value }))}
                    placeholder="https://..."
                    style={inputStyle}
                  />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#555' }}>
                  <input
                    type="checkbox"
                    checked={form.isForce}
                    onChange={e => setForm(f => ({ ...f, isForce: e.target.checked }))}
                    style={{ width: 16, height: 16 }}
                  />
                  強制更新
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{
                  background: 'none', border: '1px solid #e6e6e6', borderRadius: 8,
                  padding: '0.5rem 1rem', fontSize: '0.875rem', color: '#828282', cursor: 'pointer',
                }}>
                  取消
                </button>
                <button type="submit" disabled={formLoading} style={{
                  background: '#1c5373', color: '#fff', border: 'none', borderRadius: 8,
                  padding: '0.5rem 1rem', fontSize: '0.875rem', cursor: 'pointer',
                  opacity: formLoading ? 0.6 : 1,
                }}>
                  {formLoading ? '處理中...' : editingId ? '儲存' : '建立'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Releases List */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#bbb', fontSize: '0.9rem' }}>載入中...</div>
      ) : releases.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#bbb', fontSize: '0.9rem' }}>尚無版本發佈</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {releases.map(r => (
            <div key={r.id} style={{
              background: '#fff', borderRadius: 12,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              padding: '1rem 1.25rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1e1e' }}>
                      v{r.version}
                    </span>
                    <span style={{
                      fontSize: '0.68rem', padding: '2px 8px', borderRadius: 10,
                      background: '#e8f4fd', color: '#1c5373', fontWeight: 600,
                    }}>
                      {PLATFORM_LABELS[r.platform] || r.platform}
                    </span>
                    {r.isForce && (
                      <span style={{
                        fontSize: '0.68rem', padding: '2px 8px', borderRadius: 10,
                        background: '#fff5f5', color: '#e53e3e', fontWeight: 600,
                      }}>
                        強制更新
                      </span>
                    )}
                    <span style={{
                      fontSize: '0.68rem', padding: '2px 8px', borderRadius: 10,
                      background: r.isPublished ? '#e6fcf5' : '#f8f9f9',
                      color: r.isPublished ? '#22c55e' : '#828282',
                      fontWeight: 600,
                    }}>
                      {r.isPublished ? '已發佈' : '草稿'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#333', marginBottom: '0.25rem' }}>
                    {r.title}
                  </div>
                  {r.content && (
                    <div style={{ fontSize: '0.78rem', color: '#828282', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {r.content}
                    </div>
                  )}
                  <div style={{ fontSize: '0.72rem', color: '#bbb', marginTop: '0.5rem' }}>
                    建立: {r.createdAt ? new Date(r.createdAt + '+08:00').toLocaleDateString('zh-TW') : '-'}
                    {r.updatedAt && ` \u00b7 更新: ${new Date(r.updatedAt + '+08:00').toLocaleDateString('zh-TW')}`}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                  <button
                    onClick={() => openEdit(r)}
                    style={{
                      fontSize: '0.72rem', padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
                      border: '1px solid #1c5373', background: 'none', color: '#1c5373',
                    }}
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => togglePublish(r)}
                    disabled={actionLoading === r.id}
                    style={{
                      fontSize: '0.72rem', padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
                      border: `1px solid ${r.isPublished ? '#e67e22' : '#22c55e'}`,
                      background: 'none',
                      color: r.isPublished ? '#e67e22' : '#22c55e',
                      opacity: actionLoading === r.id ? 0.5 : 1,
                    }}
                  >
                    {actionLoading === r.id ? '...' : r.isPublished ? '下架' : '發佈'}
                  </button>
                  <button
                    onClick={() => deleteRelease(r.id)}
                    disabled={actionLoading === r.id}
                    style={{
                      fontSize: '0.72rem', padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
                      border: '1px solid #e53e3e', background: 'none', color: '#e53e3e',
                      opacity: actionLoading === r.id ? 0.5 : 1,
                    }}
                  >
                    刪除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.78rem', fontWeight: 600,
  color: '#555', marginBottom: '0.25rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.75rem',
  border: '1px solid #e6e6e6', borderRadius: 8,
  fontSize: '0.875rem', outline: 'none',
  boxSizing: 'border-box',
};
