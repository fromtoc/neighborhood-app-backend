import { ImageResponse } from 'next/og';

const API_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

export const runtime = 'edge';
export const alt = '在地店家 — 巷口 GoLocal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Place {
  name: string;
  description: string | null;
  address: string | null;
  coverImageUrl: string | null;
}

export default async function OgImage({ params }: { params: { id: string } }) {
  let place: Place | null = null;
  try {
    const res = await fetch(`${API_URL}/api/v1/places/${params.id}`);
    const json = await res.json();
    if (json.code === 200) place = json.data;
  } catch { /* fallback */ }

  const name = place?.name ?? '在地店家';
  const desc = place?.description?.slice(0, 80) ?? '';
  const address = place?.address ?? '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: 'linear-gradient(135deg, #1c5373 0%, #0e3347 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Cover image panel */}
        {place?.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={place.coverImageUrl}
            alt=""
            style={{
              width: '40%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.85,
            }}
          />
        )}

        {/* Content panel */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '60px 70px',
          }}
        >
          <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.8)', fontWeight: 700, marginBottom: 'auto' }}>
            巷口 GoLocal · 🏪 在地店家
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 60, fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
              {name.length > 14 ? name.slice(0, 14) + '…' : name}
            </div>

            {desc && (
              <div style={{ fontSize: 22, color: '#a8d8ea', lineHeight: 1.5 }}>
                {desc}
              </div>
            )}

            {address && (
              <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
                📍 {address}
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 48,
              paddingTop: 24,
              borderTop: '1px solid rgba(255,255,255,0.2)',
              fontSize: 18,
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            探索你的社區，就從巷口開始
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
