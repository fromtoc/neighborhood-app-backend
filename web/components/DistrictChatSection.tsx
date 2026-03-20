'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import { CLIENT_BASE_URL } from '@/lib/api';
import { dispatchAuthExpired } from '@/lib/auth-client';
import { createStompClient } from '@/lib/stomp-client';
import MentionInput, { applyMentions, type MentionMap } from './MentionInput';
import MentionText from './MentionText';

interface ChatMessage {
  id: number;
  roomId: number;
  userId: number;
  nickname: string | null;
  authorBadge?: string | null;
  avatarUrl?: string | null;
  content: string;
  type: string;
  createdAt: string;
}

interface ChatRoom {
  id: number;
  name: string;
  lastMessage: string | null;
  memberCount: number;
}

interface Props {
  city: string;
  district: string;
  neighborhoodId: number;
}

export default function DistrictChatSection({ city, district, neighborhoodId }: Props) {
  const { user, token, nickname, showLoginModal } = useAuth();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [mentions, setMentions] = useState<MentionMap>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesRef = useRef<HTMLDivElement>(null);
  const stompRef = useRef<import('@stomp/stompjs').Client | null>(null);

  const fetchRoom = useCallback(async () => {
    const res = await fetch(
      `${CLIENT_BASE_URL}/api/v1/chat/rooms/district?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`
    );
    const json = await res.json();
    if (json.code === 200) setRoom(json.data);
  }, [city, district]);

  const fetchMessages = useCallback(async (roomId: number) => {
    const res = await fetch(`${CLIENT_BASE_URL}/api/v1/chat/rooms/${roomId}/messages?limit=50`);
    const json = await res.json();
    if (json.code === 200) setMessages(json.data ?? []);
  }, []);

  useEffect(() => { fetchRoom().finally(() => setLoading(false)); }, [fetchRoom]);
  useEffect(() => {
    if (room) {
      fetchMessages(room.id);
      if (token) {
        fetch(`${CLIENT_BASE_URL}/api/v1/chat/rooms/${room.id}/read`, {
          method: 'PUT', headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    }
  }, [room, fetchMessages, token]);
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!room) return;
    const client = createStompClient(token ?? null);
    stompRef.current = client;
    client.onConnect = () => {
      client.subscribe(`/topic/rooms/${room.id}`, (frame) => {
        try {
          const msg: ChatMessage = JSON.parse(frame.body);
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (token) {
            fetch(`${CLIENT_BASE_URL}/api/v1/chat/rooms/${room.id}/read`, {
              method: 'PUT', headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
          }
        } catch { /* ignore */ }
      });
    };
    client.activate();
    return () => { stompRef.current = null; client.deactivate(); };
  }, [room, token]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !token) return;
    if (!room) { setError('聊天室尚未載入，請重新整理'); return; }
    setSending(true);
    setError('');
    try {
      const stomp = stompRef.current;
      if (stomp?.connected) {
        stomp.publish({
          destination: `/app/chat.send/${room.id}`,
          body: JSON.stringify({ content: applyMentions(input.trim(), mentions) }),
        });
        setInput('');
      } else {
        const res = await fetch(`${CLIENT_BASE_URL}/api/v1/chat/rooms/${room.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ content: applyMentions(input.trim(), mentions) }),
        });
        const json = await res.json();
        if (json.code === 200) {
          setMessages(prev => [...prev, json.data]);
          setInput('');
        } else if (json.code === 401) {
          dispatchAuthExpired();
        } else {
          setError(`發送失敗（${json.code}）：${json.message ?? '未知錯誤'}`);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  const isGuest = user?.role === 'GUEST';
  const displayName = isGuest
    ? `訪客 #${user?.userId ?? '?'}`
    : (nickname || `用戶 #${user?.userId ?? '?'}`);

  if (loading) return <div className="empty-state"><p style={{ color: '#bbb' }}>載入中...</p></div>;

  return (
    <div className="section">
      <div className="section-header">
        <h2 className="section-title">{room?.name ?? `${city}${district} 聊聊`}</h2>
        <span style={{ fontSize: '0.75rem', color: '#bbb' }}>即時訊息</span>
      </div>

      <div ref={messagesRef} style={{
        background: '#fff', border: '1px solid #e6e6e6', borderRadius: 10,
        padding: '1rem', minHeight: 320, height: 'calc(100dvh - 320px)',
        maxHeight: 600, overflowY: 'auto', marginBottom: '0.75rem',
        display: 'flex', flexDirection: 'column', gap: '0.75rem',
      }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#bbb', fontSize: '0.9rem' }}>還沒有訊息，來打個招呼吧！</p>
          </div>
        ) : messages.map(m => (
          <MessageBubble key={m.id} msg={m} isSelf={user?.userId === m.userId} selfName={displayName} />
        ))}
      </div>

      {user && token ? (
        <div>
          <div style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: '#828282' }}>
              以 <strong style={{ color: '#1c5373' }}>{displayName}</strong> 身份發言
            </span>
          </div>
          {error && <p style={{ color: '#e53e3e', fontSize: '0.8rem', marginBottom: '0.4rem' }}>{error}</p>}
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
            <MentionInput value={input} onChange={setInput}
              onMentionsChange={setMentions}
              neighborhoodId={neighborhoodId} scope="district"
              placeholder="說點什麼..." maxLength={500} disabled={sending}
              onSubmit={() => handleSend(new Event('submit') as any)}
              style={{ padding: '0.6rem 0.75rem', border: '1px solid #e6e6e6', borderRadius: 8 }} />
            <button type="submit" disabled={!input.trim() || sending}
              style={{ background: input.trim() ? '#1c5373' : '#e6e6e6', color: input.trim() ? '#fff' : '#bbb',
                border: 'none', borderRadius: 8, padding: '0 1rem', fontSize: '0.9rem', cursor: input.trim() ? 'pointer' : 'default' }}>
              {sending ? '…' : '送出'}
            </button>
          </form>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '0.75rem' }}>
          <button onClick={() => showLoginModal(0)}
            style={{ background: '#1c5373', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
            登入後即可聊天
          </button>
          {error && <p style={{ color: '#e53e3e', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg, isSelf, selfName }: { msg: ChatMessage; isSelf: boolean; selfName: string }) {
  const time = new Date(msg.createdAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  const senderName = isSelf ? selfName : (msg.nickname || `用戶 #${msg.userId}`);
  return (
    <div style={{ display: 'flex', flexDirection: isSelf ? 'row-reverse' : 'row', gap: '0.5rem', alignItems: 'flex-end' }}>
      <div onClick={() => { if (!isSelf) window.location.href = `/users/${msg.userId}`; }}
        style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: msg.avatarUrl ? undefined : (isSelf ? '#1c5373' : '#e6e6e6'),
        backgroundImage: msg.avatarUrl ? `url(${msg.avatarUrl})` : undefined,
        backgroundSize: 'cover', backgroundPosition: 'center',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.75rem', color: isSelf ? '#fff' : '#828282', fontWeight: 600, cursor: isSelf ? 'default' : 'pointer' }}>
        {!msg.avatarUrl && senderName.charAt(0).toUpperCase()}
      </div>
      <div style={{ maxWidth: '70%' }}>
        <p style={{ fontSize: '0.72rem', color: '#828282', marginBottom: '0.2rem', textAlign: isSelf ? 'right' : 'left', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: isSelf ? 'flex-end' : 'flex-start' }}>
          {senderName}
          {msg.authorBadge && (
            <span style={{ fontSize: '0.6rem', background: '#E6FCF5', color: '#047857', padding: '1px 4px', borderRadius: 3, fontWeight: 600 }}>{msg.authorBadge}</span>
          )}
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', flexDirection: isSelf ? 'row-reverse' : 'row' }}>
          <div style={{ background: isSelf ? '#A6D785' : '#f0f4f7', color: '#1a1a1a',
            padding: '0.5rem 0.75rem', borderRadius: isSelf ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
            fontSize: '0.9rem', lineHeight: 1.5, wordBreak: 'break-word' }}><MentionText text={msg.content} /></div>
          <span style={{ fontSize: '0.68rem', color: '#bbb', whiteSpace: 'nowrap', flexShrink: 0 }}>{time}</span>
        </div>
      </div>
    </div>
  );
}
