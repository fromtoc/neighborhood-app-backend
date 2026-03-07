'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  sectionTitle: string;
  liHref: string;
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
  return `${d} 天前`;
}

export default function HomeInfoList({ neighborhoodId, sectionTitle, liHref }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${CLIENT_BASE_URL}/api/v1/posts?neighborhoodId=${neighborhoodId}&type=info&size=3`)
      .then(r => r.json())
      .then(d => { if (d.code === 200) setPosts(d.data.records ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [neighborhoodId]);

  if (loading || posts.length === 0) return null;

  return (
    <div style={{ margin: '2rem 0 1.25rem' }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <h2 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e1e1e' }}>
          {sectionTitle} 相關資訊
        </h2>
        <Link href={`${liHref}?tab=info`} style={{ fontSize: '0.75rem', color: '#1c5373' }}>更多 ›</Link>
      </div>

      {/* Post list */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e6e6e6', overflow: 'hidden' }}>
        {posts.map((post, i) => (
          <Link
            key={post.id}
            href={`/posts/${post.id}`}
            style={{
              display: 'flex', gap: '0.75rem',
              padding: '0.75rem 0.9rem',
              borderBottom: i < posts.length - 1 ? '1px solid #f4f4f4' : 'none',
              textDecoration: 'none', alignItems: 'flex-start',
            }}
          >
            {/* Thumbnail — 只有有圖才顯示 */}
            {post.images?.[0] && (
              <div style={{ width: 72, height: 72, borderRadius: 8, flexShrink: 0, overflow: 'hidden' }}>
                <Image
                  src={post.images[0]}
                  alt=""
                  width={72}
                  height={72}
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
              </div>
            )}

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <p style={{
                fontSize: '0.875rem', fontWeight: 600, color: '#1e1e1e', lineHeight: 1.5,
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {post.title || post.content}
              </p>
              {post.title && (
                <p style={{
                  fontSize: '0.78rem', color: '#828282', lineHeight: 1.4,
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {post.content}
                </p>
              )}
              <p style={{ fontSize: '0.68rem', color: '#bbb' }}>
                {post.authorName ?? `里民 #${post.userId}`} · {timeAgo(post.createdAt)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
