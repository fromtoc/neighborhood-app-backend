'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { CLIENT_BASE_URL } from '@/lib/api';

interface PostItem {
  id: number;
  title: string | null;
  content: string;
  images: string[];
  type: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

function timeAgo(iso: string): string {
  if (!iso) return '';
  const normalized = /[Zz]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + '+08:00';
  const diff = Date.now() - new Date(normalized).getTime();
  if (diff < 0) return '剛剛';
  const m = Math.floor(diff / 60000);
  if (m < 1) return '剛剛';
  if (m < 60) return `${m} 分鐘前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小時前`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day} 天前`;
  return new Date(normalized).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
}

const typeLabel: Record<string, string> = {
  fresh: '動態', store_visit: '踩點', selling: '我要賣', renting: '要出租',
  group_buy: '發團購', group_event: '揪團活動', free_give: '免費贈',
  help: '生活求助', want_rent: '想承租', find: '尋人找物',
  recruit: '徵人求才', report: '通報',
  info: '資訊', broadcast: '廣播', district_info: '區資訊', li_info: '里資訊',
};

export default function MyPostsPage() {
  const { user, token } = useAuth();
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`${CLIENT_BASE_URL}/api/v1/posts/mine?size=50`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.code === 200) setPosts(json.data.records ?? []);
      } finally { setLoading(false); }
    })();
  }, [token]);

  if (!user) {
    return (
      <div className="section" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: '#666' }}>請先登入</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Link href="/profile" style={{ color: '#1c5373', textDecoration: 'none', fontSize: '0.9rem' }}>← 返回</Link>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e1e1e', margin: 0 }}>我的貼文</h2>
        {!loading && <span style={{ fontSize: '0.8rem', color: '#999' }}>{posts.length} 篇</span>}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>載入中...</div>
      ) : posts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {posts.map(p => (
            <Link key={p.id} href={`/posts/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="post-card" style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  {typeLabel[p.type] && (
                    <span style={{ fontSize: '0.65rem', background: '#f0f7ff', color: '#1c5373', padding: '1px 5px', borderRadius: 4, fontWeight: 500 }}>
                      {typeLabel[p.type]}
                    </span>
                  )}
                  <span style={{ fontSize: '0.72rem', color: '#bbb' }}>{timeAgo(p.createdAt)}</span>
                </div>
                {p.title && <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.3rem', color: '#1e1e1e' }}>{p.title}</p>}
                <p style={{ fontSize: '0.88rem', color: '#444', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.content}
                </p>
                {p.images.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.4rem' }}>
                    {p.images.slice(0, 3).map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={src} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, background: '#f3f3f3' }} />
                    ))}
                    {p.images.length > 3 && <span style={{ alignSelf: 'center', fontSize: '0.8rem', color: '#999' }}>+{p.images.length - 3}</span>}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.78rem', color: '#999' }}>
                  <span>❤️ {p.likeCount}</span>
                  <span>💬 {p.commentCount}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <p>還沒有發過貼文</p>
        </div>
      )}
    </div>
  );
}
