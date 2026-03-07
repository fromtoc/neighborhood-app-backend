import { ImageResponse } from 'next/og';

const API_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

export const runtime = 'edge';
export const alt = '社群貼文 — 巷口 GoLocal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Post {
  title: string | null;
  content: string;
  type: string;
  createdAt: string;
}

const TYPE_LABEL: Record<string, string> = {
  info: '📰 里長資訊',
  shop_review: '🏪 店家評論',
  event: '🎉 活動公告',
  general: '💬 社群動態',
};

export default async function OgImage({ params }: { params: { id: string } }) {
  let post: Post | null = null;
  try {
    const res = await fetch(`${API_URL}/api/v1/posts/${params.id}`);
    const json = await res.json();
    if (json.code === 200) post = json.data;
  } catch { /* fallback to default */ }

  const title = post?.title ?? post?.content?.slice(0, 50) ?? '社群貼文';
  const body = post?.content?.slice(0, 120) ?? '';
  const typeLabel = TYPE_LABEL[post?.type ?? 'general'] ?? '💬 社群動態';

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
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'auto' }}>
          <span style={{ fontSize: 26, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>
            巷口 GoLocal
          </span>
          <span
            style={{
              marginLeft: 20,
              fontSize: 16,
              color: '#7ec8e3',
              background: 'rgba(126,200,227,0.15)',
              padding: '4px 14px',
              borderRadius: 20,
            }}
          >
            {typeLabel}
          </span>
        </div>

        {/* Title */}
        <div style={{ fontSize: 56, fontWeight: 800, color: '#ffffff', lineHeight: 1.2, marginBottom: 20 }}>
          {title.length > 30 ? title.slice(0, 30) + '…' : title}
        </div>

        {/* Body preview */}
        {body && (
          <div style={{ fontSize: 26, color: '#a8d8ea', lineHeight: 1.6 }}>
            {body.length > 80 ? body.slice(0, 80) + '…' : body}
          </div>
        )}

        {/* Bottom */}
        <div
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>
            探索你的社區，就從巷口開始
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
