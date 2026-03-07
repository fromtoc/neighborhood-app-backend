'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import { CLIENT_BASE_URL } from '@/lib/api';

interface Comment {
  id: number;
  postId: number;
  userId: number;
  nickname: string | null;
  content: string;
  createdAt: string;
}

interface Props {
  postId: number;
  onCommentAdded?: () => void;
}

/** 只渲染展開的留言列表 + 輸入框，不含 trigger 按鈕（trigger 由父元件負責）*/
export default function CommentSection({ postId, onCommentAdded }: Props) {
  const { user, token, nickname, showLoginModal } = useAuth();
  const selfName = user?.role === 'GUEST'
    ? `訪客 #${user.userId}`
    : (nickname || `用戶 #${user?.userId}`);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/posts/${postId}/comments`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.code === 200) setComments(json.data ?? []);
    } catch {
      // 網路錯誤時保留現有留言，不清空
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !token) return;
    setSending(true);
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: input.trim() }),
      });
      const json = await res.json();
      if (json.code === 200) {
        setInput('');
        onCommentAdded?.();
        await fetchComments(); // refetch 確保拿到完整列表（包含剛送出的）
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f0f0f0' }}>
      {/* 留言列表 — Threads 風格 */}
      {loading ? (
        <p style={{ fontSize: '0.82rem', color: '#bbb', padding: '0.25rem 0' }}>載入中...</p>
      ) : comments.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '0.75rem' }}>
          {comments.map((c, i) => (
            <ThreadComment
              key={c.id}
              comment={c}
              isLast={i === comments.length - 1}
              currentUserId={user?.userId}
              selfName={selfName}
            />
          ))}
        </div>
      ) : (
        <p style={{ fontSize: '0.82rem', color: '#bbb', marginBottom: '0.75rem' }}>
          還沒有留言，來說說你的想法！
        </p>
      )}

      {/* 輸入框 */}
      {user ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Avatar name={selfName} size={28} self />
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`以 ${selfName} 留言...`}
            maxLength={500}
            disabled={sending}
            style={{
              flex: 1, padding: '0.45rem 0.75rem',
              border: '1px solid #e6e6e6', borderRadius: 20,
              fontSize: '0.85rem', outline: 'none', background: '#fafafa',
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            style={{
              background: input.trim() ? '#1c5373' : '#e6e6e6',
              color: input.trim() ? '#fff' : '#bbb',
              border: 'none', borderRadius: 20,
              padding: '0.4rem 0.9rem', fontSize: '0.82rem',
              cursor: input.trim() ? 'pointer' : 'default',
              whiteSpace: 'nowrap',
            }}
          >
            {sending ? '…' : '送出'}
          </button>
        </form>
      ) : (
        <button
          onClick={() => showLoginModal()}
          style={{
            background: 'none', border: '1px solid #e6e6e6', borderRadius: 20,
            padding: '0.4rem 1rem', fontSize: '0.82rem',
            color: '#828282', cursor: 'pointer', width: '100%',
          }}
        >
          登入後留言
        </button>
      )}
    </div>
  );
}

/* ── Threads 風格單則留言 ──────────────────────────── */

function ThreadComment({
  comment, isLast, currentUserId, selfName,
}: {
  comment: Comment; isLast: boolean; currentUserId?: number; selfName?: string;
}) {
  const isSelf = currentUserId === comment.userId;
  const name = isSelf && selfName ? selfName : (comment.nickname ?? `用戶 #${comment.userId}`);
  const time = new Date(comment.createdAt).toLocaleDateString('zh-TW', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div style={{ display: 'flex', gap: '0.6rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <Avatar name={name} size={32} self={isSelf} />
        {!isLast && <div style={{ width: 2, flex: 1, background: '#e6e6e6', margin: '4px 0' }} />}
      </div>
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e1e1e' }}>{name}</span>
          <span style={{ fontSize: '0.72rem', color: '#bbb' }}>{time}</span>
        </div>
        <p style={{ fontSize: '0.88rem', color: '#2c2c2c', lineHeight: 1.6, marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>
          {comment.content}
        </p>
      </div>
    </div>
  );
}

function Avatar({ name, size, self }: { name: string; size: number; self: boolean }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: self ? '#1c5373' : '#e6e6e6',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700,
      color: self ? '#fff' : '#828282',
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
