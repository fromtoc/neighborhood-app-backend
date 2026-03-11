'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ShareButton from './ShareButton';
import CommentSection from './CommentSection';
import CreatePostForm from './CreatePostForm';
import PrivateChatModal from './PrivateChatModal';
import { useAuth } from './AuthProvider';
import type { AuthUser } from '@/lib/auth-client';
import { dispatchAuthExpired } from '@/lib/auth-client';
import { CLIENT_BASE_URL } from '@/lib/api';

interface PostItem {
  id: number;
  title: string | null;
  content: string;
  images: string[];
  type: string;
  urgency?: string;
  userId: number;
  authorName?: string;
  authorRole?: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

type Mode = 'info' | 'community';

interface Props {
  neighborhoodId: number;
  type?: string;
  title: string;
  mode?: Mode;
  defaultPostType?: string;
  allowedPostTypes?: string[];
  hideCreateForm?: boolean;
  pageSize?: number;
  readOnly?: boolean;
}

export default function CommunitySection({ neighborhoodId, type, title, mode = 'community', defaultPostType, allowedPostTypes, hideCreateForm = false, pageSize = 20, readOnly = false }: Props) {
  const { user, showLoginModal } = useAuth();
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [privateChatTarget, setPrivateChatTarget] = useState<{ userId: number; nickname?: string } | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const typeParam = type ? `&type=${type}` : '';
      const res = await fetch(
        `${CLIENT_BASE_URL}/api/v1/posts?neighborhoodId=${neighborhoodId}&size=${pageSize}${typeParam}`,
      );
      const json = await res.json();
      if (json.code === 200) setPosts(json.data.records ?? []);
    } finally {
      setLoading(false);
    }
  }, [neighborhoodId, type]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  return (
    <div className="section">
      {title && (
        <div className="section-header">
          <h2 className="section-title">{title}</h2>
          {!loading && <span style={{ fontSize: '0.8rem', color: '#bbb' }}>{posts.length} 篇</span>}
        </div>
      )}

      {!hideCreateForm && (mode === 'community' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
        <CreatePostForm neighborhoodId={neighborhoodId} mode={mode} defaultPostType={defaultPostType} allowedPostTypes={allowedPostTypes} onCreated={fetchPosts} />
      )}

      {loading ? (
        <div className="empty-state">
          <p style={{ color: '#bbb' }}>載入中...</p>
        </div>
      ) : posts.length > 0 ? (
        <div className="post-list">
          {posts.map(p => (
            <PostCard
              key={p.id}
              post={p}
              currentUser={user ?? null}
              onPrivateChat={(userId, nickname) => setPrivateChatTarget({ userId, nickname })}
              onShowLogin={() => showLoginModal(neighborhoodId)}
              onDeleted={id => setPosts(prev => prev.filter(x => x.id !== id))}
              onUpdated={updated => setPosts(prev => prev.map(x => x.id === updated.id ? updated : x))}
              readOnly={readOnly}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">{type === 'info' ? '📰' : '👥'}</div>
          <p>尚無貼文，成為第一個發文的人！</p>
        </div>
      )}

      {privateChatTarget !== null && (
        <PrivateChatModal
          targetUserId={privateChatTarget.userId}
          targetNickname={privateChatTarget.nickname}
          onClose={() => setPrivateChatTarget(null)}
        />
      )}
    </div>
  );
}

interface PostCardProps {
  post: PostItem;
  currentUser: AuthUser | null;
  onPrivateChat: (userId: number, nickname?: string) => void;
  onShowLogin: () => void;
  onDeleted: (id: number) => void;
  onUpdated: (post: PostItem) => void;
  readOnly?: boolean;
}

const AVATAR_COLORS = ['#1c5373','#0d9488','#7c3aed','#b45309','#be185d','#065f46'];

function avatarColor(userId: number) {
  return AVATAR_COLORS[userId % AVATAR_COLORS.length];
}

function timeAgo(iso: string): string {
  if (!iso) return '';
  // Treat naive datetime strings (no timezone indicator) as Asia/Taipei (UTC+8)
  const normalized = /[Zz]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + '+08:00';
  const diff = Date.now() - new Date(normalized).getTime();
  if (diff < 0) return '剛剛';
  const m = Math.floor(diff / 60000);
  if (m < 1)  return '剛剛';
  if (m < 60) return `${m} 分鐘前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小時前`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day} 天前`;
  return new Date(normalized).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
}

function PostCard({ post, currentUser, onPrivateChat, onShowLogin, onDeleted, onUpdated, readOnly = false }: PostCardProps) {
  const { token, showLoginModal } = useAuth();
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [liked, setLiked] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [commentOpen, setCommentOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title ?? '');
  const [editContent, setEditContent] = useState(post.content);
  const [editImages, setEditImages] = useState<string[]>(post.images);
  const [editLoading, setEditLoading] = useState(false);
  const [editUploading, setEditUploading] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isAdminType = ['info', 'broadcast', 'district_info', 'li_info'].includes(post.type);
  const isOwn = currentUser?.userId === post.userId;
  const role = currentUser?.role;
  const canEdit = !readOnly && isOwn && (role === 'SUPER_ADMIN' || role === 'ADMIN' || !isAdminType);
  const canDelete = !readOnly && (role === 'SUPER_ADMIN'
    || (isOwn && (role === 'ADMIN' || !isAdminType))
    || (role === 'ADMIN' && !isOwn && post.authorRole !== 'SUPER_ADMIN' && post.authorRole !== 'ADMIN'));

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editContent.trim() || !token) return;
    setEditLoading(true);
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: editTitle.trim() || null, content: editContent.trim(), images: editImages }),
      });
      const json = await res.json();
      if (json.code === 401) { dispatchAuthExpired(); return; }
      if (json.code === 200) { onUpdated(json.data); setEditing(false); }
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!token) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/posts/${post.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.code === 401) { dispatchAuthExpired(); return; }
      if (json.code === 200) onDeleted(post.id);
    } finally {
      setDeleteLoading(false);
      setConfirmDelete(false);
    }
  }

  async function handleEditImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (editImages.length + files.length > 9) return;
    setEditUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${CLIENT_BASE_URL}/api/v1/images/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const json = await res.json();
        if (json.code !== 200) throw new Error(json.message ?? '上傳失敗');
        urls.push(json.data as string);
      }
      setEditImages(prev => [...prev, ...urls]);
    } catch (err) {
      console.error('edit image upload failed', err);
    } finally {
      setEditUploading(false);
      if (editFileInputRef.current) editFileInputRef.current.value = '';
    }
  }

  const typeLabel: Record<string, string> = {
    info: '資訊', broadcast: '廣播', district_info: '區資訊', li_info: '里資訊',
    fresh: '新鮮事', store_visit: '探店', selling: '我要賣', renting: '要出租',
    group_buy: '發團購', group_event: '揪團活動', free_give: '免費贈',
    help: '生活求助', want_rent: '想承租', find: '尋人找物',
    recruit: '徵人求才', report: '通報',
  };
  const urgencyLabel: Record<string, { label: string; color: string }> = {
    medium: { label: '中等', color: '#e67e22' },
    urgent: { label: '緊急', color: '#c0392b' },
  };

  async function handleLike() {
    if (!token) { showLoginModal(); return; }
    if (likePending) return;
    setLikePending(true);
    setLiked(v => !v);
    setLikeCount(c => liked ? c - 1 : c + 1);
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/posts/${post.id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.code === 401) { dispatchAuthExpired(); setLiked(v => !v); setLikeCount(c => liked ? c + 1 : c - 1); }
      else if (json.code === 200) {
        setLiked(json.data.liked);
        setLikeCount(json.data.likeCount);
      } else {
        setLiked(v => !v);
        setLikeCount(c => liked ? c + 1 : c - 1);
      }
    } catch {
      setLiked(v => !v);
      setLikeCount(c => liked ? c + 1 : c - 1);
    } finally {
      setLikePending(false);
    }
  }

  const authorName = post.authorName ?? `里民 #${post.userId}`;
  const avatarLetter = authorName[0]?.toUpperCase() ?? String(post.userId % 10);

  return (
    <div className="post-card">
      {/* 頭部：頭像 + 名字 + 時間 + 類型 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: avatarColor(post.userId), color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.85rem', fontWeight: 700,
        }}>
          {avatarLetter}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e1e1e' }}>{authorName}</span>
            {typeLabel[post.type] && (
              <span style={{
                fontSize: '0.65rem', background: '#f0f7ff',
                color: '#1c5373', padding: '1px 5px', borderRadius: 4, fontWeight: 500,
              }}>
                {typeLabel[post.type]}
              </span>
            )}
            {post.urgency && urgencyLabel[post.urgency] && (
              <span style={{
                fontSize: '0.65rem', padding: '1px 5px', borderRadius: 4, fontWeight: 600,
                background: urgencyLabel[post.urgency].color + '18',
                color: urgencyLabel[post.urgency].color,
              }}>
                {urgencyLabel[post.urgency].label}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#bbb' }}>{timeAgo(post.createdAt)}</div>
        </div>
        {/* 操作按鈕 */}
        <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
          {currentUser && currentUser.userId !== post.userId &&
           currentUser.role !== 'GUEST' &&
           !(post.authorRole === 'GUEST' && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN')) && (
            <button onClick={() => onPrivateChat(post.userId, post.authorName ?? undefined)} style={chatBtnStyle('#1c5373')}>私聊</button>
          )}
          {canEdit && !editing && (
            <button onClick={() => { setEditTitle(post.title ?? ''); setEditContent(post.content); setEditImages(post.images); setEditing(true); }} style={chatBtnStyle('#555')}>編輯</button>
          )}
          {canDelete && !confirmDelete && (
            <button onClick={() => setConfirmDelete(true)} style={chatBtnStyle('#e53e3e')}>刪除</button>
          )}
          {confirmDelete && (
            <>
              <span style={{ fontSize: '0.72rem', color: '#e53e3e', alignSelf: 'center' }}>確認刪除？</span>
              <button onClick={handleDelete} disabled={deleteLoading} style={{ ...chatBtnStyle('#e53e3e'), background: '#e53e3e', color: '#fff' }}>
                {deleteLoading ? '…' : '確認'}
              </button>
              <button onClick={() => setConfirmDelete(false)} style={chatBtnStyle('#828282')}>取消</button>
            </>
          )}
        </div>
      </div>

      {/* 編輯表單 */}
      {editing ? (
        <form onSubmit={handleEditSave} style={{ marginBottom: '0.5rem' }}>
          <input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            placeholder="標題（選填）"
            maxLength={255}
            style={{ width: '100%', border: 'none', borderBottom: '1px solid #e6e6e6', padding: '0.3rem 0', marginBottom: '0.4rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
          />
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            required
            maxLength={5000}
            rows={4}
            style={{ width: '100%', border: '1px solid #e6e6e6', borderRadius: 6, padding: '0.5rem', fontSize: '0.9rem', outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }}
          />
          {/* 圖片上傳 + 縮圖 */}
          <input
            ref={editFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            style={{ display: 'none' }}
            onChange={handleEditImageSelect}
          />
          {editImages.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
              {editImages.map((src, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, display: 'block', background: '#f3f3f3' }} />
                  <button
                    type="button"
                    onClick={() => setEditImages(prev => prev.filter((_, j) => j !== i))}
                    style={{
                      position: 'absolute', top: 2, right: 2,
                      width: 18, height: 18,
                      background: 'rgba(0,0,0,0.55)', color: '#fff',
                      border: 'none', borderRadius: '50%',
                      fontSize: '0.65rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >×</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', alignItems: 'center' }}>
            <button
              type="button"
              disabled={editUploading || editImages.length >= 9}
              onClick={() => editFileInputRef.current?.click()}
              title="新增圖片"
              style={{
                background: 'none', border: 'none',
                color: editImages.length >= 9 ? '#ccc' : '#1c5373',
                cursor: editImages.length >= 9 ? 'default' : 'pointer',
                fontSize: '1.1rem', padding: '0 0.25rem', lineHeight: 1,
              }}
            >
              {editUploading ? '⏳' : '📷'}
            </button>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={() => setEditing(false)} style={{ ...chatBtnStyle('#828282'), padding: '4px 12px' }}>取消</button>
            <button type="submit" disabled={editLoading || !editContent.trim()} style={{ ...chatBtnStyle('#1c5373'), background: '#1c5373', color: '#fff', padding: '4px 12px' }}>
              {editLoading ? '儲存中...' : '儲存'}
            </button>
          </div>
        </form>
      ) : (
        <Link href={`/posts/${post.id}`} style={{ textDecoration: 'none', display: 'block' }}>
          {/* 標題 */}
          {post.title && (
            <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.4rem', color: '#1e1e1e' }}>
              {post.title}
            </p>
          )}
          {/* 內文（列表只顯示摘要，去除 URL 那行） */}
          <p style={{ fontSize: '0.9rem', color: '#2c2c2c', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
            {post.content.replace(/https?:\/\/\S+/g, '').replace(/📰[^\n]*/g, '').trim()}
          </p>
        </Link>
      )}

      {/* 圖片 */}
      {!editing && post.images.length > 0 && (
        <PostImageGrid images={post.images} />
      )}

      {/* 互動列 */}
      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.75rem', alignItems: 'center' }}>
        <button
          onClick={handleLike}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: liked ? '#e53e3e' : '#828282' }}
        >
          <span>{liked ? '❤️' : '🤍'}</span> {likeCount}
        </button>

        <button
          onClick={() => { if (!commentOpen && !currentUser) { showLoginModal(); return; } setCommentOpen(v => !v); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: commentOpen ? '#1c5373' : '#828282' }}
        >
          <span>💬</span> {commentCount}
        </button>

        <ShareButton title={post.title ?? post.content.slice(0, 40)} path={`/posts/${post.id}`} />
      </div>

      {commentOpen && (
        <CommentSection postId={post.id} onCommentAdded={() => setCommentCount(c => c + 1)} />
      )}
    </div>
  );
}

function chatBtnStyle(color: string): React.CSSProperties {
  return {
    background: 'none', border: `1px solid ${color}`,
    borderRadius: 6, padding: '2px 8px', fontSize: '0.72rem',
    color, cursor: 'pointer', flexShrink: 0,
  };
}

function PostImageGrid({ images }: { images: string[] }) {
  const count = images.length;
  const show = images.slice(0, 4);
  const extra = count > 4 ? count - 4 : 0;

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gap: '0.25rem',
    marginTop: '0.6rem',
    gridTemplateColumns: count === 1 ? '1fr' : 'repeat(2, 1fr)',
  };

  const imgStyle = (isFirst: boolean): React.CSSProperties => ({
    width: '100%',
    aspectRatio: count === 1 ? '16/9' : '1',
    objectFit: 'contain',
    borderRadius: 6,
    display: 'block',
    background: '#f3f3f3',
    ...(count === 1 && isFirst ? { gridColumn: '1 / -1' } : {}),
  });

  return (
    <div style={gridStyle}>
      {show.map((src, i) => {
        const isLast = i === show.length - 1 && extra > 0;
        return (
          <div key={i} style={{ position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" style={imgStyle(i === 0)} />
            {isLast && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.45)',
                borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '1.3rem', fontWeight: 700,
              }}>
                +{extra}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
