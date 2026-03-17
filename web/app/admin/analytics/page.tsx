'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { CLIENT_BASE_URL } from '@/lib/api';

interface DayData { date: string; count: number }
interface DistItem { name: string; count: number }

const COLORS = ['#1c5373', '#0d9488', '#e67e22', '#e53e3e', '#7c3aed', '#22c55e', '#1877f2', '#828282', '#d97706', '#ec4899'];

const TYPE_LABELS: Record<string, string> = {
  info: '資訊', broadcast: '公告', fresh: '新鮮事',
  store_visit: '探店', selling: '出售', renting: '出租',
  group_buy: '團購', group_event: '活動', free_give: '免費送',
  help: '求助', want_rent: '想租', find: '尋找',
  recruit: '招募', report: '通報',
};

export default function AdminAnalyticsPage() {
  const { user, token } = useAuth();
  const [userGrowth, setUserGrowth] = useState<DayData[]>([]);
  const [postActivity, setPostActivity] = useState<DayData[]>([]);
  const [providers, setProviders] = useState<DistItem[]>([]);
  const [postTypes, setPostTypes] = useState<DistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [r1, r2, r3, r4] = await Promise.all([
        fetch(`${CLIENT_BASE_URL}/api/v1/mgmt/analytics/user-growth?days=30`, { headers }),
        fetch(`${CLIENT_BASE_URL}/api/v1/mgmt/analytics/post-activity?days=30`, { headers }),
        fetch(`${CLIENT_BASE_URL}/api/v1/mgmt/analytics/user-providers`, { headers }),
        fetch(`${CLIENT_BASE_URL}/api/v1/mgmt/analytics/post-types`, { headers }),
      ]);
      const [j1, j2, j3, j4] = await Promise.all([r1.json(), r2.json(), r3.json(), r4.json()]);

      if (j1.code === 200) setUserGrowth(j1.data ?? []);
      if (j2.code === 200) setPostActivity(j2.data ?? []);
      if (j3.code === 200) setProviders(j3.data ?? []);
      if (j4.code === 200) setPostTypes(j4.data ?? []);

      const failed = [j1, j2, j3, j4].find(j => j.code !== 200);
      if (failed) setError(failed.message ?? '部分數據載入失敗');
    } catch {
      setError('網路錯誤');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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
          數據分析
        </h1>
        <p style={{ fontSize: '0.8rem', color: '#bbb' }}>
          過去 30 天的數據趨勢
        </p>
      </div>

      {error && (
        <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 8, padding: '0.75rem', color: '#c53030', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#bbb', fontSize: '0.9rem' }}>載入中...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* User Growth Chart */}
          <ChartCard title="用戶增長" subtitle="每日新用戶">
            <BarChart data={userGrowth} color="#1c5373" />
          </ChartCard>

          {/* Post Activity Chart */}
          <ChartCard title="貼文活動" subtitle="每日新貼文">
            <BarChart data={postActivity} color="#0d9488" />
          </ChartCard>

          {/* Provider Distribution */}
          <ChartCard title="登入方式分佈">
            <DistributionBars items={providers} />
          </ChartCard>

          {/* Post Type Distribution */}
          <ChartCard title="貼文類型分佈">
            <DistributionBars items={postTypes} labelMap={TYPE_LABELS} />
          </ChartCard>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      padding: '1.25rem',
    }}>
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e1e1e', marginBottom: '0.15rem' }}>{title}</h2>
        {subtitle && <p style={{ fontSize: '0.75rem', color: '#bbb' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function BarChart({ data, color }: { data: DayData[]; color: string }) {
  if (data.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#bbb', fontSize: '0.85rem' }}>無數據</div>;
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 2,
        height: 160, padding: '0 0 1.75rem 0',
        position: 'relative',
      }}>
        {data.map((d, i) => {
          const height = Math.max((d.count / maxCount) * 140, 2);
          return (
            <div
              key={d.date}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'flex-end',
                position: 'relative', height: '100%',
              }}
              title={`${d.date}: ${d.count}`}
            >
              {d.count > 0 && (
                <span style={{
                  fontSize: '0.6rem', color: '#828282',
                  marginBottom: 2, lineHeight: 1,
                }}>
                  {d.count}
                </span>
              )}
              <div style={{
                width: '100%', maxWidth: 24, minWidth: 4,
                height, background: color, borderRadius: '3px 3px 0 0',
                opacity: 0.85,
                transition: 'opacity 0.15s',
              }} />
              {/* Date label (show every 5th) */}
              {(i % 5 === 0 || i === data.length - 1) && (
                <span style={{
                  position: 'absolute', bottom: 0,
                  fontSize: '0.58rem', color: '#bbb',
                  whiteSpace: 'nowrap', transform: 'translateY(100%)',
                }}>
                  {d.date.slice(5)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: '0.72rem', color: '#bbb', textAlign: 'right', marginTop: '0.5rem' }}>
        總計: {data.reduce((s, d) => s + d.count, 0).toLocaleString('en-US')}
      </div>
    </div>
  );
}

function DistributionBars({ items, labelMap }: { items: DistItem[]; labelMap?: Record<string, string> }) {
  if (items.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#bbb', fontSize: '0.85rem' }}>無數據</div>;
  }

  const total = items.reduce((s, i) => s + i.count, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {items.map((item, i) => {
        const pct = total > 0 ? (item.count / total * 100) : 0;
        const color = COLORS[i % COLORS.length];
        const label = labelMap?.[item.name] || item.name;
        return (
          <div key={item.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.82rem', color: '#333', fontWeight: 500 }}>{label}</span>
              <span style={{ fontSize: '0.78rem', color: '#828282' }}>
                {item.count.toLocaleString('en-US')} ({pct.toFixed(1)}%)
              </span>
            </div>
            <div style={{
              width: '100%', height: 20, background: '#f4f4f4',
              borderRadius: 6, overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.max(pct, 1)}%`, height: '100%',
                background: color, borderRadius: 6,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        );
      })}
      <div style={{ fontSize: '0.72rem', color: '#bbb', textAlign: 'right' }}>
        總計: {total.toLocaleString('en-US')}
      </div>
    </div>
  );
}
