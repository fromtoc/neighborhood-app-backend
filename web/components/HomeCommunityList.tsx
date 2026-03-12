'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CLIENT_BASE_URL } from '@/lib/api';

interface Post {
  id: number;
  title: string | null;
  content: string;
  images: string[];
  userId: number;
  authorName: string | null;
  createdAt: string;
}

interface Props {
  neighborhoodId: number;
  liHref: string;
}

const AVATAR_COLORS = ['#1c5373','#0d9488','#7c3aed','#b45309','#be185d','#065f46'];
function avatarColor(userId: number) {
  return AVATAR_COLORS[userId % AVATAR_COLORS.length];
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
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} 天前`;
  return new Date(normalized).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
}

export default function HomeCommunityList({ neighborhoodId, liHref }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${CLIENT_BASE_URL}/api/v1/posts?neighborhoodId=${neighborhoodId}&type=community&size=3`)
      .then(r => r.json())
      .then(d => { if (d.code === 200) setPosts(d.data.records ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [neighborhoodId]);

  if (loading || posts.length === 0) return null;

  return (
    <div style={{ margin: '1.25rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <h2 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e1e1e' }}>社群</h2>
        <Link href={`${liHref}?tab=community`} style={{ fontSize: '0.75rem', color: '#1c5373' }}>更多 ›</Link>
      </div>

      <div className="post-list">
        {posts.map(post => {
          const authorName = post.authorName ?? `里民 #${post.userId}`;
          const avatarLetter = authorName[0]?.toUpperCase() ?? String(post.userId % 10);
          return (
            <Link key={post.id} href={`/posts/${post.id}`} style={{ textDecoration: 'none' }}>
              <div className="post-card">
                {/* 頭部：大頭貼 + 名字 + 時間 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: avatarColor(post.userId), color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.85rem', fontWeight: 700,
                  }}>
                    {avatarLetter}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e1e1e' }}>{authorName}</div>
                    <div style={{ fontSize: '0.72rem', color: '#bbb' }}>{timeAgo(post.createdAt)}</div>
                  </div>
                </div>

                {/* 標題 */}
                {post.title && (
                  <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.4rem', color: '#1e1e1e' }}>
                    {post.title}
                  </p>
                )}

                {/* 內文 */}
                <p style={{
                  fontSize: '0.9rem', color: '#2c2c2c', lineHeight: 1.65,
                  whiteSpace: 'pre-wrap',
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 4, WebkitBoxOrient: 'vertical',
                }}>
                  {post.content}
                </p>

                {/* 圖片 */}
                {post.images.length > 0 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: post.images.length === 1 ? '1fr' : '1fr 1fr',
                    gap: '0.35rem', marginTop: '0.75rem',
                  }}>
                    {post.images.slice(0, 4).map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={src}
                        alt=""
                        style={{
                          width: '100%',
                          height: post.images.length === 1 ? 200 : 140,
                          objectFit: 'cover',
                          borderRadius: 8,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
