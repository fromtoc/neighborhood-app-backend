import type { Metadata } from 'next';

export const metadata: Metadata = { title: '隱私權政策 — 巷口 GoLocal' };

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', lineHeight: 1.8, color: '#333' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem' }}>隱私權政策</h1>

      <p>巷口 GoLocal（以下簡稱「本平台」）重視您的隱私權。本隱私權政策說明我們如何蒐集、使用及保護您的個人資料。</p>

      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '1.5rem' }}>資料蒐集範圍</h2>
      <p>我們僅蒐集提供服務所必要的個人資料，包括：</p>
      <ul style={{ paddingLeft: '1.2rem' }}>
        <li>暱稱與自我介紹</li>
        <li>所在里別與行政區</li>
        <li>聯絡方式（手機號碼）</li>
        <li>使用紀錄與偏好設定</li>
      </ul>

      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '1.5rem' }}>資料使用目的</h2>
      <ul style={{ paddingLeft: '1.2rem' }}>
        <li>提供社區相關服務與個人化內容</li>
        <li>發送通知與社區公告</li>
        <li>改善服務品質與使用體驗</li>
        <li>確保平台安全與防止濫用</li>
      </ul>

      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '1.5rem' }}>資料保護</h2>
      <ul style={{ paddingLeft: '1.2rem' }}>
        <li>您的資料僅用於社區服務功能，不會出售予第三方</li>
        <li>我們採用加密技術保護您的個人資訊</li>
        <li>您可隨時要求刪除您的帳號及相關資料</li>
        <li>位置資訊僅在您授權時使用，用於提供在地化內容</li>
      </ul>

      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '1.5rem' }}>聯繫我們</h2>
      <p>如有任何隱私相關問題，請透過平台內的意見回饋功能與我們聯繫。</p>

      <p style={{ marginTop: '2rem', fontSize: '0.82rem', color: '#999' }}>© 2026 GoLocal Team. All rights reserved.</p>
    </div>
  );
}
