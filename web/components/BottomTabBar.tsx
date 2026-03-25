'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import { CLIENT_BASE_URL } from '@/lib/api';
import { IconHome, IconNewspaper, IconGroup, IconStore, IconChat } from './icons/TabIcons';

const ICON_SIZE = 24;
const ACTIVE_COLOR = '#D4911C';
const INACTIVE_COLOR = '#6B7280';

const NAV_ITEMS = [
  { key: 'home',      tab: 'home',      label: '主頁',  Icon: IconHome },
  { key: 'info',      tab: 'info',      label: '資訊',  Icon: IconNewspaper },
  { key: 'community', tab: 'community', label: '社群',  Icon: IconGroup },
  { key: 'shops',     tab: 'shops',     label: '店家',  Icon: IconStore },
  { key: 'chat',      tab: 'chat',      label: '聊聊',  Icon: IconChat },
];

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

function BottomTabBarInner() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const currentTab   = searchParams.get('tab') ?? 'home';
  const liInfo       = parseLiPath(pathname);
  const { token } = useAuth();
  const [chatUnread, setChatUnread] = useState(0);
  const roomIdsRef = useRef<number[]>([]);

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

  useEffect(() => {
    fetchRoomIds().then(() => fetchUnread());
  }, [fetchRoomIds, fetchUnread]);

  useEffect(() => {
    const onTotal = (e: Event) => setChatUnread((e as CustomEvent).detail ?? 0);
    const onUpdate = () => {
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
    <nav className="bottom-tab-bar">
      {NAV_ITEMS.map(item => {
        let href: string;
        let isActive: boolean;

        if (liInfo && item.tab) {
          const base = `/${encodeURIComponent(liInfo.city)}/${encodeURIComponent(liInfo.district)}/${encodeURIComponent(liInfo.li)}`;
          href     = item.tab === 'home' ? base : `${base}?tab=${item.tab}`;
          isActive = currentTab === item.tab;
        } else {
          href     = '/';
          isActive = false;
        }

        const color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;

        return (
          <Link key={item.key} href={href} className={`bottom-tab-item${isActive ? ' active' : ''}`}>
            <span className="bottom-tab-icon">
              <item.Icon size={ICON_SIZE} color={color} />
            </span>
            <span className="bottom-tab-label">{item.label}</span>
            {item.key === 'chat' && chatUnread > 0 && (
              <span className="bottom-tab-badge">
                {chatUnread > 99 ? '99+' : chatUnread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export default function BottomTabBar() {
  return (
    <Suspense fallback={null}>
      <BottomTabBarInner />
    </Suspense>
  );
}
