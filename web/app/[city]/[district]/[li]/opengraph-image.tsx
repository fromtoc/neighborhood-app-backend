import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = '巷口 GoLocal — 在地社區';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage({
  params,
}: {
  params: { city: string; district: string; li: string };
}) {
  const city = decodeURIComponent(params.city);
  const district = decodeURIComponent(params.district);
  const li = decodeURIComponent(params.li);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #1c5373 0%, #0e3347 100%)',
          padding: '60px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* App name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'auto' }}>
          <span style={{ fontSize: 28, color: '#ffffff', fontWeight: 700, opacity: 0.9 }}>
            巷口 GoLocal
          </span>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18, color: '#7ec8e3', fontWeight: 500 }}>
              {city} · {district}
            </span>
          </div>
          <div style={{ fontSize: 80, fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
            {li}
          </div>
          <div style={{ fontSize: 24, color: '#a8d8ea', marginTop: 8 }}>
            在地資訊 · 社群動態 · 里民聊聊
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#4fc3f7',
            }}
          />
          <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)' }}>
            探索你的社區，就從巷口開始
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
