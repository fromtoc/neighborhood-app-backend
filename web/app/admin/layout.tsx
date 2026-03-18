'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

const NAV_ITEMS = [
  { icon: '📊', label: '總覽', href: '/admin' },
  { icon: '👥', label: '用戶管理', href: '/admin/users' },
  { icon: '🏠', label: '里長管理', href: '/admin/li-chiefs' },
  { icon: '📝', label: '貼文管理', href: '/admin/posts' },
  { icon: '🚀', label: '版本發佈', href: '/admin/releases' },
  { icon: '📈', label: '數據分析', href: '/admin/analytics' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  if (!user || !isAdmin) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#bbb' }}>
        {!user ? '請先登入' : '需要管理員權限'}
      </div>
    );
  }

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  }

  return (
    <>
      <style>{`
        .admin-layout { display: flex; min-height: calc(100vh - 56px); }
        .admin-sidebar {
          width: 200px; flex-shrink: 0;
          background: #fff; border-right: 1px solid #e6e6e6;
          padding: 1rem 0;
        }
        .admin-main { flex: 1; min-width: 0; background: #f8f9f9; }
        @media (max-width: 768px) {
          .admin-layout { flex-direction: column; }
          .admin-sidebar {
            width: 100%; border-right: none;
            border-bottom: 1px solid #e6e6e6;
            padding: 0; display: flex;
            overflow-x: auto; -webkit-overflow-scrolling: touch;
          }
          .admin-sidebar a { white-space: nowrap; }
        }
      `}</style>
      <div className="admin-layout">
        <nav className="admin-sidebar">
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.6rem 1.25rem',
                  fontSize: '0.875rem', fontWeight: active ? 600 : 400,
                  color: active ? '#fff' : '#555',
                  background: active ? '#1c5373' : 'transparent',
                  textDecoration: 'none',
                  transition: 'background 0.15s',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="admin-main">
          {children}
        </div>
      </div>
    </>
  );
}
