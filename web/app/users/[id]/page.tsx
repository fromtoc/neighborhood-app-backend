'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { CLIENT_BASE_URL } from '@/lib/api';
import PrivateChatModal from '@/components/PrivateChatModal';

interface UserProfile {
  id: number;
  nickname: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  badge: string | null;
  postCount: number;
  followingCount: number;
  followerCount: number;
  isFollowed: boolean | null;
  createdAt: string;
}

interface PostItem {
  id: number;
  title: string | null;
  content: string | null;
  images: string[];
  type: string;
  authorName: string | null;
  authorRole: string | null;
  authorBadge: string | null;
  likeCount: number;
  commentCount: number;
  contentDeleted?: boolean;
  edited?: boolean;
  createdAt: string;
}

function timeAgo(iso: string): string {
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

const AVATAR_COLORS = ['#e53935','#8e24aa','#1e88e5','#43a047','#fb8c00','#00acc1','#6d4c41','#546e7a'];
function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }

export default function UserProfilePage() {
  const params = useParams();
  const userId = Number(params.id);
  const { user, token } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/users/${userId}/profile`, { headers });
      const json = await res.json();
      if (json.code === 200) setProfile(json.data);
    } catch {}
  }, [userId, token]);

  const fetchPosts = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/users/${userId}/posts?size=50`, { headers });
      const json = await res.json();
      if (json.code === 200) setPosts(json.data.records ?? []);
    } catch {}
  }, [userId, token]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchProfile(), fetchPosts()]).finally(() => setLoading(false));
  }, [fetchProfile, fetchPosts]);

  async function handleFollow() {
    if (!token || !profile) return;
    setFollowLoading(true);
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/users/${userId}/follow`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.code === 200) {
        setProfile(prev => prev ? { ...prev, isFollowed: json.data.followed, followerCount: json.data.followerCount } : prev);
      }
    } catch {} finally { setFollowLoading(false); }
  }

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#bbb' }}>載入中...</div>;
  if (!profile) return <div style={{ padding: '2rem', textAlign: 'center', color: '#e53e3e' }}>用戶不存在</div>;

  const isSelf = user?.userId === profile.id;
  const avatarLetter = profile.nickname.charAt(0).toUpperCase();
  const joinDate = new Date(profile.createdAt).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' });

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '1rem' }}>
      {/* 頂部導覽 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem', gap: '0.75rem' }}>
        <button onClick={() => history.back()} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#1e1e1e' }}>←</button>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', flex: 1 }}>{profile.nickname}</span>
        {!isSelf && token && (
          <>
            <button
              onClick={handleFollow}
              disabled={followLoading}
              style={{
                background: profile.isFollowed ? '#f0f0f0' : '#1c5373',
                color: profile.isFollowed ? '#555' : '#fff',
                border: 'none', borderRadius: 8, padding: '0.4rem 1rem',
                fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.3rem',
              }}
            >
              {profile.isFollowed ? '已追蹤' : '追蹤'}
            </button>
            <button
              onClick={() => setShowChat(true)}
              style={{ background: '#f0f0f0', border: 'none', borderRadius: 8, padding: '0.45rem 0.6rem', cursor: 'pointer', fontSize: '1rem' }}
            >
              💬
            </button>
          </>
        )}
      </div>

      {/* 個人資訊卡 */}
      <div style={{
        background: '#fff', border: '1px solid #e8e8e8', borderRadius: 16,
        padding: '1.25rem', marginBottom: '1rem',
      }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          {/* 頭像 */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
            background: profile.avatarUrl ? undefined : avatarColor(profile.id),
            backgroundImage: profile.avatarUrl ? `url(${profile.avatarUrl})` : undefined,
            backgroundSize: 'cover', backgroundPosition: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem', fontWeight: 700, color: '#fff',
          }}>
            {!profile.avatarUrl && avatarLetter}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '1.15rem' }}>{profile.nickname}</span>
              {profile.badge && (
                <span style={{
                  fontSize: '0.72rem', background: '#E6FCF5', color: '#047857',
                  padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                }}>{profile.badge}</span>
              )}
            </div>
            {profile.bio && (
              <p style={{ fontSize: '0.88rem', color: '#666', marginTop: '0.35rem', lineHeight: 1.5 }}>
                {profile.bio}
              </p>
            )}
            <p style={{ fontSize: '0.78rem', color: '#bbb', marginTop: '0.3rem' }}>
              {joinDate} 加入
            </p>
          </div>
        </div>
      </div>

      {/* 統計 */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        background: '#fff', border: '1px solid #e8e8e8', borderRadius: 16,
        marginBottom: '1.25rem', textAlign: 'center', padding: '0.75rem 0',
      }}>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e1e1e' }}>{profile.postCount}</div>
          <div style={{ fontSize: '0.78rem', color: '#999' }}>貼文</div>
        </div>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e1e1e' }}>{profile.followerCount}</div>
          <div style={{ fontSize: '0.78rem', color: '#999' }}>粉絲</div>
        </div>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e1e1e' }}>{profile.followingCount}</div>
          <div style={{ fontSize: '0.78rem', color: '#999' }}>追蹤中</div>
        </div>
      </div>

      {/* 貼文列表 */}
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#888', marginBottom: '0.75rem' }}>貼文</h3>

      {posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#bbb', fontSize: '0.9rem' }}>
          尚無貼文
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {posts.map(post => (
            <Link key={post.id} href={`/posts/${post.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12,
                padding: '1rem', transition: 'box-shadow 0.15s',
              }}>
                {/* 作者行 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: profile.avatarUrl ? undefined : avatarColor(profile.id),
                    backgroundImage: profile.avatarUrl ? `url(${profile.avatarUrl})` : undefined,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700, color: '#fff',
                  }}>
                    {!profile.avatarUrl && avatarLetter}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e1e1e' }}>{profile.nickname}</span>
                      {profile.badge && (
                        <span style={{ fontSize: '0.6rem', background: '#E6FCF5', color: '#047857', padding: '1px 5px', borderRadius: 3, fontWeight: 600 }}>{profile.badge}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#bbb' }}>{timeAgo(post.createdAt)}</div>
                  </div>
                </div>

                {/* 內容 */}
                {post.contentDeleted ? (
                  <div style={{ background: '#f9f9f9', borderRadius: 6, padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>🗑️</span>
                    <span style={{ fontSize: '0.85rem', color: '#999', fontStyle: 'italic' }}>此內容已被刪除</span>
                  </div>
                ) : (
                  <>
                    {post.title && (
                      <p style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1e1e1e', marginBottom: '0.3rem' }}>
                        {post.title}
                      </p>
                    )}
                    <p style={{
                      fontSize: '0.88rem', color: '#444', lineHeight: 1.6,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                    }}>
                      {post.content}
                    </p>
                    {post.edited && (
                      <span style={{ fontSize: '0.7rem', color: '#bbb', fontStyle: 'italic' }}>（已編輯）</span>
                    )}
                  </>
                )}

                {/* 圖片預覽 */}
                {!post.contentDeleted && post.images.length > 0 && (
                  <div style={{ marginTop: '0.5rem', borderRadius: 8, overflow: 'hidden', maxHeight: 200 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={post.images[0]} alt="" style={{ width: '100%', objectFit: 'cover', maxHeight: 200 }} />
                  </div>
                )}

                {/* 互動數據 */}
                {!post.contentDeleted && (
                  <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.6rem', fontSize: '0.82rem', color: '#828282' }}>
                    <span>🤍 {post.likeCount} 喜歡</span>
                    <span>💬 {post.commentCount} 回覆</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 私聊彈窗 */}
      {showChat && (
        <PrivateChatModal
          targetUserId={profile.id}
          targetNickname={profile.nickname}
          targetBadge={profile.badge}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}
