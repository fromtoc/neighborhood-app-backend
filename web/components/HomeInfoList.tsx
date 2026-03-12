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
  urgency?: string;
  createdAt: string;
}

interface Props {
  neighborhoodId: number;
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

/** 從標題猜測 alert category */
function guessAlertCategory(title: string | null): string | null {
  if (!title) return null;
  if (title.includes('地震')) return '地震';
  if (title.includes('颱風')) return '颱風';
  if (title.includes('豪雨') || title.includes('大雨') || title.includes('暴雨')) return '豪雨';
  if (title.includes('水情') || title.includes('淹水') || title.includes('水位')) return '水情';
  if (title.includes('停電')) return '停電';
  if (title.includes('停水')) return '停水';
  if (title.includes('土石流')) return '土石流';
  return null;
}

export default function HomeInfoList({ neighborhoodId, liHref }: Props) {
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
          相關資訊
        </h2>
        <Link href={`${liHref}?tab=info`} style={{ fontSize: '0.75rem', color: '#1c5373' }}>更多 ›</Link>
      </div>

      {/* Post list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {posts.map(post => {
          const isUrgent = post.urgency === 'urgent';
          const isMedium = post.urgency === 'medium';
          const isAlert = isUrgent || isMedium;
          const category = guessAlertCategory(post.title);

          if (isAlert) {
            // AlertCard style — matching app
            return (
              <Link key={post.id} href={`/posts/${post.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: isUrgent ? '#fef2f2' : '#fffbeb',
                  borderRadius: 10, padding: '0.75rem',
                  display: 'flex', gap: '0.65rem',
                  borderLeft: `3px solid ${isUrgent ? '#ef4444' : '#f59e0b'}`,
                }}>
                  {/* Alert icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: isUrgent ? '#fee2e2' : '#fef3c7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.05rem',
                  }}>
                    {isUrgent ? '⚠️' : '⚡'}
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      {category && (
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 600,
                          padding: '1px 6px', borderRadius: 4,
                          background: isUrgent ? '#fee2e2' : '#fef3c7',
                          color: isUrgent ? '#dc2626' : '#d97706',
                        }}>
                          {category}
                        </span>
                      )}
                      <span style={{ fontSize: '0.68rem', color: '#999' }}>{timeAgo(post.createdAt)}</span>
                    </div>
                    <p style={{
                      fontSize: '0.9rem', fontWeight: 600, color: '#1e1e1e', lineHeight: 1.45,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', margin: 0,
                    }}>
                      {post.title || post.content}
                    </p>
                    {post.title && (
                      <p style={{
                        fontSize: '0.8rem', color: '#666', lineHeight: 1.4, marginTop: '0.15rem',
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', margin: 0,
                      }}>
                        {post.content}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          }

          // NewsCard style — normal info
          return (
            <Link key={post.id} href={`/posts/${post.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#fff', borderRadius: 10, padding: '0.75rem',
                display: 'flex', gap: '0.65rem',
                border: '1px solid #f0f0f0',
              }}>
                {/* Text */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <p style={{
                    fontSize: '0.9rem', fontWeight: 600, color: '#1e1e1e', lineHeight: 1.45,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', margin: 0,
                  }}>
                    {post.title || post.content}
                  </p>
                  <p style={{ fontSize: '0.68rem', color: '#bbb', margin: 0 }}>
                    {post.authorName ?? `里民 #${post.userId}`} · {timeAgo(post.createdAt)}
                  </p>
                </div>
                {/* Thumbnail */}
                {post.images?.[0] && (
                  <div style={{ width: 68, height: 68, borderRadius: 8, flexShrink: 0, overflow: 'hidden' }}>
                    <Image
                      src={post.images[0]}
                      alt=""
                      width={68}
                      height={68}
                      style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                    />
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
