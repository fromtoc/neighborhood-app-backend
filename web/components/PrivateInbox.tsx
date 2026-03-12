'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import PrivateChatModal from './PrivateChatModal';
import { CLIENT_BASE_URL } from '@/lib/api';

interface PrivateRoom {
  id: number;
  user1Id: number;
  user2Id: number;
  otherNickname: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
}

function formatUnread(n: number): string {
  if (n > 999) return '999+';
  return String(n);
}

export default function PrivateInbox() {
  const { user, token, showLoginModal } = useAuth();
  const [rooms, setRooms] = useState<PrivateRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [openRoomTargetId, setOpenRoomTargetId] = useState<number | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});

  const fetchRooms = useCallback(() => {
    if (!user || !token || user.role === 'GUEST') return;
    setLoading(true);
    fetch(`${CLIENT_BASE_URL}/api/v1/chat/private/rooms`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => { if (json.code === 200) setRooms(json.data ?? []); })
      .finally(() => setLoading(false));
  }, [user, token]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  // Fetch unread counts
  const fetchUnread = useCallback(() => {
    if (!token || rooms.length === 0) return;
    const roomIds = rooms.map(r => r.id);
    fetch(`${CLIENT_BASE_URL}/api/v1/chat/unread-counts?roomIds=${roomIds.join(',')}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => { if (json.code === 200) setUnreadCounts(json.data ?? {}); })
      .catch(() => {});
  }, [token, rooms]);

  useEffect(() => { fetchUnread(); }, [fetchUnread]);

  // Refresh unread on interval
  useEffect(() => {
    if (!token || rooms.length === 0) return;
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread, token, rooms]);

  // 不是 USER 身份
  if (!user || user.role === 'GUEST') {
    return (
      <div style={{ textAlign: 'center', padding: '1.5rem', background: '#f9f9f9', borderRadius: 12, marginTop: '1.5rem' }}>
        <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>✉️</p>
        <p style={{ color: '#828282', fontSize: '0.9rem', marginBottom: '1rem' }}>
          {user ? '私訊功能需要第三方登入（Google / LINE）' : '登入後查看私人訊息'}
        </p>
        <button
          onClick={() => showLoginModal()}
          style={{
            background: '#1c5373', color: '#fff', border: 'none',
            borderRadius: 8, padding: '0.45rem 1.2rem',
            fontSize: '0.9rem', cursor: 'pointer',
          }}
        >
          {user ? '升級登入' : '登入'}
        </button>
      </div>
    );
  }

  const getOtherUserId = (room: PrivateRoom) =>
    room.user1Id === user.userId ? room.user2Id : room.user1Id;

  const timeLabel = (at: string | null) => {
    if (!at) return '';
    const d = new Date(at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays} 天前`;
    return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1e1e', marginBottom: '0.75rem' }}>
        ✉️ 私人訊息
      </h2>

      {loading ? (
        <p style={{ color: '#bbb', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>載入中...</p>
      ) : rooms.length === 0 ? (
        <div style={{
          background: '#f9f9f9', borderRadius: 12, padding: '1.5rem',
          textAlign: 'center', color: '#bbb', fontSize: '0.88rem',
        }}>
          還沒有私訊。在社群貼文上點「私聊」開始對話！
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {rooms.map(room => {
            const otherId = getOtherUserId(room);
            const otherName = room.otherNickname || `用戶 #${otherId}`;
            const unread = unreadCounts[room.id] ?? 0;
            return (
              <button
                key={room.id}
                onClick={() => setOpenRoomTargetId(otherId)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem', background: unread > 0 ? '#f8faff' : '#fff',
                  border: '1px solid #e6e6e6', borderRadius: 12,
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                {/* 頭像 */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: '#e6e6e6', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '1rem', color: '#828282', fontWeight: 700,
                }}>
                  {otherName.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e1e1e', marginBottom: '0.15rem' }}>
                    {otherName}
                  </p>
                  <p style={{
                    fontSize: '0.8rem', color: '#828282',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontWeight: unread > 0 ? 600 : 400,
                  }}>
                    {room.lastMessage ?? '開始對話吧！'}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                  {room.lastMessageAt && (
                    <span style={{ fontSize: '0.72rem', color: '#bbb' }}>
                      {timeLabel(room.lastMessageAt)}
                    </span>
                  )}
                  {unread > 0 && (
                    <span style={{
                      background: '#EF4444', color: '#fff',
                      minWidth: 20, height: 20, borderRadius: 10,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      paddingLeft: 6, paddingRight: 6,
                      fontSize: '0.68rem', fontWeight: 700,
                    }}>
                      {formatUnread(unread)}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {openRoomTargetId !== null && (
        <PrivateChatModal
          targetUserId={openRoomTargetId}
          targetNickname={rooms.find(r => getOtherUserId(r) === openRoomTargetId)?.otherNickname}
          onClose={() => {
            const room = rooms.find(r => getOtherUserId(r) === openRoomTargetId);
            if (room && token) {
              fetch(`${CLIENT_BASE_URL}/api/v1/chat/rooms/${room.id}/read`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
              }).catch(() => {});
            }
            setOpenRoomTargetId(null);
            fetchUnread();
            fetchRooms();
          }}
        />
      )}
    </div>
  );
}
