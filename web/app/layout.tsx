import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { NotificationProvider } from '@/components/NotificationProvider';
import NotificationBell from '@/components/NotificationBell';
import HeaderUserSection from '@/components/HeaderUserSection';
import SearchBar from '@/components/SearchBar';
import SiteNav from '@/components/SiteNav';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://golocal.tw';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '巷口 GoLocal — 探索你的社區',
    template: '%s | 巷口 GoLocal',
  },
  description: '巷口 GoLocal 提供全台灣各縣市、鄉鎮區、里的在地資訊、社群動態與店家資料，讓你隨時掌握社區脈動。',
  openGraph: {
    siteName: '巷口 GoLocal',
    type: 'website',
    locale: 'zh_TW',
  },
  twitter: {
    card: 'summary',
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        <AuthProvider>
          <NotificationProvider>
            <header className="site-header">
              {/* 第一排：Logo + 搜尋 + 使用者 */}
              <div className="inner">
                <a href="/" className="logo">
                  <span className="brand-blue">巷口</span>{' '}
                  <span className="brand-orange">GoLocal</span>
                </a>
                <div style={{ flex: 1 }} />
                <SearchBar />
                <NotificationBell />
                <HeaderUserSection />
              </div>
              {/* 第二排：導覽列 */}
              <div className="header-nav-row">
                <SiteNav />
              </div>
            </header>

            <main className="site-main">
              <div className="container">{children}</div>
            </main>
          </NotificationProvider>
        </AuthProvider>

        <footer
          style={{
            textAlign: 'center',
            padding: '1.5rem',
            color: '#bbb',
            fontSize: '0.8rem',
            borderTop: '1px solid #e6e6e6',
            background: '#fff',
          }}
        >
          © {new Date().getFullYear()}{' '}
          <span style={{ color: '#1c5373', fontWeight: 600 }}>巷口 GoLocal</span>
        </footer>
      </body>
    </html>
  );
}
