'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import ShareButton from './ShareButton';
import CommentSection from './CommentSection';
import CreatePostForm from './CreatePostForm';
import PrivateChatModal from './PrivateChatModal';
import { useAuth } from './AuthProvider';
import type { AuthUser } from '@/lib/auth-client';
import { dispatchAuthExpired } from '@/lib/auth-client';
import { CLIENT_BASE_URL } from '@/lib/api';

interface ExtraFieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
}

const EDIT_EXTRA_FIELDS: Record<string, ExtraFieldDef[]> = {
  store_visit: [
    { key: 'shopName', label: '店家名稱', type: 'text', placeholder: '店家名稱' },
  ],
  selling: [
    { key: 'brandName', label: '品名/品牌', type: 'text', placeholder: '品名或品牌' },
    { key: 'price', label: '售價', type: 'text', placeholder: '例：100 元' },
    { key: 'quantity', label: '數量', type: 'text', placeholder: '例：1' },
    { key: 'condition', label: '狀態', type: 'select', options: [
      { value: '全新', label: '全新' }, { value: '二手', label: '二手' },
    ]},
  ],
  renting: [
    { key: 'rentalTarget', label: '出租項目', type: 'text', placeholder: '房屋/車位/物品...' },
    { key: 'price', label: '月租金', type: 'text', placeholder: '例：5000 元/月' },
  ],
  group_buy: [
    { key: 'brandName', label: '品名/品牌', type: 'text', placeholder: '品名或品牌' },
    { key: 'price', label: '團購價', type: 'text', placeholder: '例：200 元' },
    { key: 'minQty', label: '最低成團數', type: 'number', placeholder: '例：10' },
    { key: 'deadline', label: '截止日期', type: 'date' },
  ],
  free_give: [
    { key: 'brandName', label: '物品名稱', type: 'text', placeholder: '物品名稱' },
    { key: 'quantity', label: '數量', type: 'text', placeholder: '例：1' },
  ],
  want_rent: [
    { key: 'rentalTarget', label: '想租項目', type: 'text', placeholder: '房屋/車位/物品...' },
    { key: 'price', label: '預算', type: 'text', placeholder: '例：5000 元/月' },
  ],
  find: [
    { key: 'searchTarget', label: '尋找對象', type: 'text', placeholder: '人名/物品描述...' },
    { key: 'datetime', label: '最後出現時間', type: 'text', placeholder: '例：3/12 下午 2 點' },
  ],
  recruit: [
    { key: 'jobTitle', label: '職稱', type: 'text', placeholder: '例：店員' },
    { key: 'minSalary', label: '最低薪資', type: 'number', placeholder: '例：30000' },
    { key: 'maxSalary', label: '最高薪資', type: 'number', placeholder: '例：40000' },
    { key: 'jobType', label: '類型', type: 'select', options: [
      { value: '全職', label: '全職' }, { value: '兼職', label: '兼職' }, { value: '臨時', label: '臨時' },
    ]},
    { key: 'expiry', label: '截止日期', type: 'date' },
  ],
};

interface PostItem {
  id: number;
  title: string | null;
  content: string;
  images: string[];
  type: string;
  extra?: Record<string, string>;
  urgency?: string;
  userId: number;
  authorName?: string;
  authorRole?: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

type Mode = 'info' | 'community';

const INFO_FILTER_OPTIONS = ['全部', '貼文', '廣播(一般)', '廣播(中等)', '廣播(緊急)'];

const COMMUNITY_FILTER_OPTIONS = [
  { value: '全部', label: '全部' },
  { value: 'fresh', label: '動態' },
  { value: 'store_visit', label: '踩點' },
  { value: 'selling', label: '我要賣' },
  { value: 'renting', label: '要出租' },
  { value: 'group_buy', label: '發團購' },
  { value: 'group_event', label: '揪團活動' },
  { value: 'free_give', label: '免費贈' },
  { value: 'help', label: '生活求助' },
  { value: 'want_rent', label: '想承租' },
  { value: 'find', label: '尋人找物' },
  { value: 'recruit', label: '徵人求才' },
  { value: 'report', label: '通報' },
];

interface Props {
  neighborhoodId: number;
  type?: string;
  title: string;
  mode?: Mode;
  scope?: string;
  defaultPostType?: string;
  allowedPostTypes?: string[];
  hideCreateForm?: boolean;
  pageSize?: number;
  readOnly?: boolean;
}

export default function CommunitySection({ neighborhoodId, type, title, mode = 'community', scope, defaultPostType, allowedPostTypes, hideCreateForm = false, pageSize = 20, readOnly = false }: Props) {
  const { user, token, showLoginModal } = useAuth();
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [privateChatTarget, setPrivateChatTarget] = useState<{ userId: number; nickname?: string } | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());

  const [searchInput, setSearchInput] = useState('');
  const [searchText, setSearchText] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [showSort, setShowSort] = useState(false);
  const [infoFilter, setInfoFilter] = useState<string>('全部');
  const [showFilter, setShowFilter] = useState(false);
  const [communityFilter, setCommunityFilter] = useState<string>('全部');
  const [showCommunityFilter, setShowCommunityFilter] = useState(false);

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

  // Fetch bookmark & like states for loaded posts
  useEffect(() => {
    if (!token || posts.length === 0) return;
    const ids = posts.map(p => p.id).join(',');
    const headers = { Authorization: `Bearer ${token}` };
    fetch(`${CLIENT_BASE_URL}/api/v1/bookmarks/check-batch?postIds=${ids}`, { headers })
      .then(r => r.json())
      .then(json => {
        if (json.code === 200 && Array.isArray(json.data)) {
          setBookmarkedIds(new Set(json.data as number[]));
        }
      })
      .catch(() => {});
    fetch(`${CLIENT_BASE_URL}/api/v1/posts/likes/check-batch?postIds=${ids}`, { headers })
      .then(r => r.json())
      .then(json => {
        if (json.code === 200 && Array.isArray(json.data)) {
          setLikedIds(new Set(json.data as number[]));
        }
      })
      .catch(() => {});
  }, [posts, token]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const filtered = useMemo(() => {
    let list = [...posts];
    // Info type filter
    if (mode === 'info' && infoFilter !== '全部') {
      if (infoFilter === '貼文') {
        list = list.filter(p => !p.urgency);
      } else if (infoFilter === '廣播(一般)') {
        list = list.filter(p => p.urgency === 'normal');
      } else if (infoFilter === '廣播(中等)') {
        list = list.filter(p => p.urgency === 'medium');
      } else if (infoFilter === '廣播(緊急)') {
        list = list.filter(p => p.urgency === 'urgent');
      }
    }
    if (mode === 'community' && communityFilter !== '全部') {
      list = list.filter(p => p.type === communityFilter);
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(p =>
        p.content.toLowerCase().includes(q) ||
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.authorName && p.authorName.toLowerCase().includes(q))
      );
    }
    if (sortOrder === 'oldest') list.reverse();
    return list;
  }, [posts, searchText, sortOrder, mode, infoFilter, communityFilter]);

  const doSearch = () => setSearchText(searchInput);

  return (
    <div className="section">
      {title && (
        <div className="section-header">
          <h2 className="section-title">{title}</h2>
        </div>
      )}

      {/* Search bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: '#f5f5f5', borderRadius: 10, padding: '8px 12px', marginBottom: '10px',
      }}>
        <span style={{ fontSize: '1rem', color: '#999' }}>🔍</span>
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') doSearch(); }}
          placeholder={mode === 'info' ? '搜尋資訊內容、作者...' : '搜尋貼文內容、作者...'}
          style={{
            flex: 1, border: 'none', background: 'transparent', outline: 'none',
            fontSize: '0.9rem', color: '#333', padding: 0,
          }}
        />
        {searchInput && (
          <button onClick={() => { setSearchInput(''); setSearchText(''); }}
            style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}>
            ✕
          </button>
        )}
        <button onClick={doSearch}
          style={{
            background: '#C8A951', color: '#fff', border: 'none', borderRadius: 10,
            padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
          }}>
          搜尋
        </button>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {/* Info type filter dropdown */}
          {mode === 'info' && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => { setShowFilter(!showFilter); setShowSort(false); setShowCommunityFilter(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '7px 14px', borderRadius: 10, border: '1px solid #ddd',
                  background: '#fff', fontSize: '0.85rem', color: '#555', cursor: 'pointer', fontWeight: 500,
                }}>
                {infoFilter}
                <span style={{ fontSize: '0.7rem' }}>▼</span>
              </button>
              {showFilter && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 20,
                  background: '#fff', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  border: '1px solid #eee', minWidth: 140, overflow: 'hidden',
                }}>
                  {INFO_FILTER_OPTIONS.map(opt => (
                    <button key={opt} onClick={() => { setInfoFilter(opt); setShowFilter(false); }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px',
                        border: 'none', background: infoFilter === opt ? '#f0f7ff' : 'transparent',
                        fontSize: '0.85rem', cursor: 'pointer',
                        color: infoFilter === opt ? '#1c5373' : '#555',
                        fontWeight: infoFilter === opt ? 600 : 400,
                      }}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Community type filter dropdown */}
          {mode === 'community' && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => { setShowCommunityFilter(!showCommunityFilter); setShowSort(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '7px 14px', borderRadius: 10, border: '1px solid #ddd',
                  background: '#fff', fontSize: '0.85rem', color: '#555', cursor: 'pointer', fontWeight: 500,
                }}>
                {COMMUNITY_FILTER_OPTIONS.find(o => o.value === communityFilter)?.label ?? '全部'}
                <span style={{ fontSize: '0.7rem' }}>▼</span>
              </button>
              {showCommunityFilter && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 20,
                  background: '#fff', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  border: '1px solid #eee', minWidth: 140, overflow: 'hidden', maxHeight: 300, overflowY: 'auto',
                }}>
                  {COMMUNITY_FILTER_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => { setCommunityFilter(opt.value); setShowCommunityFilter(false); }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px',
                        border: 'none', background: communityFilter === opt.value ? '#f0f7ff' : 'transparent',
                        fontSize: '0.85rem', cursor: 'pointer',
                        color: communityFilter === opt.value ? '#1c5373' : '#555',
                        fontWeight: communityFilter === opt.value ? 600 : 400,
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sort dropdown */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setShowSort(!showSort); setShowFilter(false); setShowCommunityFilter(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '7px 14px', borderRadius: 10, border: '1px solid #ddd',
                background: '#fff', fontSize: '0.85rem', color: '#555', cursor: 'pointer', fontWeight: 500,
              }}>
              {sortOrder === 'newest' ? '最新到最舊' : '最舊到最新'}
              <span style={{ fontSize: '0.7rem' }}>▼</span>
            </button>
            {showSort && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 20,
                background: '#fff', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                border: '1px solid #eee', minWidth: 140, overflow: 'hidden',
              }}>
                {(['newest', 'oldest'] as const).map(val => (
                  <button key={val} onClick={() => { setSortOrder(val); setShowSort(false); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px',
                      border: 'none', background: sortOrder === val ? '#f0f7ff' : 'transparent',
                      fontSize: '0.85rem', cursor: 'pointer',
                      color: sortOrder === val ? '#1c5373' : '#555',
                      fontWeight: sortOrder === val ? 600 : 400,
                    }}>
                    {val === 'newest' ? '最新到最舊' : '最舊到最新'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {!loading && <span style={{ fontSize: '0.82rem', color: '#999', fontWeight: 500 }}>{filtered.length} 結果</span>}
      </div>

      {/* Close dropdowns on outside click */}
      {(showSort || showFilter || showCommunityFilter) && (
        <div onClick={() => { setShowSort(false); setShowFilter(false); setShowCommunityFilter(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
      )}

      {!hideCreateForm && user?.role !== 'GUEST' && (mode === 'community' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
        <CreatePostForm neighborhoodId={neighborhoodId} mode={mode} scope={scope} defaultPostType={defaultPostType} allowedPostTypes={allowedPostTypes} onCreated={fetchPosts} />
      )}

      {loading ? (
        <div className="empty-state">
          <p style={{ color: '#bbb' }}>載入中...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="post-list">
          {filtered.map(p => (
            <PostCard
              key={p.id}
              post={p}
              currentUser={user ?? null}
              initialBookmarked={bookmarkedIds.has(p.id)}
              initialLiked={likedIds.has(p.id)}
              onPrivateChat={(userId, nickname) => setPrivateChatTarget({ userId, nickname })}
              onShowLogin={() => showLoginModal(neighborhoodId)}
              onDeleted={id => setPosts(prev => prev.filter(x => x.id !== id))}
              onUpdated={updated => setPosts(prev => prev.map(x => x.id === updated.id ? updated : x))}
              readOnly={readOnly}
              mode={mode}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">{type === 'info' ? '📰' : '👥'}</div>
          <p>{searchText ? '沒有找到相關貼文' : '尚無貼文，成為第一個發文的人！'}</p>
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
  initialBookmarked?: boolean;
  initialLiked?: boolean;
  onPrivateChat: (userId: number, nickname?: string) => void;
  onShowLogin: () => void;
  onDeleted: (id: number) => void;
  onUpdated: (post: PostItem) => void;
  readOnly?: boolean;
  mode?: Mode;
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

function PostCard({ post, currentUser, initialBookmarked = false, initialLiked = false, onPrivateChat, onShowLogin, onDeleted, onUpdated, readOnly = false, mode = 'community' }: PostCardProps) {
  const { token, showLoginModal } = useAuth();
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [liked, setLiked] = useState(initialLiked);
  const [likePending, setLikePending] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [commentOpen, setCommentOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [bookmarkPending, setBookmarkPending] = useState(false);

  // Sync bookmark/like state when batch check results arrive
  useEffect(() => { setBookmarked(initialBookmarked); }, [initialBookmarked]);
  useEffect(() => { setLiked(initialLiked); }, [initialLiked]);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title ?? '');
  const [editContent, setEditContent] = useState(post.content);
  const [editImages, setEditImages] = useState<string[]>(post.images);
  const [editExtra, setEditExtra] = useState<Record<string, string>>({});
  const [editUrgency, setEditUrgency] = useState<string>(post.urgency ?? '');
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

  const editExtraFields = EDIT_EXTRA_FIELDS[post.type] ?? [];

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editContent.trim() || !token) return;
    // 驗證必填 extra 欄位
    for (const f of editExtraFields) {
      if (!editExtra[f.key]?.trim()) return;
    }
    setEditLoading(true);
    try {
      const extraClean = Object.fromEntries(
        Object.entries(editExtra).filter(([, v]) => v.trim())
      );
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: editTitle.trim() || null,
          content: editContent.trim(),
          images: editImages,
          extra: Object.keys(extraClean).length > 0 ? extraClean : undefined,
          urgency: mode === 'info' ? (editUrgency || null) : undefined,
        }),
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
    fresh: '動態', store_visit: '踩點', selling: '我要賣', renting: '要出租',
    group_buy: '發團購', group_event: '揪團活動', free_give: '免費贈',
    help: '生活求助', want_rent: '想承租', find: '尋人找物',
    recruit: '徵人求才', report: '通報',
  };

  const isGuest = currentUser?.role === 'GUEST';

  async function handleLike() {
    if (!token || isGuest) { showLoginModal(); return; }
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

  const isAdminPost = ['info', 'broadcast', 'district_info', 'li_info'].includes(post.type);
  const isAdmin = post.authorRole === 'ADMIN' || post.authorRole === 'SUPER_ADMIN';
  const badge = isAdminPost
    ? { label: '公告', bg: '#DBEAFE', color: '#1E40AF' }
    : isAdmin
      ? { label: '管理員', bg: '#FEF3C7', color: '#92400E' }
      : undefined;

  // Broadcast-style left border color based on urgency (matching app)
  const BROADCAST_COLOR: Record<string, string> = { normal: '#22C55E', medium: '#F59E0B', urgent: '#EF4444' };
  const BROADCAST_LABEL: Record<string, string> = { normal: '一般', medium: '中等', urgent: '緊急' };
  const broadcastBorderColor = post.urgency ? BROADCAST_COLOR[post.urgency] : undefined;

  return (
    <div className="post-card" style={broadcastBorderColor ? {
      borderLeft: `4px solid ${broadcastBorderColor}`,
    } : undefined}>
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
            {mode !== 'info' && badge && (
              <span style={{
                fontSize: '0.65rem', background: badge.bg,
                color: badge.color, padding: '1px 5px', borderRadius: 4, fontWeight: 600,
              }}>
                {badge.label}
              </span>
            )}
            {mode !== 'info' && typeLabel[post.type] && (
              <span style={{
                fontSize: '0.65rem', background: '#f0f7ff',
                color: '#1c5373', padding: '1px 5px', borderRadius: 4, fontWeight: 500,
              }}>
                {typeLabel[post.type]}
              </span>
            )}
            {post.urgency && BROADCAST_COLOR[post.urgency] && (
              <span style={{
                fontSize: '0.65rem', padding: '2px 7px', borderRadius: 4, fontWeight: 700,
                background: BROADCAST_COLOR[post.urgency],
                color: '#fff',
              }}>
                {BROADCAST_LABEL[post.urgency]}
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
            <button onClick={() => { setEditTitle(post.title ?? ''); setEditContent(post.content); setEditImages(post.images); setEditExtra(post.extra ? { ...post.extra } : {}); setEditUrgency(post.urgency ?? ''); setEditing(true); }} style={chatBtnStyle('#555')}>編輯</button>
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
          {/* 緊急程度（info 模式） */}
          {mode === 'info' && (
            <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', color: '#555' }}>類型：</span>
              <select value={editUrgency ? `broadcast_${editUrgency}` : 'post'} onChange={e => {
                const v = e.target.value;
                if (v === 'post') setEditUrgency('');
                else setEditUrgency(v.replace('broadcast_', ''));
              }}
                style={{ border: '1px solid #e6e6e6', borderRadius: 6, padding: '0.25rem 0.5rem', fontSize: '0.82rem',
                  color: editUrgency === 'urgent' ? '#c0392b' : editUrgency === 'medium' ? '#e67e22' : '#555', background: '#f8f9f9' }}>
                <option value="post">貼文</option>
                <option value="broadcast_normal">廣播(一般)</option>
                <option value="broadcast_medium">廣播(中等)</option>
                <option value="broadcast_urgent">廣播(緊急)</option>
              </select>
            </div>
          )}
          {/* 分類專屬欄位 */}
          {editExtraFields.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem', marginTop: '0.5rem', padding: '0.5rem', background: '#f8f9fa', borderRadius: 8 }}>
              {editExtraFields.map(f => (
                <label key={f.key} style={{ fontSize: '0.78rem', color: '#555' }}>
                  {f.label} <span style={{ color: '#e53e3e' }}>*</span>
                  {f.type === 'select' ? (
                    <select value={editExtra[f.key] ?? ''} onChange={e => setEditExtra(prev => ({ ...prev, [f.key]: e.target.value }))}
                      required
                      style={{ width: '100%', border: '1px solid #e6e6e6', borderRadius: 6, padding: '0.35rem 0.5rem', fontSize: '0.82rem', outline: 'none', background: '#fafafa', boxSizing: 'border-box', marginTop: 2 }}>
                      <option value="">請選擇</option>
                      {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input
                      type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                      value={editExtra[f.key] ?? ''}
                      onChange={e => setEditExtra(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      required
                      style={{ width: '100%', border: '1px solid #e6e6e6', borderRadius: 6, padding: '0.35rem 0.5rem', fontSize: '0.82rem', outline: 'none', background: '#fafafa', boxSizing: 'border-box', marginTop: 2 }}
                    />
                  )}
                </label>
              ))}
            </div>
          )}

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

      {/* Extra fields */}
      {!editing && post.extra && Object.keys(post.extra).length > 0 && (
        <PostExtraFields extra={post.extra} />
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
          onClick={() => { if (!commentOpen && (!currentUser || isGuest)) { showLoginModal(); return; } setCommentOpen(v => !v); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: commentOpen ? '#1c5373' : '#828282' }}
        >
          <span>💬</span> {commentCount}
        </button>

        <button
          onClick={async () => {
            if (!token || isGuest) { showLoginModal(); return; }
            if (bookmarkPending) return;
            setBookmarkPending(true);
            setBookmarked(v => !v);
            try {
              const res = await fetch(`${CLIENT_BASE_URL}/api/v1/bookmarks/${post.id}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
              });
              const json = await res.json();
              if (json.code === 401) { dispatchAuthExpired(); setBookmarked(v => !v); }
              else if (json.code === 200) setBookmarked(json.data.bookmarked);
              else setBookmarked(v => !v);
            } catch { setBookmarked(v => !v); }
            finally { setBookmarkPending(false); }
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: bookmarked ? '#C8A951' : '#828282' }}
        >
          <span>{bookmarked ? '🔖' : '📑'}</span> 收藏
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

const EXTRA_LABELS: Record<string, string> = {
  shopName: '店家', brandName: '品名', price: '價格', quantity: '數量',
  condition: '狀態', rentalTarget: '項目', minQty: '最低成團',
  maxQty: '最高數量', deadline: '截止日期', expiry: '有效期限',
  searchTarget: '尋找對象', datetime: '時間',
  jobTitle: '職稱', minSalary: '最低薪資', maxSalary: '最高薪資', jobType: '類型',
};

function PostExtraFields({ extra }: { extra: Record<string, string> }) {
  const entries = Object.entries(extra).filter(([, v]) => v);
  if (entries.length === 0) return null;
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '0.25rem 0.75rem',
      marginTop: '0.5rem', padding: '0.4rem 0.6rem',
      background: '#f8f9fa', borderRadius: 6, fontSize: '0.78rem',
    }}>
      {entries.map(([k, v]) => (
        <span key={k} style={{ color: '#555' }}>
          <span style={{ color: '#999' }}>{EXTRA_LABELS[k] ?? k}：</span>{v}
        </span>
      ))}
    </div>
  );
}
