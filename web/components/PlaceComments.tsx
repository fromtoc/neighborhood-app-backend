'use client';

import { useState, useEffect, useCallback } from 'react';
import { getToken, getUser } from '@/lib/auth-client';

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

interface Comment {
  id: number;
  placeId: number;
  userId: number;
  authorName: string | null;
  content: string;
  rating: number | null;
  likeCount: number;
  createdAt: string;
}

interface PageResult {
  total: number;
  records: Comment[];
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 60) return '剛剛';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`;
  return d.toLocaleDateString('zh-TW');
}

export default function PlaceComments({ placeId }: { placeId: number }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasCommented, setHasCommented] = useState(false);

  // auth state
  const [canComment, setCanComment] = useState(false); // true = logged in + not guest
  const [isGuest, setIsGuest] = useState(false);

  // new comment form
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = getUser();
    if (user) {
      if (user.role === 'GUEST') {
        setIsGuest(true);
      } else {
        setCanComment(true);
      }
    }
  }, []);

  const fetchComments = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/places/${placeId}/comments?page=${p}&size=10`);
      const json = await res.json();
      if (json.code === 200) {
        const data: PageResult = json.data;
        setComments(data.records);
        setTotal(data.total);
        // check if current user already commented
        const user = getUser();
        if (user && data.records.some((c: Comment) => c.userId === user.userId)) {
          setHasCommented(true);
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [placeId]);

  useEffect(() => { fetchComments(page); }, [page, fetchComments]);

  const handleSubmit = async () => {
    if (!content.trim()) { setError('請輸入評論內容'); return; }
    const token = getToken();
    if (!token) { setError('請先登入'); return; }

    setSubmitting(true);
    setError('');
    try {
      const body: Record<string, unknown> = { content: content.trim() };
      if (rating > 0) body.rating = rating;

      const res = await fetch(`${API}/api/v1/places/${placeId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.code === 200) {
        setContent('');
        setRating(0);
        setHasCommented(true);
        setPage(1);
        fetchComments(1);
      } else {
        if (json.message?.includes('已評論')) setHasCommented(true);
        setError(json.message || '發表失敗');
      }
    } catch {
      setError('網路錯誤');
    }
    setSubmitting(false);
  };

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="section" style={{ marginTop: '1rem' }}>
      <div className="section-header">
        <h2 className="section-title">評論 ({total})</h2>
      </div>

      {/* New comment form */}
      {isGuest ? (
        <div style={{ marginBottom: '1.25rem', padding: '1rem', background: '#fafafa', borderRadius: 10, textAlign: 'center', color: '#999', fontSize: '0.88rem' }}>
          訪客無法評論，請使用第三方帳號登入後再評論
        </div>
      ) : !canComment ? (
        <div style={{ marginBottom: '1.25rem', padding: '1rem', background: '#fafafa', borderRadius: 10, textAlign: 'center', color: '#999', fontSize: '0.88rem' }}>
          請先登入後再評論
        </div>
      ) : hasCommented ? (
        <div style={{ marginBottom: '1.25rem', padding: '1rem', background: '#fafafa', borderRadius: 10, textAlign: 'center', color: '#999', fontSize: '0.88rem' }}>
          您已評論過此店家
        </div>
      ) : (
        <div style={{ marginBottom: '1.25rem', padding: '1rem', background: '#fafafa', borderRadius: 10 }}>
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem' }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setRating(rating === n ? 0 : n)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', padding: 0, color: n <= rating ? '#f59e0b' : '#ddd' }}>
                ★
              </button>
            ))}
            {rating > 0 && <span style={{ fontSize: '0.8rem', color: '#999', marginLeft: '0.25rem' }}>{rating} 分</span>}
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="分享你的體驗..."
            rows={3}
            style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }}
          />
          {error && <div style={{ color: '#e53e3e', fontSize: '0.8rem', marginTop: '0.25rem' }}>{error}</div>}
          <button onClick={handleSubmit} disabled={submitting}
            style={{ marginTop: '0.5rem', background: '#1c5373', color: '#fff', border: 'none', padding: '0.4rem 1rem', borderRadius: 6, fontSize: '0.85rem', cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? '發表中...' : '發表評論'}
          </button>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#aaa', padding: '2rem 0' }}>載入中...</div>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#aaa', padding: '2rem 0' }}>暫無評論，成為第一個評論的人吧！</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {comments.map(c => (
            <div key={c.id} style={{ padding: '0.75rem', background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#333' }}>{c.authorName || '匿名'}</span>
                <span style={{ fontSize: '0.75rem', color: '#bbb' }}>{timeAgo(c.createdAt)}</span>
              </div>
              {c.rating != null && (
                <div style={{ fontSize: '0.85rem', color: '#f59e0b', marginBottom: '0.3rem' }}>
                  {'★'.repeat(c.rating)}{'☆'.repeat(5 - c.rating)}
                </div>
              )}
              <p style={{ fontSize: '0.9rem', color: '#444', lineHeight: 1.6, margin: 0 }}>{c.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          {page > 1 && (
            <button onClick={() => setPage(page - 1)}
              style={{ background: 'none', border: '1px solid #ddd', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: '0.85rem' }}>
              上一頁
            </button>
          )}
          <span style={{ fontSize: '0.85rem', color: '#666', lineHeight: '28px' }}>{page} / {totalPages}</span>
          {page < totalPages && (
            <button onClick={() => setPage(page + 1)}
              style={{ background: 'none', border: '1px solid #ddd', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: '0.85rem' }}>
              下一頁
            </button>
          )}
        </div>
      )}
    </div>
  );
}
