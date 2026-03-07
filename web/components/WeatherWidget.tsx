'use client';

import { useEffect, useState } from 'react';

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
  return '今晚明晨';
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

    fetch(`/api/weather?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
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
    <div style={{ margin: '1rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e1e1e' }}>地區氣象</span>
        {city && <span style={{ fontSize: '0.78rem', color: '#828282' }}>{city}</span>}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: 2 }}>
        {periods.map(p => (
          <div key={p.label} style={{
            flex: '0 0 calc(33.33% - 0.35rem)',
            minWidth: 100,
            background: '#fff',
            border: '1px solid #e6e6e6',
            borderRadius: 10,
            padding: '0.65rem 0.6rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.65rem', color: '#1c5373', fontWeight: 700, marginBottom: '0.1rem' }}>{p.label}</div>
            <div style={{ fontSize: '0.6rem', color: '#bbb', marginBottom: '0.4rem' }}>{p.dateStr}</div>
            <div style={{ fontSize: '1.4rem', lineHeight: 1, marginBottom: '0.25rem' }}>{cwaIcon(p.wxCode, p.wx)}</div>
            <div style={{ fontSize: '0.6rem', color: '#828282', marginBottom: '0.3rem' }}>
              {p.wx.length > 8 ? p.wx.slice(0, 8) + '…' : p.wx} {p.pop}%
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e1e1e' }}>
              {p.minT} - {p.maxT}°C
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
