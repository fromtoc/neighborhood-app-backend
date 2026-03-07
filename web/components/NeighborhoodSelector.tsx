'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CLIENT_BASE_URL } from '@/lib/api';
import { getLastNeighborhood, saveLastNeighborhood } from '@/lib/last-neighborhood';

interface Props {
  targetTab: string; // 'info' | 'community' | 'shops' | 'chat'
}

export default function NeighborhoodSelector({ targetTab }: Props) {
  const router = useRouter();

  const [cities, setCities] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [lis, setLis] = useState<{ id: number; name: string }[]>([]);

  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [li, setLi] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoRedirecting, setAutoRedirecting] = useState(true);

  // 第一次 mount：檢查 localStorage，有存就直接跳轉
  useEffect(() => {
    const last = getLastNeighborhood();
    if (last?.city && last?.district && last?.li) {
      router.replace(
        `/${encodeURIComponent(last.city)}/${encodeURIComponent(last.district)}/${encodeURIComponent(last.li)}?tab=${targetTab}`,
      );
    } else {
      setAutoRedirecting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 載入縣市（autoRedirecting 時不需要）
  useEffect(() => {
    if (autoRedirecting) return;
    fetch(`${CLIENT_BASE_URL}/api/v1/geo/cities`)
      .then(r => r.json())
      .then(d => setCities(d.data ?? []));
  }, [autoRedirecting]);

  // 選縣市 → 載行政區
  useEffect(() => {
    if (!city) { setDistricts([]); setDistrict(''); return; }
    fetch(`${CLIENT_BASE_URL}/api/v1/geo/districts?city=${encodeURIComponent(city)}`)
      .then(r => r.json())
      .then(d => { setDistricts(d.data ?? []); setDistrict(''); setLi(''); });
  }, [city]);

  // 選行政區 → 載里
  useEffect(() => {
    if (!city || !district) { setLis([]); setLi(''); return; }
    fetch(`${CLIENT_BASE_URL}/api/v1/geo/lis?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`)
      .then(r => r.json())
      .then(d => { setLis(d.data ?? []); setLi(''); });
  }, [city, district]);

  function handleGo() {
    if (!city || !district || !li) return;
    setLoading(true);
    router.push(
      `/${encodeURIComponent(city)}/${encodeURIComponent(district)}/${encodeURIComponent(li)}?tab=${targetTab}`,
    );
  }

  // 正在自動跳轉中 → 顯示 loading
  if (autoRedirecting) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#bbb' }}>
        <p>載入你的社區中...</p>
      </div>
    );
  }

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '1px solid #e6e6e6',
    borderRadius: 8,
    fontSize: '0.9rem',
    background: '#fff',
    color: '#1e1e1e',
    cursor: 'pointer',
  };

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e6e6e6',
      borderRadius: 12,
      padding: '1.5rem',
      maxWidth: 480,
      margin: '0 auto',
    }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1c5373', marginBottom: '1rem' }}>
        選擇你的社區
      </h3>
      <p style={{ fontSize: '0.8rem', color: '#bbb', marginTop: '-0.5rem', marginBottom: '1rem' }}>
        選好後下次點選頁籤會自動帶入，不需要重選
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* 縣市 */}
        <div>
          <label style={{ fontSize: '0.8rem', color: '#828282', marginBottom: '0.25rem', display: 'block' }}>縣市</label>
          <select value={city} onChange={e => setCity(e.target.value)} style={selectStyle}>
            <option value="">-- 選擇縣市 --</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* 行政區 */}
        <div>
          <label style={{ fontSize: '0.8rem', color: '#828282', marginBottom: '0.25rem', display: 'block' }}>行政區</label>
          <select value={district} onChange={e => setDistrict(e.target.value)} disabled={!city} style={{ ...selectStyle, opacity: city ? 1 : 0.5 }}>
            <option value="">-- 選擇行政區 --</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* 里 */}
        <div>
          <label style={{ fontSize: '0.8rem', color: '#828282', marginBottom: '0.25rem', display: 'block' }}>里</label>
          <select value={li} onChange={e => setLi(e.target.value)} disabled={!district} style={{ ...selectStyle, opacity: district ? 1 : 0.5 }}>
            <option value="">-- 選擇里 --</option>
            {lis.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
          </select>
        </div>

        <button
          onClick={handleGo}
          disabled={!li || loading}
          style={{
            background: li ? '#1c5373' : '#e6e6e6',
            color: li ? '#fff' : '#bbb',
            border: 'none', borderRadius: 8,
            padding: '0.65rem',
            fontSize: '0.9rem', fontWeight: 600,
            cursor: li ? 'pointer' : 'default',
            marginTop: '0.25rem',
            transition: 'background 0.15s',
          }}
        >
          {loading ? '前往中...' : '進入社區'}
        </button>
      </div>
    </div>
  );
}
