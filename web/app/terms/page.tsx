import type { Metadata } from 'next';

export const metadata: Metadata = { title: '服務條款 — 巷口 GoLocal' };

export default function TermsPage() {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', lineHeight: 1.8, color: '#333' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem' }}>服務條款</h1>

      <p>歡迎使用巷口 GoLocal（以下簡稱「本平台」）。使用本服務即表示您同意以下條款。</p>

      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '1.5rem' }}>使用資格</h2>
      <ol style={{ paddingLeft: '1.2rem' }}>
        <li>使用者須為年滿 13 歲之自然人</li>
        <li>註冊時應提供真實資訊</li>
        <li>每人限註冊一個帳號</li>
      </ol>

      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '1.5rem' }}>使用者行為規範</h2>
      <ol style={{ paddingLeft: '1.2rem' }}>
        <li>禁止發布違法、騷擾、歧視或不實內容</li>
        <li>使用者對其發布之內容負完全責任</li>
        <li>禁止冒充他人或誤導其他使用者</li>
        <li>禁止利用平台進行商業詐騙行為</li>
      </ol>

      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '1.5rem' }}>平台權利</h2>
      <ol style={{ paddingLeft: '1.2rem' }}>
        <li>本平台保留移除不當內容之權利</li>
        <li>本平台得對違規使用者採取警告、禁言或停權處分</li>
        <li>商家資訊由商家自行提供，本平台不負擔保責任</li>
      </ol>

      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '1.5rem' }}>條款修改</h2>
      <p>本平台得隨時修改服務條款，修改後繼續使用視為同意。重大變更將以平台內通知方式告知使用者。</p>
      <p>詳細條款請參閱官方網站。</p>

      <p style={{ marginTop: '2rem', fontSize: '0.82rem', color: '#999' }}>© 2026 GoLocal Team. All rights reserved.</p>
    </div>
  );
}
