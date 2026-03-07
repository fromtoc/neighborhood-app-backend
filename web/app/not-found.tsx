import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="empty-state" style={{ paddingTop: '5rem' }}>
      <div className="empty-icon">🗺️</div>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1c5373', marginBottom: '0.5rem' }}>
        找不到此頁面
      </h2>
      <p>此地區或里資料不存在，請確認網址是否正確。</p>
      <Link
        href="/"
        style={{
          display: 'inline-block',
          marginTop: '1.5rem',
          background: '#1c5373',
          color: '#fff',
          padding: '0.5rem 1.5rem',
          borderRadius: 8,
          fontSize: '0.9rem',
        }}
      >
        回首頁
      </Link>
    </div>
  );
}
