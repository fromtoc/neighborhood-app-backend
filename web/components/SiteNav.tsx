'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import { CLIENT_BASE_URL } from '@/lib/api';

const NAV_ITEMS = [
  { key: 'home',      href: '/',          tab: 'home',      label: '主頁',  icon: '🏠' },
  { key: 'info',      href: '/news',       tab: 'info',      label: '資訊',  icon: '📰' },
  { key: 'community', href: '/community',  tab: 'community', label: '社群',  icon: '👥' },
  { key: 'shops',     href: '/shops',      tab: 'shops',     label: '店家',  icon: '🏪' },
  { key: 'chat',      href: '/chat',       tab: 'chat',      label: '聊聊',  icon: '💬' },
];

// 判斷是否在里頁面（3段 dynamic path）
function parseLiPath(pathname: string): { city: string; district: string; li: string } | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 3) {
    return {
      city:     decodeURIComponent(parts[0]),
      district: decodeURIComponent(parts[1]),
      li:       decodeURIComponent(parts[2]),
    };
  }
  return null;
}

function NavInner() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const currentTab   = searchParams.get('tab') ?? 'home';
  const liInfo       = parseLiPath(pathname);
  const { token } = useAuth();
  const [chatUnread, setChatUnread] = useState(0);
  const roomIdsRef = useRef<number[]>([]);

  // 取得所有聊天室 ID（只在里變化時重新取）
  const fetchRoomIds = useCallback(async () => {
    if (!token || !liInfo) return;
    try {
      const ids: number[] = [];
      const [geoRes, distRes, privateRes] = await Promise.all([
        fetch(`${CLIENT_BASE_URL}/api/v1/geo/li?city=${encodeURIComponent(liInfo.city)}&district=${encodeURIComponent(liInfo.district)}&li=${encodeURIComponent(liInfo.li)}`).then(r => r.json()),
        fetch(`${CLIENT_BASE_URL}/api/v1/chat/rooms/district?city=${encodeURIComponent(liInfo.city)}&district=${encodeURIComponent(liInfo.district)}`).then(r => r.json()),
        fetch(`${CLIENT_BASE_URL}/api/v1/chat/private/rooms`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ]);
      const nhId = geoRes.data?.id;
      if (nhId) {
        const liRoom = await fetch(`${CLIENT_BASE_URL}/api/v1/chat/rooms/${nhId}`).then(r => r.json());
        if (liRoom.code === 200 && liRoom.data?.id) ids.push(liRoom.data.id);
      }
      if (distRes.code === 200 && distRes.data?.id) ids.push(distRes.data.id);
      if (privateRes.code === 200 && Array.isArray(privateRes.data)) {
        privateRes.data.forEach((r: any) => ids.push(r.id));
      }
      roomIdsRef.current = ids;
    } catch {}
  }, [token, liInfo?.city, liInfo?.district, liInfo?.li]);

  // 查未讀數
  const fetchUnread = useCallback(async () => {
    if (!token || roomIdsRef.current.length === 0) return;
    try {
      const res = await fetch(
        `${CLIENT_BASE_URL}/api/v1/chat/unread-counts?roomIds=${roomIdsRef.current.join(',')}`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).then(r => r.json());
      if (res.code === 200) {
        const total = Object.values(res.data as Record<string, number>).reduce((s: number, n: number) => s + n, 0);
        setChatUnread(total);
      }
    } catch {}
  }, [token]);

  // 初始化 room IDs 後查未讀
  useEffect(() => {
    fetchRoomIds().then(() => fetchUnread());
  }, [fetchRoomIds, fetchUnread]);

  // 監聽事件 + 定期刷新
  useEffect(() => {
    const onTotal = (e: Event) => setChatUnread((e as CustomEvent).detail ?? 0);
    const onUpdate = () => {
      // 如果 roomIds 還沒初始化，先初始化再查
      if (roomIdsRef.current.length === 0) {
        fetchRoomIds().then(() => fetchUnread());
      } else {
        fetchUnread();
      }
    };
    window.addEventListener('chat-unread-total', onTotal);
    window.addEventListener('chat-update', onUpdate);
    const interval = setInterval(onUpdate, 30000);
    return () => {
      window.removeEventListener('chat-unread-total', onTotal);
      window.removeEventListener('chat-update', onUpdate);
      clearInterval(interval);
    };
  }, [fetchUnread, fetchRoomIds]);

  return (
    <nav className="site-nav">
      {NAV_ITEMS.map(item => {
        let href: string;
        let isActive: boolean;

        if (liInfo && item.tab) {
          const base = `/${encodeURIComponent(liInfo.city)}/${encodeURIComponent(liInfo.district)}/${encodeURIComponent(liInfo.li)}`;
          href     = item.tab === 'home' ? base : `${base}?tab=${item.tab}`;
          isActive = currentTab === item.tab;
        } else {
          href     = item.href;
          isActive = pathname === item.href;
        }

        return (
          <Link key={item.key} href={href} className={isActive ? 'active' : ''} style={{ position: 'relative' }}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
            {item.key === 'chat' && chatUnread > 0 && (
              <span style={{
                position: 'absolute', top: -2, right: -6,
                background: '#ef4444', color: '#fff',
                borderRadius: '50%', fontSize: '0.58rem', fontWeight: 700,
                minWidth: 16, height: 16,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', lineHeight: 1,
              }}>
                {chatUnread > 99 ? '99+' : chatUnread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export default function SiteNav() {
  return (
    <Suspense fallback={<nav className="site-nav" />}>
      <NavInner />
    </Suspense>
  );
}
