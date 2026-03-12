'use client';

import { useCallback, useEffect, useState } from 'react';
import ChatSection from './ChatSection';
import DistrictChatSection from './DistrictChatSection';
import PrivateChatModal from './PrivateChatModal';
import { useAuth } from './AuthProvider';
import { CLIENT_BASE_URL } from '@/lib/api';

interface Props {
  neighborhoodId: number;
  neighborhoodName: string;
  city: string;
  district: string;
}

interface PrivateRoom {
  id: number;
  user1Id: number;
  user2Id: number;
  otherNickname: string | null;
  lastMessage: string | null;
  lastMessageNickname: string | null;
  lastMessageAt: string | null;
}

type View = 'list' | 'district' | 'li' | 'private';

function formatUnread(n: number): string {
  if (n > 999) return '999+';
  return String(n);
}

function timeLabel(at: string | null): string {
  if (!at) return '';
  const d = new Date(at);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays} 天前`;
  return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
}

export default function ChatTabSection({ neighborhoodId, neighborhoodName, city, district }: Props) {
  const { user, token, showLoginModal } = useAuth();
  const [view, setView] = useState<View>('list');
  const [privateRooms, setPrivateRooms] = useState<PrivateRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
  const [districtRoom, setDistrictRoom] = useState<{ id: number; lastMessage: string | null; lastMessageNickname: string | null; lastMessageUserId: number | null; lastMessageAt: string | null } | null>(null);
  const [liRoom, setLiRoom] = useState<{ id: number; lastMessage: string | null; lastMessageNickname: string | null; lastMessageUserId: number | null; lastMessageAt: string | null } | null>(null);
  const [openPrivateTargetId, setOpenPrivateTargetId] = useState<number | null>(null);

  const districtRoomId = districtRoom?.id ?? null;
  const liRoomId = liRoom?.id ?? null;

  // Fetch district & li rooms
  useEffect(() => {
    fetch(`${CLIENT_BASE_URL}/api/v1/chat/rooms/district?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`)
      .then(r => r.json())
      .then(json => {
        if (json.code === 200 && json.data)
          setDistrictRoom({ id: json.data.id, lastMessage: json.data.lastMessage, lastMessageNickname: json.data.lastMessageNickname, lastMessageUserId: json.data.lastMessageUserId, lastMessageAt: json.data.lastMessageAt });
      })
      .catch(() => {});
    fetch(`${CLIENT_BASE_URL}/api/v1/chat/rooms/${neighborhoodId}`)
      .then(r => r.json())
      .then(json => {
        if (json.code === 200 && json.data)
          setLiRoom({ id: json.data.id, lastMessage: json.data.lastMessage, lastMessageNickname: json.data.lastMessageNickname, lastMessageUserId: json.data.lastMessageUserId, lastMessageAt: json.data.lastMessageAt });
      })
      .catch(() => {});
  }, [city, district, neighborhoodId]);

  // Fetch private rooms
  const fetchPrivateRooms = useCallback(() => {
    if (!user || !token || user.role === 'GUEST') return;
    setLoadingRooms(true);
    fetch(`${CLIENT_BASE_URL}/api/v1/chat/private/rooms`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => { if (json.code === 200) setPrivateRooms(json.data ?? []); })
      .finally(() => setLoadingRooms(false));
  }, [user, token]);

  useEffect(() => { fetchPrivateRooms(); }, [fetchPrivateRooms]);

  // Fetch unread counts
  const fetchUnread = useCallback(() => {
    if (!token) return;
    const roomIds: number[] = [];
    if (districtRoomId) roomIds.push(districtRoomId);
    if (liRoomId) roomIds.push(liRoomId);
    privateRooms.forEach(r => roomIds.push(r.id));
    if (roomIds.length === 0) return;
    fetch(`${CLIENT_BASE_URL}/api/v1/chat/unread-counts?roomIds=${roomIds.join(',')}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => { if (json.code === 200) setUnreadCounts(json.data ?? {}); })
      .catch(() => {});
  }, [token, districtRoomId, liRoomId, privateRooms]);

  useEffect(() => { fetchUnread(); }, [fetchUnread]);

  // Refresh unread on interval
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread, token]);

  // Mark read + return to list
  const handleBackFromChat = (roomId: number | null) => {
    if (roomId && token) {
      // Optimistically clear unread count
      setUnreadCounts(prev => ({ ...prev, [roomId]: 0 }));
      fetch(`${CLIENT_BASE_URL}/api/v1/chat/rooms/${roomId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setView('list');
  };

  // District chat view
  if (view === 'district') {
    return (
      <div>
        <button onClick={() => handleBackFromChat(districtRoomId)} style={backBtnStyle}>
          ← 返回
        </button>
        <DistrictChatSection city={city} district={district} />
      </div>
    );
  }

  // Li chat view
  if (view === 'li') {
    return (
      <div>
        <button onClick={() => handleBackFromChat(liRoomId)} style={backBtnStyle}>
          ← 返回
        </button>
        <ChatSection neighborhoodId={neighborhoodId} neighborhoodName={neighborhoodName} />
      </div>
    );
  }

  const getOtherUserId = (room: PrivateRoom) =>
    room.user1Id === user?.userId ? room.user2Id : room.user1Id;

  const totalPrivateUnread = privateRooms.reduce((sum, r) => sum + (unreadCounts[r.id] ?? 0), 0);

  return (
    <div>
      {/* 公開聊天室 Section */}
      <div style={{ marginBottom: '16px' }}>
        <div style={sectionHeaderStyle}>公開聊天室</div>

        {/* 區來聊聊 */}
        <button onClick={() => {
          if (!user || !token || user.role === 'GUEST') { showLoginModal(neighborhoodId); return; }
          setView('district');
        }} style={chatItemStyle}>
          <div style={{ ...groupAvatarStyle, background: '#C8A951' }}>🌐</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={chatNameStyle}>{district} 來聊聊</div>
            <div style={chatPreviewStyle}>
              {districtRoom?.lastMessage
                ? `${districtRoom.lastMessageNickname ?? ''}：${districtRoom.lastMessage}`
                : '還沒有訊息'}
            </div>
          </div>
          <div style={chatRightStyle}>
            {districtRoom?.lastMessageAt && (
              <span style={{ fontSize: '0.72rem', color: '#bbb' }}>
                {timeLabel(districtRoom.lastMessageAt)}
              </span>
            )}
            {districtRoomId && (unreadCounts[districtRoomId] ?? 0) > 0 && districtRoom?.lastMessageUserId !== user?.userId && (
              <span style={unreadBadgeStyle}>{formatUnread(unreadCounts[districtRoomId])}</span>
            )}
          </div>
        </button>

        {/* 里來聊聊 */}
        <button onClick={() => {
          if (!user || !token || user.role === 'GUEST') { showLoginModal(neighborhoodId); return; }
          setView('li');
        }} style={chatItemStyle}>
          <div style={{ ...groupAvatarStyle, background: '#1c5373' }}>👥</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={chatNameStyle}>{neighborhoodName} 來聊聊</div>
            <div style={chatPreviewStyle}>
              {liRoom?.lastMessage
                ? `${liRoom.lastMessageNickname ?? ''}：${liRoom.lastMessage}`
                : '還沒有訊息'}
            </div>
          </div>
          <div style={chatRightStyle}>
            {liRoom?.lastMessageAt && (
              <span style={{ fontSize: '0.72rem', color: '#bbb' }}>
                {timeLabel(liRoom.lastMessageAt)}
              </span>
            )}
            {liRoomId && (unreadCounts[liRoomId] ?? 0) > 0 && liRoom?.lastMessageUserId !== user?.userId && (
              <span style={unreadBadgeStyle}>{formatUnread(unreadCounts[liRoomId])}</span>
            )}
          </div>
        </button>
      </div>

      {/* 私人訊息 Section */}
      <div>
        <div style={{ ...sectionHeaderStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
          私人訊息
          {totalPrivateUnread > 0 && (
            <span style={{ ...unreadBadgeStyle, fontSize: '0.7rem' }}>
              {formatUnread(totalPrivateUnread)}
            </span>
          )}
        </div>

        {!user || user.role === 'GUEST' ? (
          <div style={{
            background: '#f9f9f9', borderRadius: 12, padding: '1.5rem',
            textAlign: 'center', color: '#828282', fontSize: '0.88rem',
          }}>
            <p style={{ marginBottom: '0.75rem' }}>
              {user ? '私訊功能需要第三方登入（Google / LINE）' : '登入後查看私人訊息'}
            </p>
            <button onClick={() => showLoginModal(neighborhoodId)} style={{
              background: '#1c5373', color: '#fff', border: 'none',
              borderRadius: 8, padding: '0.45rem 1.2rem', fontSize: '0.9rem', cursor: 'pointer',
            }}>
              {user ? '升級登入' : '登入'}
            </button>
          </div>
        ) : loadingRooms ? (
          <p style={{ color: '#bbb', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>載入中...</p>
        ) : privateRooms.length === 0 ? (
          <div style={{
            background: '#f9f9f9', borderRadius: 12, padding: '1.5rem',
            textAlign: 'center', color: '#bbb', fontSize: '0.88rem',
          }}>
            還沒有私訊。在社群貼文上點「私聊」開始對話！
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {privateRooms.map(room => {
              const otherId = getOtherUserId(room);
              const otherName = room.otherNickname || `用戶 #${otherId}`;
              const unread = unreadCounts[room.id] ?? 0;
              return (
                <button key={room.id} onClick={() => setOpenPrivateTargetId(otherId)} style={chatItemStyle}>
                  <div style={privateAvatarStyle}>
                    {otherName.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={chatNameStyle}>{otherName}</span>
                    </div>
                    <div style={chatPreviewStyle}>
                      {room.lastMessage ?? '開始對話吧！'}
                    </div>
                  </div>
                  <div style={chatRightStyle}>
                    {room.lastMessageAt && (
                      <span style={{ fontSize: '0.72rem', color: '#bbb' }}>
                        {timeLabel(room.lastMessageAt)}
                      </span>
                    )}
                    {unread > 0 && (
                      <span style={unreadBadgeStyle}>{formatUnread(unread)}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {openPrivateTargetId !== null && (
        <PrivateChatModal
          targetUserId={openPrivateTargetId}
          targetNickname={privateRooms.find(r => getOtherUserId(r) === openPrivateTargetId)?.otherNickname}
          onClose={() => {
            const room = privateRooms.find(r => getOtherUserId(r) === openPrivateTargetId);
            if (room && token) {
              setUnreadCounts(prev => ({ ...prev, [room.id]: 0 }));
              fetch(`${CLIENT_BASE_URL}/api/v1/chat/rooms/${room.id}/read`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
              }).catch(() => {});
            }
            setOpenPrivateTargetId(null);
            fetchPrivateRooms();
          }}
        />
      )}
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────── */

const backBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#1c5373',
  fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
  padding: '0.5rem 0', marginBottom: '0.5rem',
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: '0.82rem', fontWeight: 600, color: '#999',
  padding: '8px 0',
};

const chatItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '12px',
  padding: '14px 0', width: '100%',
  background: 'none', border: 'none',
  borderBottom: '1px solid #f0f0f0',
  cursor: 'pointer', textAlign: 'left',
};

const groupAvatarStyle: React.CSSProperties = {
  width: 48, height: 48, borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '1.3rem', flexShrink: 0,
};

const privateAvatarStyle: React.CSSProperties = {
  width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
  background: '#e6e6e6', display: 'flex', alignItems: 'center',
  justifyContent: 'center', fontSize: '1.1rem', color: '#828282', fontWeight: 700,
};

const chatNameStyle: React.CSSProperties = {
  fontSize: '0.95rem', fontWeight: 600, color: '#1e1e1e',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

const chatPreviewStyle: React.CSSProperties = {
  fontSize: '0.82rem', color: '#828282', marginTop: '2px',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

const chatRightStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
  justifyContent: 'space-between', gap: '6px', flexShrink: 0,
  paddingTop: '2px', paddingBottom: '2px',
};

const unreadBadgeStyle: React.CSSProperties = {
  background: '#EF4444', color: '#fff',
  minWidth: 20, height: 20, borderRadius: 10,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  paddingLeft: 6, paddingRight: 6,
  fontSize: '0.68rem', fontWeight: 700,
};
