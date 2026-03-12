'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

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
          <Link key={item.key} href={href} className={isActive ? 'active' : ''}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
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
