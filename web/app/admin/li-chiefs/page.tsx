'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { CLIENT_BASE_URL } from '@/lib/api';

interface LiChief {
  id: number;
  userId: number;
  nickname: string | null;
  neighborhoodId: number;
  neighborhoodName: string | null;
  city: string | null;
  district: string | null;
  createdAt: string;
}

export default function LiChiefsPage() {
  const { token } = useAuth();
  const [chiefs, setChiefs] = useState<LiChief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form
  const [userId, setUserId] = useState('');
  const [nhKeyword, setNhKeyword] = useState('');
  const [nhResults, setNhResults] = useState<{ id: number; name: string; city: string; district: string }[]>([]);
  const [selectedNh, setSelectedNh] = useState<{ id: number; name: string; city: string; district: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};

  const fetchChiefs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/mgmt/li-chiefs`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.code === 200) setChiefs(json.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchChiefs(); }, [fetchChiefs]);

  // Search neighborhoods
  async function searchNeighborhoods() {
    if (!nhKeyword.trim()) return;
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/neighborhoods?keyword=${encodeURIComponent(nhKeyword)}&size=10`);
      const json = await res.json();
      if (json.code === 200) setNhResults(json.data.records ?? []);
    } catch { /* ignore */ }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim() || !selectedNh) {
      setError('請填寫用戶 ID 並選擇里');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/mgmt/li-chiefs`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ userId: Number(userId), neighborhoodId: selectedNh.id }),
      });
      const json = await res.json();
      if (json.code === 200) {
        setSuccess(`已指派用戶 #${userId} 為 ${selectedNh.city}${selectedNh.district}${selectedNh.name} 里長`);
        setUserId('');
        setSelectedNh(null);
        setNhKeyword('');
        setNhResults([]);
        fetchChiefs();
      } else {
        setError(json.message ?? '指派失敗');
      }
    } catch {
      setError('網路錯誤');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(chief: LiChief) {
    if (!confirm(`確定撤銷 ${chief.nickname ?? `用戶 #${chief.userId}`} 的里長身份？`)) return;
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/mgmt/li-chiefs/${chief.userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.code === 200) {
        setSuccess('已撤銷里長');
        fetchChiefs();
      } else {
        setError(json.message ?? '撤銷失敗');
      }
    } catch {
      setError('網路錯誤');
    }
  }

  const inputStyle: React.CSSProperties = {
    border: '1px solid #e0e0e0', borderRadius: 8, padding: '0.5rem 0.75rem',
    fontSize: '0.88rem', outline: 'none', background: '#fafafa', width: '100%',
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>里長管理</h2>

      {/* 指派表單 */}
      <div style={{
        background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12,
        padding: '1.25rem', marginBottom: '1.5rem',
      }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', color: '#1c5373' }}>指派里長</h3>
        <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.82rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>用戶 ID</label>
            <input value={userId} onChange={e => setUserId(e.target.value)}
              placeholder="輸入用戶 ID" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '0.82rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>搜尋里</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input value={nhKeyword} onChange={e => setNhKeyword(e.target.value)}
                placeholder="輸入里名關鍵字" style={{ ...inputStyle, flex: 1 }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchNeighborhoods(); } }} />
              <button type="button" onClick={searchNeighborhoods}
                style={{ background: '#1c5373', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                搜尋
              </button>
            </div>
            {nhResults.length > 0 && (
              <div style={{ marginTop: '0.5rem', maxHeight: 200, overflowY: 'auto', border: '1px solid #e8e8e8', borderRadius: 8 }}>
                {nhResults.map(nh => (
                  <div key={nh.id} onClick={() => { setSelectedNh(nh); setNhResults([]); setNhKeyword(`${nh.city}${nh.district}${nh.name}`); }}
                    style={{
                      padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem',
                      background: selectedNh?.id === nh.id ? '#f0f7ff' : '#fff',
                      borderBottom: '1px solid #f5f5f5',
                    }}>
                    {nh.city} {nh.district} {nh.name}
                  </div>
                ))}
              </div>
            )}
            {selectedNh && (
              <div style={{ marginTop: '0.4rem', fontSize: '0.82rem', color: '#047857' }}>
                已選擇：{selectedNh.city}{selectedNh.district}{selectedNh.name}（ID: {selectedNh.id}）
              </div>
            )}
          </div>
          <button type="submit" disabled={submitting}
            style={{ background: '#047857', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? '指派中...' : '指派里長'}
          </button>
        </form>
        {error && <p style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '0.5rem' }}>{error}</p>}
        {success && <p style={{ color: '#047857', fontSize: '0.82rem', marginTop: '0.5rem' }}>{success}</p>}
      </div>

      {/* 里長列表 */}
      <div style={{
        background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12,
        padding: '1.25rem',
      }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', color: '#1c5373' }}>現有里長</h3>
        {loading ? (
          <p style={{ color: '#bbb', fontSize: '0.85rem' }}>載入中...</p>
        ) : chiefs.length === 0 ? (
          <p style={{ color: '#bbb', fontSize: '0.85rem' }}>尚無里長</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e8e8e8' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem', color: '#666' }}>用戶</th>
                <th style={{ textAlign: 'left', padding: '0.5rem', color: '#666' }}>負責里</th>
                <th style={{ textAlign: 'left', padding: '0.5rem', color: '#666' }}>指派時間</th>
                <th style={{ textAlign: 'center', padding: '0.5rem', color: '#666' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {chiefs.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '0.6rem 0.5rem' }}>
                    <span style={{ fontWeight: 600 }}>{c.nickname ?? `用戶 #${c.userId}`}</span>
                    <span style={{ color: '#bbb', fontSize: '0.78rem', marginLeft: '0.3rem' }}>#{c.userId}</span>
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem' }}>
                    {c.city}{c.district}{c.neighborhoodName}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', color: '#999' }}>
                    {new Date(c.createdAt).toLocaleDateString('zh-TW')}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                    <button onClick={() => handleRevoke(c)}
                      style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 6, padding: '0.3rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                      撤銷
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
