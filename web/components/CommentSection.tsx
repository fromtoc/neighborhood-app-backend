'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import { CLIENT_BASE_URL } from '@/lib/api';
import { dispatchAuthExpired } from '@/lib/auth-client';
import ShareButton from './ShareButton';

interface Comment {
  id: number;
  postId: number;
  parentId: number | null;
  userId: number;
  nickname: string | null;
  content: string;
  likeCount: number;
  createdAt: string;
  replyCount: number;
  topRepliers: string[];
}

interface Props {
  postId: number;
  onCommentAdded?: () => void;
  initialCommentId?: number;
}

const COLORS = ['#e53935','#8e24aa','#1e88e5','#43a047','#fb8c00','#00acc1','#6d4c41','#546e7a'];
function hashColor(name: string) {
  let h = 0;
  for (const c of name) h = ((h << 5) - h) + c.charCodeAt(0);
  return COLORS[Math.abs(h) % COLORS.length];
}

function timeAgo(iso: string) {
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

/** 小頭像 */
function MiniAvatar({ name }: { name: string }) {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
      background: hashColor(name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 700, color: '#fff',
      marginLeft: -6, border: '2px solid #fff',
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

/** 大頭像 */
function Avatar({ name, size = 36, self = false }: { name: string; size?: number; self?: boolean }) {
  const bg = self ? '#1c5373' : hashColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: bg, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

/** 單則留言卡 */
function CommentCard({
  comment, isSelf, selfName, showLine, onClick, postId,
}: {
  comment: Comment; isSelf: boolean; selfName: string;
  showLine: boolean; onClick: () => void; postId: number;
}) {
  const { token } = useAuth();
  const name = isSelf ? selfName : (comment.nickname ?? `用戶 #${comment.userId}`);
  const hasReplies = comment.replyCount > 0;

  const [liked,     setLiked]     = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likeCount ?? 0);
  const [likePending, setLikePending] = useState(false);

  async function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    if (!token || likePending) return;
    setLikePending(true);
    setLiked(v => !v);
    setLikeCount(c => liked ? c - 1 : c + 1);
    try {
      const res = await fetch(
        `${CLIENT_BASE_URL}/api/v1/posts/${postId}/comments/${comment.id}/like`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (json.code === 401) { dispatchAuthExpired(); setLiked(v => !v); setLikeCount(c => liked ? c + 1 : c - 1); }
      else if (json.code === 200) { setLiked(json.data.liked); setLikeCount(json.data.likeCount); }
      else { setLiked(v => !v); setLikeCount(c => liked ? c + 1 : c - 1); }
    } catch {
      setLiked(v => !v); setLikeCount(c => liked ? c + 1 : c - 1);
    } finally {
      setLikePending(false);
    }
  }

  const btnStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
    display: 'flex', alignItems: 'center', gap: '0.3rem',
    fontSize: '0.82rem', color: '#828282',
  };

  return (
    <div id={`comment-${comment.id}`} style={{ display: 'flex', gap: '0.65rem' }}>
      {/* 頭像欄 + thread 線 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <Avatar name={name} size={36} self={isSelf} />
        {(showLine || hasReplies) && (
          <div style={{ width: 2, flex: 1, minHeight: 12, background: '#e6e6e6', marginTop: 4 }} />
        )}
      </div>

      {/* 內容 */}
      <div style={{ flex: 1, paddingBottom: '0.9rem', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 2 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e1e1e' }}>{name}</span>
          <span style={{ fontSize: '0.72rem', color: '#bbb' }}>{timeAgo(comment.createdAt)}</span>
        </div>

        {/* 點擊內容進入子討論 */}
        <div onClick={onClick} style={{ cursor: 'pointer' }}>
          <p style={{
            fontSize: '0.9rem', color: '#2c2c2c', lineHeight: 1.6,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 6,
          }}>
            {comment.content}
          </p>
        </div>

        {/* 互動列 */}
        <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.5rem', alignItems: 'center' }}>
          {/* 讚 */}
          <button
            onClick={handleLike}
            style={{ ...btnStyle, color: liked ? '#e53e3e' : '#828282' }}
          >
            <span>{liked ? '❤️' : '🤍'}</span> {likeCount}
          </button>

          {/* 回覆 */}
          <button
            onClick={e => { e.stopPropagation(); onClick(); }}
            style={btnStyle}
          >
            <span>💬</span> {comment.replyCount}
          </button>

          {/* 分享 */}
          <ShareButton
            title={comment.content.slice(0, 40)}
            path={`/posts/${comment.postId}?commentId=${comment.id}`}
          />
        </div>

        {/* 回覆摘要（mini avatars） */}
        {hasReplies && (
          <div
            onClick={e => { e.stopPropagation(); onClick(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', marginLeft: 6 }}>
              {comment.topRepliers.map((r, i) => (
                <MiniAvatar key={i} name={r} />
              ))}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#999' }}>
              {comment.replyCount} 則回覆
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/** 回覆輸入框 */
function ReplyComposer({
  postId, parentId, replyingTo, selfName, onSent,
}: {
  postId: number; parentId: number | null; replyingTo: string;
  selfName: string; onSent: () => void;
}) {
  const { token } = useAuth();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !token) return;
    setSending(true);
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: input.trim(), parentId }),
      });
      const json = await res.json();
      if (json.code === 401) { dispatchAuthExpired(); return; }
      if (json.code === 200) { setInput(''); onSent(); }
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{
      display: 'flex', gap: '0.65rem', padding: '0.75rem 0',
      borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0',
    }}>
      <Avatar name={selfName} size={32} self />
      <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          placeholder={`回覆 ${replyingTo}...`}
          maxLength={500}
          rows={1}
          disabled={sending}
          style={{
            border: 'none', outline: 'none', resize: 'none',
            fontSize: '0.9rem', fontFamily: 'inherit',
            color: '#1e1e1e', background: 'transparent',
            minHeight: 36, lineHeight: 1.6,
          }}
        />
        {input.trim() && (
          <button
            type="submit"
            disabled={sending}
            style={{
              alignSelf: 'flex-end',
              background: '#1c5373', color: '#fff',
              border: 'none', borderRadius: 18,
              padding: '5px 16px', fontSize: '0.82rem', fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {sending ? '…' : '發佈'}
          </button>
        )}
      </form>
    </div>
  );
}

/** 滑入式討論面板（可無限堆疊） */
function ThreadPanel({
  postId, rootComment, selfName, isSelf, onClose, onReplied,
  initialChain, preloadedRepliesMap,
}: {
  postId: number; rootComment: Comment; selfName: string;
  isSelf: boolean; onClose: () => void; onReplied?: () => void;
  initialChain?: number[];
  /** 分享連結預載的回覆 map（key = commentId），避免每層各自 fetch */
  preloadedRepliesMap?: Record<number, Comment[]>;
}) {
  const [replies, setReplies] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [subThread, setSubThread] = useState<Comment | null>(null);
  const { user } = useAuth();
  const autoSubDone = useRef(false);

  const name = isSelf ? selfName : (rootComment.nickname ?? `用戶 #${rootComment.userId}`);

  const fetchReplies = useCallback(async () => {
    // 優先使用預載資料（分享連結進入時）
    const preloaded = preloadedRepliesMap?.[rootComment.id];
    if (preloaded !== undefined && !autoSubDone.current) {
      setReplies(preloaded);
      setLoading(false);
      if (initialChain && initialChain.length > 0) {
        const sub = preloaded.find(r => r.id === initialChain[0]);
        if (sub) { setSubThread(sub); autoSubDone.current = true; }
      }
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${CLIENT_BASE_URL}/api/v1/posts/${postId}/comments?parentId=${rootComment.id}`
      );
      const json = await res.json();
      if (json.code === 200) {
        const list: Comment[] = json.data ?? [];
        setReplies(list);
        if (!autoSubDone.current && initialChain && initialChain.length > 0) {
          const sub = list.find(r => r.id === initialChain[0]);
          if (sub) { setSubThread(sub); autoSubDone.current = true; }
        }
      }
    } finally {
      setLoading(false);
    }
  }, [postId, rootComment.id, initialChain, preloadedRepliesMap]);

  useEffect(() => { fetchReplies(); }, [fetchReplies]);

  // Back handler — 統一由 popstate 觸發，確保 history stack 同步
  useEffect(() => {
    function onBack() { if (!subThread) onClose(); }
    history.pushState({ thread: rootComment.id }, '');
    window.addEventListener('popstate', onBack);
    return () => {
      window.removeEventListener('popstate', onBack);
    };
  }, [rootComment.id, subThread, onClose]);

  // 統一的關閉入口：透過 history.back() 觸發 popstate
  function handleClose() { history.back(); }

  return (
    <>
      {/* 遮罩 */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.15)',
        }}
      />

      {/* 面板 */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 301,
        background: '#f8f9f9', overflowY: 'auto',
        animation: 'slideInRight 0.25s cubic-bezier(.4,0,.2,1)',
      }}>
        {/* 頂部導覽 */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(248,249,249,.92)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid #e8e8e8',
          display: 'flex', alignItems: 'center',
          padding: '0.7rem 1rem', gap: '0.75rem',
        }}>
          <button
            onClick={handleClose}
            style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#1e1e1e', lineHeight: 1 }}
          >
            ←
          </button>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>討論串</span>
        </div>

        <div style={{ maxWidth: 680, margin: '0 auto', padding: '1rem' }}>
          {/* 根留言（作為 OP） */}
          <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <Avatar name={name} size={40} self={isSelf} />
              {(loading || replies.length > 0) && (
                <div style={{ width: 2, flex: 1, minHeight: 16, background: '#e6e6e6', marginTop: 4 }} />
              )}
            </div>
            <div style={{ flex: 1, paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{name}</span>
                <span style={{ fontSize: '0.72rem', color: '#bbb' }}>{timeAgo(rootComment.createdAt)}</span>
              </div>
              <p style={{ fontSize: '0.95rem', lineHeight: 1.65, color: '#1e1e1e', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {rootComment.content}
              </p>
            </div>
          </div>

          {/* 回覆輸入 */}
          {user ? (
            <ReplyComposer
              postId={postId}
              parentId={rootComment.id}
              replyingTo={name}
              selfName={selfName}
              onSent={() => { fetchReplies(); onReplied?.(); }}
            />
          ) : null}

          {/* 回覆列表 */}
          {loading ? (
            <p style={{ fontSize: '0.82rem', color: '#bbb', padding: '1rem 0' }}>載入中...</p>
          ) : replies.length > 0 ? (
            <div style={{ marginTop: '0.5rem' }}>
              <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#999', padding: '0.5rem 0' }}>
                回覆 · {replies.length} 則
              </p>
              {replies.map((r, i) => (
                <CommentCard
                  key={r.id}
                  comment={r}
                  isSelf={user?.userId === r.userId}
                  selfName={selfName}
                  showLine={i < replies.length - 1}
                  onClick={() => setSubThread(r)}
                  postId={postId}
                />
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.82rem', color: '#bbb', padding: '1rem 0' }}>
              還沒有回覆，來說說你的想法！
            </p>
          )}
        </div>
      </div>

      {/* 子討論串（無限堆疊） */}
      {subThread && (
        <ThreadPanel
          postId={postId}
          rootComment={subThread}
          selfName={selfName}
          isSelf={user?.userId === subThread.userId}
          onClose={() => { setSubThread(null); fetchReplies(); }}
          onReplied={() => { fetchReplies(); onReplied?.(); }}
          initialChain={initialChain && initialChain.length > 1 ? initialChain.slice(1) : undefined}
          preloadedRepliesMap={preloadedRepliesMap}
        />
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

/* ── 主元件 ─────────────────────────────────────────────── */

export default function CommentSection({ postId, onCommentAdded, initialCommentId }: Props) {
  const { user, token, nickname, showLoginModal } = useAuth();
  const selfName = user?.role === 'GUEST'
    ? `訪客 #${user.userId}`
    : (nickname || `用戶 #${user?.userId}`);

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeThread, setActiveThread] = useState<Comment | null>(null);
  const [initialChain, setInitialChain] = useState<number[]>([]);
  const [preloadedRepliesMap, setPreloadedRepliesMap] = useState<Record<number, Comment[]> | undefined>();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoOpenDone = useRef(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/posts/${postId}/comments`);
      const json = await res.json();
      if (json.code === 200) {
        const list: Comment[] = json.data ?? [];
        setComments(list);

        if (!autoOpenDone.current && initialCommentId) {
          autoOpenDone.current = true;

          // 在頂層直接找到（頂層留言，無須 /thread）
          const topLevel = list.find(c => c.id === initialCommentId);
          if (topLevel) { setActiveThread(topLevel); return; }

          // 巢狀回覆：呼叫 /thread 一次取得完整祖先鏈 + 每層回覆
          try {
            const tr = await fetch(
              `${CLIENT_BASE_URL}/api/v1/posts/${postId}/comments/${initialCommentId}/thread`
            );
            const tj = await tr.json();
            if (tj.code === 200) {
              const chain: Comment[] = tj.data.chain;
              const repliesMap: Record<number, Comment[]> = tj.data.repliesByParent;
              if (chain.length === 0) return;

              const root = list.find(c => c.id === chain[0].id) ?? chain[0];
              setActiveThread(root);
              setPreloadedRepliesMap(repliesMap);
              if (chain.length > 1) setInitialChain(chain.slice(1).map(c => c.id));
            }
          } catch { /* 靜默失敗，不開 panel */ }
        }
      }
    } finally {
      setLoading(false);
    }
  }, [postId, initialCommentId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);

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
      if (json.code === 401) { dispatchAuthExpired(); return; }
      if (json.code === 200) {
        setInput('');
        onCommentAdded?.();
        await fetchComments();
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f0f0f0' }}>

      {/* 留言列表 */}
      {loading ? (
        <p style={{ fontSize: '0.82rem', color: '#bbb', padding: '0.25rem 0 0.75rem' }}>載入中...</p>
      ) : comments.length > 0 ? (
        <div style={{ marginBottom: '0.75rem' }}>
          {comments.map((c, i) => (
            <CommentCard
              key={c.id}
              comment={c}
              isSelf={user?.userId === c.userId}
              selfName={selfName ?? ''}
              showLine={i < comments.length - 1}
              onClick={() => setActiveThread(c)}
              postId={postId}
            />
          ))}
        </div>
      ) : (
        <p style={{ fontSize: '0.82rem', color: '#bbb', marginBottom: '0.75rem' }}>
          還沒有留言，來說說你的想法！
        </p>
      )}

      {/* 頂層留言輸入框 */}
      {user ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Avatar name={selfName ?? 'U'} size={28} self />
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

      {/* 討論串面板 */}
      {activeThread && (
        <ThreadPanel
          postId={postId}
          rootComment={activeThread}
          selfName={selfName ?? ''}
          isSelf={user?.userId === activeThread.userId}
          onClose={() => { setActiveThread(null); setInitialChain([]); setPreloadedRepliesMap(undefined); fetchComments(); }}
          onReplied={fetchComments}
          initialChain={initialChain.length > 0 ? initialChain : undefined}
          preloadedRepliesMap={preloadedRepliesMap}
        />
      )}
    </div>
  );
}
