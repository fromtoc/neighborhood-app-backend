'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { CLIENT_BASE_URL } from '@/lib/api';

interface DashboardData {
  totalUsers: number;
  totalPosts: number;
  todayNewUsers: number;
  todayNewPosts: number;
  totalGuests: number;
  totalNeighborhoods: number;
  totalPlaces: number;
  weekActiveUsers: number;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

export default function AdminDashboardPage() {
  const { user, token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const fetchDashboard = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/mgmt/dashboard`, {
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
  }, [token]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (!user || !isAdmin) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#bbb' }}>
        {!user ? '請先登入' : '需要管理員權限'}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e1e1e', marginBottom: '0.25rem' }}>
          管理後台總覽
        </h1>
        <p style={{ fontSize: '0.8rem', color: '#bbb' }}>
          系統概況一覽
        </p>
      </div>

      {error && (
        <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 8, padding: '0.75rem', color: '#c53030', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#bbb', fontSize: '0.9rem' }}>載入中...</div>
      ) : data && (
        <>
          {/* Primary stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.75rem', marginBottom: '0.75rem',
          }}>
            <StatCard label="總用戶數" value={data.totalUsers} color="#1c5373" />
            <StatCard label="總貼文數" value={data.totalPosts} color="#0d9488" />
            <StatCard label="今日新用戶" value={data.todayNewUsers} color="#e67e22" />
            <StatCard label="今日新貼文" value={data.todayNewPosts} color="#22c55e" />
          </div>

          {/* Secondary stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.75rem',
          }}>
            <StatCard label="訪客數" value={data.totalGuests} color="#828282" />
            <StatCard label="里數" value={data.totalNeighborhoods} color="#7c3aed" />
            <StatCard label="店家數" value={data.totalPlaces} color="#1877f2" />
            <StatCard label="週活躍用戶" value={data.weekActiveUsers} color="#e53e3e" />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      padding: '1.25rem 1rem',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <span style={{ fontSize: '1.75rem', fontWeight: 700, color }}>{fmt(value)}</span>
      <span style={{ fontSize: '0.8rem', color: '#828282', marginTop: '0.25rem' }}>{label}</span>
    </div>
  );
}
