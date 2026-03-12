import type { Metadata } from 'next';

export const metadata: Metadata = { title: '社群公約 — 巷口 GoLocal' };

export default function CommunityGuidelinesPage() {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', lineHeight: 1.8, color: '#333' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem' }}>社群公約</h1>

      <p>為了維護友善、安全的社區環境，所有使用者在使用巷口 GoLocal 時，請遵守以下社群公約。</p>

      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '1.5rem' }}>基本守則</h2>
      <p style={{ whiteSpace: 'pre-wrap' }}>{'🤝 尊重他人，保持友善禮貌的態度\n🚫 禁止人身攻擊、霸凌或騷擾行為\n📢 不散播不實資訊或謠言\n🔒 尊重他人隱私，勿公開他人個資'}</p>

      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '1.5rem' }}>內容規範</h2>
      <p style={{ whiteSpace: 'pre-wrap' }}>{'🏪 商業推廣請使用適當的分類標籤\n♻️ 避免重複發文或洗版行為\n📷 分享照片請尊重肖像權\n🔞 禁止發布色情、暴力或違法內容'}</p>

      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '1.5rem' }}>檢舉與處分</h2>
      <p>⚠️ 發現違規內容請使用檢舉功能</p>
      <p>違反社群公約者，本平台得視情節輕重採取以下處分：</p>
      <ul style={{ paddingLeft: '1.2rem' }}>
        <li>第一次違規：警告通知</li>
        <li>重複違規：暫時禁言（1～7 天）</li>
        <li>嚴重違規：永久停權</li>
      </ul>

      <p style={{ marginTop: '2rem', fontSize: '0.82rem', color: '#999' }}>© 2026 GoLocal Team. All rights reserved.</p>
    </div>
  );
}
