'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import { CLIENT_BASE_URL } from '@/lib/api';
import { dispatchAuthExpired } from '@/lib/auth-client';
import { createStompClient } from '@/lib/stomp-client';
import MentionText from './MentionText';

interface ChatMessage {
  id: number;
  roomId: number;
  userId: number;
  nickname: string | null;
  authorBadge?: string | null;
  content: string;
  type: string;
  createdAt: string;
}

interface Props {
  targetUserId: number;
  targetNickname?: string | null;
  targetBadge?: string | null;
  onClose: () => void;
}

export default function PrivateChatModal({ targetUserId, targetNickname, targetBadge: initialBadge, onClose }: Props) {
  const { user, token, nickname } = useAuth();
  const [roomId, setRoomId] = useState<number | null>(null);
  const [badge, setBadge] = useState<string | null | undefined>(initialBadge);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stompRef = useRef<import('@stomp/stompjs').Client | null>(null);
  const initialScrollDone = useRef(false);

  const displayTarget = targetNickname || `用戶 #${targetUserId}`;
  const displaySelf = user?.role === 'GUEST'
    ? `訪客 #${user.userId}`
    : (nickname || `用戶 #${user?.userId ?? '?'}`);

  // 取得或建立私聊房間
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`${CLIENT_BASE_URL}/api/v1/chat/private/${targetUserId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => {
        if (json.code === 200) {
          setRoomId(json.data.id);
          if (!badge && json.data.otherBadge) setBadge(json.data.otherBadge);
        }
        else setError(json.message ?? '無法開啟私聊');
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, targetUserId]);

  // 載入最新訊息
  const fetchMessages = useCallback(async (rid: number) => {
    const res = await fetch(`${CLIENT_BASE_URL}/api/v1/chat/rooms/${rid}/messages?limit=20`);
    const json = await res.json();
    if (json.code === 200) {
      const data: ChatMessage[] = json.data ?? [];
      setMessages(data);
      setHasMore(data.length >= 20);
    }
  }, []);

  // 載入更多歷史訊息
  const loadMore = useCallback(async () => {
    if (!roomId || loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldestId = messages[0].id;
    const scrollEl = scrollRef.current;
    const prevScrollHeight = scrollEl?.scrollHeight ?? 0;
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/chat/rooms/${roomId}/messages?limit=20&before=${oldestId}`);
      const json = await res.json();
      if (json.code === 200) {
        const older: ChatMessage[] = json.data ?? [];
        if (older.length < 20) setHasMore(false);
        if (older.length > 0) {
          setMessages(prev => [...older, ...prev]);
          // 維持滾動位置
          requestAnimationFrame(() => {
            if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight - prevScrollHeight;
          });
        }
      }
    } catch {} finally { setLoadingMore(false); }
  }, [roomId, loadingMore, hasMore, messages]);

  useEffect(() => {
    if (roomId) {
      fetchMessages(roomId);
      if (token) {
        fetch(`${CLIENT_BASE_URL}/api/v1/chat/rooms/${roomId}/read`, {
          method: 'PUT', headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
        // 刷新聊聊未讀數
        setTimeout(() => window.dispatchEvent(new CustomEvent('chat-update')), 500);
      }
    }
  }, [roomId, fetchMessages, token]);

  // 初次載入完成後捲到底部
  useEffect(() => {
    if (messages.length > 0 && !initialScrollDone.current) {
      initialScrollDone.current = true;
      bottomRef.current?.scrollIntoView();
    }
  }, [messages]);

  // 新訊息（WebSocket）進來時捲到底部
  const prevMsgCount = useRef(0);
  useEffect(() => {
    if (messages.length > prevMsgCount.current && initialScrollDone.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMsgCount.current = messages.length;
  }, [messages.length]);

  // 往上滾到頂時載入更多
  function handleScroll() {
    const el = scrollRef.current;
    if (el && el.scrollTop < 50 && hasMore && !loadingMore) {
      loadMore();
    }
  }

  // STOMP 即時訂閱
  useEffect(() => {
    if (!roomId) return;
    const client = createStompClient(token ?? null);
    stompRef.current = client;
    client.onConnect = () => {
      client.subscribe(`/topic/rooms/${roomId}`, (frame) => {
        try {
          const msg: ChatMessage = JSON.parse(frame.body);
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (token) {
            fetch(`${CLIENT_BASE_URL}/api/v1/chat/rooms/${roomId}/read`, {
              method: 'PUT', headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
          }
        } catch { /* ignore */ }
      });
    };
    client.activate();
    return () => {
      stompRef.current = null;
      client.deactivate();
    };
  }, [roomId, token]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !roomId || !token) return;
    setSending(true);
    setError('');
    try {
      const stomp = stompRef.current;
      if (stomp?.connected) {
        stomp.publish({
          destination: `/app/chat.send/${roomId}`,
          body: JSON.stringify({ content: input.trim() }),
        });
        setInput('');
      } else {
        const res = await fetch(`${CLIENT_BASE_URL}/api/v1/chat/rooms/${roomId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ content: input.trim() }),
        });
        const json = await res.json();
        if (json.code === 200) {
          setMessages(prev => [...prev, json.data]);
          setInput('');
        } else if (json.code === 401) {
          dispatchAuthExpired();
        } else {
          setError(json.message ?? '發送失敗');
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  function handleClose() {
    if (roomId && token) {
      fetch(`${CLIENT_BASE_URL}/api/v1/chat/rooms/${roomId}/read`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    onClose();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div style={{
        width: '100%', maxWidth: 480, background: '#fff',
        borderRadius: '16px 16px 0 0', padding: '1rem',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: '#e6e6e6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.9rem', fontWeight: 700, color: '#828282', marginRight: '0.6rem',
          }}>
            {displayTarget.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1e1e1e', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              {displayTarget}
              {badge && (
                <span style={{ fontSize: '0.6rem', background: '#E6FCF5', color: '#047857', padding: '1px 4px', borderRadius: 3, fontWeight: 600 }}>{badge}</span>
              )}
            </p>
            <p style={{ fontSize: '0.72rem', color: '#bbb' }}>私人對話</p>
          </div>
          <button onClick={handleClose} style={{
            background: 'none', border: 'none', fontSize: '1.2rem',
            cursor: 'pointer', color: '#828282', padding: '0.25rem',
          }}>✕</button>
        </div>

        {/* 訊息列表 */}
        <div ref={scrollRef} onScroll={handleScroll} style={{
          flex: 1, overflowY: 'auto', padding: '0.5rem 0',
          display: 'flex', flexDirection: 'column', gap: '0.6rem',
          minHeight: 200,
        }}>
          {loadingMore && (
            <p style={{ textAlign: 'center', color: '#bbb', fontSize: '0.78rem', padding: '0.3rem' }}>載入更多...</p>
          )}
          {loading ? (
            <p style={{ textAlign: 'center', color: '#bbb', fontSize: '0.9rem' }}>載入中...</p>
          ) : error && !roomId ? (
            <p style={{ textAlign: 'center', color: '#e53e3e', fontSize: '0.85rem' }}>{error}</p>
          ) : messages.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#bbb', fontSize: '0.85rem' }}>
              傳訊息給 {displayTarget} 吧！
            </p>
          ) : messages.map(m => {
            const isSelf = user?.userId === m.userId;
            const name = m.nickname || (isSelf ? displaySelf : displayTarget);
            const time = new Date(m.createdAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={m.id} style={{
                display: 'flex', flexDirection: isSelf ? 'row-reverse' : 'row',
                gap: '0.4rem', alignItems: 'flex-end',
              }}>
                <div
                  onClick={() => { if (!isSelf) window.location.href = `/users/${m.userId}`; }}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: isSelf ? '#1c5373' : '#e6e6e6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 700,
                    color: isSelf ? '#fff' : '#828282',
                    cursor: isSelf ? 'default' : 'pointer',
                  }}>
                  {name.charAt(0).toUpperCase()}
                </div>
                <div style={{ maxWidth: '72%' }}>
                  <p style={{ fontSize: '0.7rem', color: '#bbb', marginBottom: '0.15rem', textAlign: isSelf ? 'right' : 'left' }}>
                    {name}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.35rem', flexDirection: isSelf ? 'row-reverse' : 'row' }}>
                    <div style={{
                      background: isSelf ? '#A6D785' : '#f0f4f7',
                      color: '#1a1a1a',
                      padding: '0.45rem 0.7rem',
                      borderRadius: isSelf ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      fontSize: '0.88rem', lineHeight: 1.5, wordBreak: 'break-word',
                    }}>
                      <MentionText text={m.content} />
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#bbb', whiteSpace: 'nowrap', flexShrink: 0 }}>{time}</span>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* 錯誤 */}
        {error && roomId && (
          <p style={{ color: '#e53e3e', fontSize: '0.78rem', marginBottom: '0.4rem' }}>{error}</p>
        )}

        {/* 輸入區 */}
        {roomId && (
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`傳訊給 ${displayTarget}...`}
              maxLength={500}
              disabled={sending}
              style={{
                flex: 1, padding: '0.55rem 0.75rem',
                border: '1px solid #e6e6e6', borderRadius: 8,
                fontSize: '0.9rem', outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              style={{
                background: input.trim() ? '#1c5373' : '#e6e6e6',
                color: input.trim() ? '#fff' : '#bbb',
                border: 'none', borderRadius: 8,
                padding: '0 1rem', fontSize: '0.9rem',
                cursor: input.trim() ? 'pointer' : 'default',
              }}
            >
              {sending ? '…' : '傳送'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
