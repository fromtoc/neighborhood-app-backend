'use client';

import { useEffect, useState } from 'react';

const PLACEHOLDERS = [
  { bg: 'linear-gradient(135deg,#1c5373 0%,#2d7a9a 100%)', label: '社區活動公告' },
  { bg: 'linear-gradient(135deg,#f59e0b 0%,#f97316 100%)', label: '在地好店推薦' },
  { bg: 'linear-gradient(135deg,#10b981 0%,#059669 100%)', label: '里長重要通知' },
];

export default function BannerCarousel() {
  const [cur, setCur] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCur(i => (i + 1) % PLACEHOLDERS.length), 3500);
    return () => clearInterval(t);
  }, []);

  const slide = PLACEHOLDERS[cur];

  return (
    <div style={{ position: 'relative', margin: '0 -1.5rem', overflow: 'hidden' }}>
      {/* Slide */}
      <div style={{
        background: slide.bg,
        height: 170,
        display: 'flex', alignItems: 'flex-end',
        padding: '1rem 1.5rem',
        transition: 'background 0.5s ease',
      }}>
        <span style={{
          background: 'rgba(0,0,0,0.35)',
          color: '#fff', fontSize: '0.95rem', fontWeight: 700,
          padding: '0.3rem 0.8rem', borderRadius: 6,
        }}>
          {slide.label}
        </span>
      </div>

      {/* Dots */}
      <div style={{
        position: 'absolute', bottom: 8, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 5,
      }}>
        {PLACEHOLDERS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCur(i)}
            style={{
              width: i === cur ? 18 : 6, height: 6,
              borderRadius: 3, border: 'none', padding: 0,
              background: i === cur ? '#fff' : 'rgba(255,255,255,0.45)',
              transition: 'width 0.3s', cursor: 'pointer',
            }}
          />
        ))}
      </div>
    </div>
  );
}
