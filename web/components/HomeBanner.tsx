'use client';

import { useEffect, useRef, useState } from 'react';
import { CLIENT_BASE_URL } from '@/lib/api';

interface BannerItem {
  id: number;
  sourceType: string;
  sourceId: number;
  imageUrl: string;
  title: string | null;
}

interface FallbackSlide {
  bg: string;
  accent: string;
  tag: string;
  title: string;
  subtitle: string;
  img: string;
}

const FALLBACK_SLIDES: FallbackSlide[] = [
  {
    bg: 'linear-gradient(135deg, #e8f4f8 0%, #d0eaf5 100%)',
    accent: '#1c5373',
    tag: '社區公告',
    title: '里民大會即將登場',
    subtitle: '一起來參與社區決策，讓我們的里更美好',
    img: '🏛️',
  },
  {
    bg: 'linear-gradient(135deg, #fef3e2 0%, #fde8c0 100%)',
    accent: '#b45309',
    tag: '在地活動',
    title: '週末農夫市集開跑',
    subtitle: '新鮮蔬果直送，支持在地農業',
    img: '🥬',
  },
  {
    bg: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
    accent: '#065f46',
    tag: '環保行動',
    title: '社區清潔日招募',
    subtitle: '一起動手讓街道更乾淨，從你我做起',
    img: '🌱',
  },
];

interface Props {
  variant?: 'top' | 'middle';
}

export default function HomeBanner({ variant = 'top' }: Props) {
  const slotName = variant === 'top' ? 'homepage_top' : 'homepage_middle';
  const [bannerItems, setBannerItems] = useState<BannerItem[]>([]);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(`${CLIENT_BASE_URL}/api/v1/banners?slot=${slotName}`)
      .then(r => r.json())
      .then(json => {
        if (json.code === 200 && json.data?.length > 0) {
          setBannerItems(json.data);
        }
      })
      .catch(() => {});
  }, [slotName]);

  const hasApi = bannerItems.length > 0;
  const totalSlides = hasApi ? bannerItems.length : FALLBACK_SLIDES.length;
  const fallbackSlides = variant === 'middle' ? [...FALLBACK_SLIDES].reverse() : FALLBACK_SLIDES;

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % totalSlides);
    }, 4000);
  }

  useEffect(() => {
    if (totalSlides > 1) startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSlides]);

  function goTo(i: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrent(i);
    if (totalSlides > 1) startTimer();
  }

  function handleClick() {
    if (!hasApi) return;
    const item = bannerItems[current];
    if (item.sourceType === 'post') {
      window.location.href = `/posts/${item.sourceId}`;
    } else if (item.sourceType === 'place') {
      window.location.href = `/places/${item.sourceId}`;
    }
  }

  // API banner with image
  if (hasApi) {
    const item = bannerItems[current];
    return (
      <div style={{ margin: '0.5rem -1rem', position: 'relative', overflow: 'hidden' }}>
        <div
          onClick={handleClick}
          style={{
            cursor: 'pointer',
            position: 'relative',
            height: 160,
            backgroundImage: `url(${item.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transition: 'background-image 0.4s ease',
          }}
        >
          {item.title && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
              padding: '2rem 1.5rem 0.8rem',
            }}>
              <p style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                {item.title}
              </p>
            </div>
          )}
        </div>

        {totalSlides > 1 && (
          <div style={{
            position: 'absolute', bottom: 8, left: 0, right: 0,
            display: 'flex', justifyContent: 'center', gap: '0.35rem',
          }}>
            {bannerItems.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); goTo(i); }}
                style={{
                  width: i === current ? 16 : 6,
                  height: 6, borderRadius: 3,
                  background: i === current ? '#fff' : 'rgba(255,255,255,0.5)',
                  border: 'none', padding: 0, cursor: 'pointer',
                  transition: 'width 0.3s ease',
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Fallback: static slides
  const s = fallbackSlides[current];
  return (
    <div style={{ margin: '0.5rem -1rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        background: s.bg,
        padding: '1.1rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minHeight: 100,
        transition: 'background 0.4s ease',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.05em',
            color: s.accent, background: s.accent + '18',
            padding: '2px 8px', borderRadius: 20, display: 'inline-block',
            marginBottom: '0.35rem',
          }}>
            {s.tag}
          </span>
          <p style={{ fontSize: '1rem', fontWeight: 800, color: '#1e1e1e', lineHeight: 1.3, marginBottom: '0.3rem' }}>
            {s.title}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#666', lineHeight: 1.5 }}>
            {s.subtitle}
          </p>
        </div>
        <div style={{
          fontSize: '4rem', lineHeight: 1,
          flexShrink: 0, marginLeft: '1rem',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
        }}>
          {s.img}
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 8, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: '0.35rem',
      }}>
        {fallbackSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            style={{
              width: i === current ? 16 : 6,
              height: 6, borderRadius: 3,
              background: i === current ? s.accent : s.accent + '40',
              border: 'none', padding: 0, cursor: 'pointer',
              transition: 'width 0.3s ease, background 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}
