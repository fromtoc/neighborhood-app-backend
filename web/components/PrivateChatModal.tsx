'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import { CLIENT_BASE_URL } from '@/lib/api';
import { dispatchAuthExpired } from '@/lib/auth-client';
import { createStompClient } from '@/lib/stomp-client';

interface ChatMessage {
  id: number;
  roomId: number;
  userId: number;
  nickname: string | null;
  content: string;
  type: string;
  createdAt: string;
}

interface Props {
  targetUserId: number;
  targetNickname?: string | null;
  onClose: () => void;
}

export default function PrivateChatModal({ targetUserId, targetNickname, onClose }: Props) {
  const { user, token, nickname } = useAuth();
  const [roomId, setRoomId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const stompRef = useRef<import('@stomp/stompjs').Client | null>(null);

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
        if (json.code === 200) setRoomId(json.data.id);
        else setError(json.message ?? '無法開啟私聊');
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, targetUserId]);

  // 取得訊息
  const fetchMessages = useCallback(async (rid: number) => {
    const res = await fetch(`${CLIENT_BASE_URL}/api/v1/chat/rooms/${rid}/messages?limit=50`);
    const json = await res.json();
    if (json.code === 200) setMessages(json.data ?? []);
  }, []);

  useEffect(() => {
    if (roomId) fetchMessages(roomId);
  }, [roomId, fetchMessages]);

  // 捲到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
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
            <p style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1e1e1e' }}>{displayTarget}</p>
            <p style={{ fontSize: '0.72rem', color: '#bbb' }}>私人對話</p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '1.2rem',
            cursor: 'pointer', color: '#828282', padding: '0.25rem',
          }}>✕</button>
        </div>

        {/* 訊息列表 */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '0.5rem 0',
          display: 'flex', flexDirection: 'column', gap: '0.6rem',
          minHeight: 200,
        }}>
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
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: isSelf ? '#1c5373' : '#e6e6e6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 700,
                  color: isSelf ? '#fff' : '#828282',
                }}>
                  {name.charAt(0).toUpperCase()}
                </div>
                <div style={{ maxWidth: '72%' }}>
                  <p style={{ fontSize: '0.7rem', color: '#bbb', marginBottom: '0.15rem', textAlign: isSelf ? 'right' : 'left' }}>
                    {name}
                  </p>
                  <div style={{
                    background: isSelf ? '#1c5373' : '#f0f4f7',
                    color: isSelf ? '#fff' : '#1e1e1e',
                    padding: '0.45rem 0.7rem',
                    borderRadius: isSelf ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    fontSize: '0.88rem', lineHeight: 1.5, wordBreak: 'break-word',
                  }}>
                    {m.content}
                  </div>
                  <p style={{ fontSize: '0.68rem', color: '#bbb', marginTop: '0.15rem', textAlign: isSelf ? 'right' : 'left' }}>
                    {time}
                  </p>
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
