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
  images?: string[] | null;
  createdAt: string;
}

interface ChatRoom {
  id: number;
  name: string;
  lastMessage: string | null;
  memberCount: number;
}

interface Props {
  neighborhoodId: number;
  neighborhoodName: string;
}

export default function ChatSection({ neighborhoodId, neighborhoodName }: Props) {
  const { user, token, nickname, showLoginModal } = useAuth();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [mentions, setMentions] = useState<MentionMap>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const stompRef = useRef<import('@stomp/stompjs').Client | null>(null);

  // 取得聊天室
  const fetchRoom = useCallback(async () => {
    const res = await fetch(`${CLIENT_BASE_URL}/api/v1/chat/rooms/${neighborhoodId}`);
    const json = await res.json();
    if (json.code === 200) setRoom(json.data);
  }, [neighborhoodId]);

  // 取得歷史訊息
  const fetchMessages = useCallback(async (roomId: number) => {
    const res = await fetch(`${CLIENT_BASE_URL}/api/v1/chat/rooms/${roomId}/messages?limit=50`);
    const json = await res.json();
    if (json.code === 200) setMessages(json.data ?? []);
  }, []);

  useEffect(() => {
    fetchRoom().finally(() => setLoading(false));
  }, [fetchRoom]);

  useEffect(() => {
    if (room) {
      fetchMessages(room.id);
      // 進入聊天室時標記已讀
      if (token) {
        fetch(`${CLIENT_BASE_URL}/api/v1/chat/rooms/${room.id}/read`, {
          method: 'PUT', headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
        setTimeout(() => window.dispatchEvent(new CustomEvent('chat-update')), 500);
      }
    }
  }, [room, fetchMessages]);

  // 捲到底部（只捲聊天框內部，不影響頁面捲動）
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // STOMP WebSocket 即時訂閱
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
          // 正在看聊天室，自動標記已讀
          if (token) {
            fetch(`${CLIENT_BASE_URL}/api/v1/chat/rooms/${room.id}/read`, {
              method: 'PUT', headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
          }
        } catch { /* ignore parse errors */ }
      });
    };
    client.activate();
    return () => {
      stompRef.current = null;
      client.deactivate();
    };
  }, [room, token]);

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !token) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (pendingImages.length >= 9) break;
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${CLIENT_BASE_URL}/api/v1/images/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const json = await res.json();
        if (json.code === 200 && json.data?.url) {
          setPendingImages(prev => [...prev, json.data.url]);
        }
      }
    } catch {
      setError('圖片上傳失敗');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() && pendingImages.length === 0) return;
    if (!token) return;
    if (!room) { setError('聊天室尚未載入，請重新整理'); return; }
    setSending(true);
    setError('');
    const payload: Record<string, unknown> = {
      content: applyMentions(input.trim(), mentions),
    };
    if (pendingImages.length > 0) payload.images = pendingImages;
    try {
      const stomp = stompRef.current;
      if (stomp?.connected) {
        stomp.publish({
          destination: `/app/chat.send/${room.id}`,
          body: JSON.stringify(payload),
        });
        setInput('');
        setPendingImages([]);
      } else {
        const res = await fetch(`${CLIENT_BASE_URL}/api/v1/chat/rooms/${room.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.code === 200) {
          setMessages(prev => [...prev, json.data]);
          setInput('');
          setPendingImages([]);
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
        <h2 className="section-title">💬 {room?.name ?? `${neighborhoodName} 聊聊`}</h2>
        <span style={{ fontSize: '0.75rem', color: '#bbb' }}>即時訊息</span>
      </div>

      {/* 訊息列表 */}
      <div ref={messagesRef} style={{
        background: '#fff', border: '1px solid #e6e6e6', borderRadius: 10,
        padding: '1rem',
        minHeight: 320,
        height: 'calc(100dvh - 320px)',
        maxHeight: 600,
        overflowY: 'auto', marginBottom: '0.75rem',
        display: 'flex', flexDirection: 'column', gap: '0.75rem',
      }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#bbb', fontSize: '0.9rem' }}>還沒有訊息，來打個招呼吧！</p>
          </div>
        ) : messages.map(m => (
          <MessageBubble
            key={m.id}
            msg={m}
            isSelf={user?.userId === m.userId}
            selfName={displayName}
          />
        ))}
      </div>

      {/* 輸入區 */}
      {user && token ? (
        <div>
          {/* 發言身份 */}
          <div style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: '#828282' }}>
              以 <strong style={{ color: '#1c5373' }}>{displayName}</strong> 身份發言
            </span>
          </div>

          {error && <p style={{ color: '#e53e3e', fontSize: '0.8rem', marginBottom: '0.4rem' }}>{error}</p>}

          {/* 待發送圖片預覽 */}
          {pendingImages.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              {pendingImages.map((url, i) => (
                <div key={i} style={{ position: 'relative', width: 60, height: 60 }}>
                  <img src={url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #e6e6e6' }} />
                  <button onClick={() => setPendingImages(prev => prev.filter((_, j) => j !== i))}
                    style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#e53e3e', color: '#fff', border: 'none', fontSize: '0.65rem', cursor: 'pointer', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple style={{ display: 'none' }} onChange={handleImageSelect} />
            <button type="button" disabled={uploading || pendingImages.length >= 9}
              onClick={() => fileInputRef.current?.click()}
              style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: pendingImages.length >= 9 ? 'default' : 'pointer', padding: '0.2rem', color: pendingImages.length >= 9 ? '#ccc' : '#1c5373' }}>
              {uploading ? '⏳' : '📷'}
            </button>
            <MentionInput
              value={input}
              onChange={setInput}
              onMentionsChange={setMentions}
              neighborhoodId={neighborhoodId}
              scope="li"
              placeholder="說點什麼..."
              maxLength={500}
              disabled={sending}
              onSubmit={() => handleSend(new Event('submit') as any)}
              style={{
                padding: '0.6rem 0.75rem',
                border: '1px solid #e6e6e6', borderRadius: 8,
              }}
            />
            <button
              type="submit"
              disabled={(!input.trim() && pendingImages.length === 0) || sending}
              style={{
                background: (input.trim() || pendingImages.length > 0) ? '#1c5373' : '#e6e6e6',
                color: (input.trim() || pendingImages.length > 0) ? '#fff' : '#bbb',
                border: 'none', borderRadius: 8,
                padding: '0 1rem', fontSize: '0.9rem',
                cursor: (input.trim() || pendingImages.length > 0) ? 'pointer' : 'default',
              }}
            >
              {sending ? '…' : '送出'}
            </button>
          </form>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '0.75rem' }}>
          <button
            onClick={() => showLoginModal(neighborhoodId)}
            style={{
              background: '#1c5373', color: '#fff',
              border: 'none', borderRadius: 8,
              padding: '0.5rem 1.5rem', fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            登入後即可聊天
          </button>
          {error && <p style={{ color: '#e53e3e', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg, isSelf, selfName }: { msg: ChatMessage; isSelf: boolean; selfName: string }) {
  const time = new Date(msg.createdAt).toLocaleTimeString('zh-TW', {
    hour: '2-digit', minute: '2-digit',
  });
  const senderName = isSelf ? selfName : (msg.nickname || `用戶 #${msg.userId}`);

  return (
    <div style={{ display: 'flex', flexDirection: isSelf ? 'row-reverse' : 'row', gap: '0.5rem', alignItems: 'flex-end' }}>
      {/* 頭像 */}
      <div
        onClick={() => { if (!isSelf) window.location.href = `/users/${msg.userId}`; }}
        style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: msg.avatarUrl ? undefined : (isSelf ? '#1c5373' : '#e6e6e6'),
          backgroundImage: msg.avatarUrl ? `url(${msg.avatarUrl})` : undefined,
          backgroundSize: 'cover', backgroundPosition: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', color: isSelf ? '#fff' : '#828282', fontWeight: 600,
          cursor: isSelf ? 'default' : 'pointer',
        }}>
        {!msg.avatarUrl && senderName.charAt(0).toUpperCase()}
      </div>

      <div style={{ maxWidth: '70%' }}>
        {/* 發送者名稱 + 徽章 */}
        <p style={{
          fontSize: '0.72rem', color: '#828282', marginBottom: '0.2rem',
          textAlign: isSelf ? 'right' : 'left',
          display: 'flex', alignItems: 'center', gap: '0.3rem',
          justifyContent: isSelf ? 'flex-end' : 'flex-start',
        }}>
          {senderName}
          {msg.authorBadge && (
            <span style={{
              fontSize: '0.6rem', background: '#E6FCF5', color: '#047857',
              padding: '1px 4px', borderRadius: 3, fontWeight: 600,
            }}>{msg.authorBadge}</span>
          )}
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', flexDirection: isSelf ? 'row-reverse' : 'row' }}>
          <div style={{
            background: isSelf ? '#A6D785' : '#f0f4f7',
            color: '#1a1a1a',
            padding: '0.5rem 0.75rem',
            borderRadius: isSelf ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
            fontSize: '0.9rem', lineHeight: 1.5, wordBreak: 'break-word',
          }}>
            {msg.content && <MentionText text={msg.content} />}
            {msg.images && msg.images.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: msg.content ? '0.4rem' : 0 }}>
                {msg.images.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt="" style={{ maxWidth: 200, maxHeight: 200, borderRadius: 6, objectFit: 'cover', cursor: 'pointer' }} />
                  </a>
                ))}
              </div>
            )}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#bbb', whiteSpace: 'nowrap', flexShrink: 0 }}>{time}</span>
        </div>
      </div>
    </div>
  );
}
