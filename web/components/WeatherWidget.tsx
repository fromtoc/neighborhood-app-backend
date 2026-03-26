'use client';

import { useEffect, useState } from 'react';
import { CLIENT_BASE_URL } from '@/lib/api';

interface Period {
  label:   string;
  dateStr: string;
  wx:      string;
  wxCode:  number;
  pop:     string;
  minT:    string;
  maxT:    string;
}

const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

/** CWA 天氣代碼 → emoji icon */
function cwaIcon(code: number, wx: string): string {
  if (code === 1) return '☀️';
  if (code <= 3)  return '🌤️';
  if (code <= 7)  return '⛅';
  if (wx.includes('雷')) return '⛈️';
  if (wx.includes('雨')) return '🌧️';
  if (wx.includes('霧')) return '🌫️';
  if (wx.includes('雪')) return '❄️';
  if (code <= 7)  return '☁️';
  return '☁️';
}

/** "2024-03-07 18:00:00" → 顯示標籤 */
function periodLabel(startTime: string): string {
  const hour = parseInt(startTime.slice(11, 13), 10);
  const dateStr = startTime.slice(0, 10);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isToday = dateStr === todayStr;

  if (hour >= 6 && hour < 18) {
    return isToday ? '今日白天' : '明日白天';
  }
  return isToday ? '今晚明晨' : '明日晚上';
}

/** "2024-03-07 12:00:00" → "3/7(五)" */
function toDateStr(startTime: string): string {
  const d = new Date(startTime.replace(' ', 'T'));
  return `${d.getMonth() + 1}/${d.getDate()}(${DAY_NAMES[d.getDay()]})`;
}

export default function WeatherWidget({ city, lat, lng }: { city?: string; lat?: number | null; lng?: number | null }) {
  const [periods, setPeriods] = useState<Period[] | null>(null);

  useEffect(() => {
    if (!city && (lat == null || lng == null)) return;

    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (lat != null) params.set('lat', String(lat));
    if (lng != null) params.set('lng', String(lng));

    fetch(`${CLIENT_BASE_URL}/api/v1/weather?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        const data = json?.data ?? json; // Spring Boot 包 ApiResponse，取 .data
        if (!data?.periods?.length) return;
        const mapped: Period[] = data.periods.map((p: {
          startTime: string; wx: string; wxCode: number;
          pop: string; minT: string; maxT: string;
        }) => ({
          label:   periodLabel(p.startTime),
          dateStr: toDateStr(p.startTime),
          wx:      p.wx,
          wxCode:  p.wxCode,
          pop:     p.pop,
          minT:    p.minT,
          maxT:    p.maxT,
        }));
        setPeriods(mapped);
      })
      .catch(() => {});
  }, [city, lat, lng]);

  if (!periods) return null;

  return (
    <div style={{ margin: '0.75rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '1rem' }}>🌤️</span>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1C5373' }}>地區氣象</span>
        </div>
        {city && <span style={{ fontSize: '0.75rem', color: '#999' }}>{city}</span>}
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: 2 }}>
        {periods.map(p => (
          <div key={p.label} style={{
            flex: '1 1 0',
            minWidth: 0,
            background: '#fff',
            border: '1px solid #e5e5e5',
            borderTop: '2px solid #1C5373',
            borderRadius: 12,
            padding: '0.5rem 0.4rem',
          }}>
            <div style={{ fontSize: '0.7rem', color: '#1C5373', fontWeight: 700, marginBottom: '0.15rem' }}>{p.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{cwaIcon(p.wxCode, p.wx)}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e1e1e' }}>{p.minT}-{p.maxT}°C</span>
            </div>
            <div style={{ fontSize: '0.58rem', color: '#999', display: 'flex', alignItems: 'center', gap: '2px' }}>
              <span>☂</span> {p.pop}%
            </div>
            <div style={{ fontSize: '0.55rem', color: '#bbb', marginTop: '0.1rem' }}>
              {p.wx.length > 6 ? p.wx.slice(0, 6) + '…' : p.wx}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
