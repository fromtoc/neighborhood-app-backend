'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { CLIENT_BASE_URL } from '@/lib/api';
import { dispatchAuthExpired } from '@/lib/auth-client';
import ShareButton from './ShareButton';

interface Props {
  postId: number;
  initialLikeCount: number;
  initialCommentCount: number;
  shareTitle: string;
}

export default function PostLikeBar({ postId, initialLikeCount, initialCommentCount, shareTitle }: Props) {
  const { token, user, showLoginModal } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [likePending, setLikePending] = useState(false);

  // Fetch current liked status when user is logged in
  useEffect(() => {
    if (!token || !user || user.role === 'GUEST') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${CLIENT_BASE_URL}/api/v1/posts/${postId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!cancelled && json.code === 200) {
          setLiked(json.data.liked === true);
          setLikeCount(json.data.likeCount ?? initialLikeCount);
          setCommentCount(json.data.commentCount ?? initialCommentCount);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [token, user, postId, initialLikeCount, initialCommentCount]);

  async function handleLike() {
    if (!token || !user || user.role === 'GUEST') { showLoginModal(); return; }
    if (likePending) return;
    setLikePending(true);
    setLiked(v => !v);
    setLikeCount(c => liked ? c - 1 : c + 1);
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.code === 401) {
        dispatchAuthExpired();
        setLiked(v => !v);
        setLikeCount(c => liked ? c + 1 : c - 1);
      } else if (json.code === 200) {
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

  // Listen for comment count changes from CommentSection
  useEffect(() => {
    function onCommentChange(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.postId === postId && typeof detail.commentCount === 'number') {
        setCommentCount(detail.commentCount);
      }
    }
    window.addEventListener('post-comment-count', onCommentChange);
    return () => window.removeEventListener('post-comment-count', onCommentChange);
  }, [postId]);

  const btnStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
    display: 'flex', alignItems: 'center', gap: '0.35rem',
    fontSize: '0.85rem', color: '#828282',
  };

  return (
    <div style={{
      display: 'flex', gap: '1.5rem', marginTop: '1.25rem', paddingTop: '1rem',
      borderTop: '1px solid #f0f0f0', fontSize: '0.85rem', color: '#828282', alignItems: 'center',
    }}>
      <button onClick={handleLike} style={{ ...btnStyle, color: liked ? '#e53e3e' : '#828282' }}>
        <span>{liked ? '❤️' : '🤍'}</span> {likeCount} 個讚
      </button>
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        💬 {commentCount} 則留言
      </span>
      <ShareButton title={shareTitle} path={`/posts/${postId}`} style={{ marginLeft: 'auto' }} />
    </div>
  );
}
