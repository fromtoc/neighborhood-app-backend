'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getLastNeighborhood, saveLastNeighborhood } from '@/lib/last-neighborhood';
import { CLIENT_BASE_URL } from '@/lib/api';

interface Props {
  tab: string; // 'home' | 'info' | 'community' | 'shops' | 'chat'
  emptyIcon: string;
  emptyTitle: string;
  emptyDesc: string;
}

export default function NeighborhoodPageShell({ tab, emptyIcon, emptyTitle, emptyDesc }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<'init' | 'selector'>('init');

  const [cities, setCities] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [lis, setLis] = useState<{ id: number; name: string }[]>([]);
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [li, setLi] = useState('');

  useEffect(() => {
    const last = getLastNeighborhood();
    if (last?.city && last?.district && last?.li) {
      const base = `/${encodeURIComponent(last.city)}/${encodeURIComponent(last.district)}/${encodeURIComponent(last.li)}`;
      router.replace(tab === 'home' ? base : `${base}?tab=${tab}`);
    } else {
      setPhase('selector');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== 'selector') return;
    fetch(`${CLIENT_BASE_URL}/api/v1/geo/cities`)
      .then(r => r.json())
      .then(d => setCities(d.data ?? []));
  }, [phase]);

  useEffect(() => {
    if (!city) { setDistricts([]); setDistrict(''); return; }
    fetch(`${CLIENT_BASE_URL}/api/v1/geo/districts?city=${encodeURIComponent(city)}`)
      .then(r => r.json())
      .then(d => { setDistricts(d.data ?? []); setDistrict(''); setLi(''); });
  }, [city]);

  useEffect(() => {
    if (!city || !district) { setLis([]); setLi(''); return; }
    fetch(`${CLIENT_BASE_URL}/api/v1/geo/lis?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`)
      .then(r => r.json())
      .then(d => { setLis(d.data ?? []); setLi(''); });
  }, [city, district]);

  function handleGo() {
    if (!city || !district || !li) return;
    saveLastNeighborhood({ city, district, li });
    const base = `/${encodeURIComponent(city)}/${encodeURIComponent(district)}/${encodeURIComponent(li)}`;
    router.push(tab === 'home' ? base : `${base}?tab=${tab}`);
  }

  if (phase === 'init') {
    return <div style={{ textAlign: 'center', padding: '4rem', color: '#bbb' }}>載入中...</div>;
  }

  // selector
  const sel: React.CSSProperties = {
    width: '100%', padding: '0.6rem 0.75rem',
    border: '1px solid #e6e6e6', borderRadius: 8,
    fontSize: '0.9rem', background: '#fff', color: '#1e1e1e', cursor: 'pointer',
  };

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{emptyIcon}</div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1c5373', marginBottom: '0.5rem' }}>{emptyTitle}</h1>
        <p style={{ color: '#828282', fontSize: '0.9rem' }}>{emptyDesc}</p>
      </div>
      <div style={{ background: '#fff', border: '1px solid #e6e6e6', borderRadius: 12, padding: '1.5rem', maxWidth: 480, margin: '0 auto' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1c5373', marginBottom: '1rem' }}>選擇你的社區</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#828282', marginBottom: '0.25rem', display: 'block' }}>縣市</label>
            <select value={city} onChange={e => setCity(e.target.value)} style={sel}>
              <option value="">-- 選擇縣市 --</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#828282', marginBottom: '0.25rem', display: 'block' }}>行政區</label>
            <select value={district} onChange={e => setDistrict(e.target.value)} disabled={!city} style={{ ...sel, opacity: city ? 1 : 0.5 }}>
              <option value="">-- 選擇行政區 --</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#828282', marginBottom: '0.25rem', display: 'block' }}>里</label>
            <select value={li} onChange={e => setLi(e.target.value)} disabled={!district} style={{ ...sel, opacity: district ? 1 : 0.5 }}>
              <option value="">-- 選擇里 --</option>
              {lis.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </select>
          </div>
          <button
            onClick={handleGo}
            disabled={!li}
            style={{
              background: li ? '#1c5373' : '#e6e6e6',
              color: li ? '#fff' : '#bbb',
              border: 'none', borderRadius: 8,
              padding: '0.65rem', fontSize: '0.9rem', fontWeight: 600,
              cursor: li ? 'pointer' : 'default', marginTop: '0.25rem',
            }}
          >
            進入社區
          </button>
        </div>
      </div>
    </>
  );
}
