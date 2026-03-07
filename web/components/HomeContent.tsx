'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import HomeCommunityList from './HomeCommunityList';
import HomeBanner from './HomeBanner';
import WeatherWidget from './WeatherWidget';
import HomeInfoList from './HomeInfoList';
import { getLastNeighborhood, saveLastNeighborhood } from '@/lib/last-neighborhood';
import { CLIENT_BASE_URL } from '@/lib/api';

interface LiDetail {
  id: number;
  city: string;
  district: string;
  name: string;
  lat: number | null;
  lng: number | null;
}

type Phase = 'init' | 'selector' | 'dashboard';

/* ── 主元件 ─────────────────────────────────────────── */
export default function HomeContent() {
  const [phase, setPhase] = useState<Phase>('init');
  const [detail, setDetail] = useState<LiDetail | null>(null);

  const loadDashboard = useCallback(async (city: string, district: string, li: string) => {
    try {
      const res = await fetch(
        `${CLIENT_BASE_URL}/api/v1/geo/li?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}&li=${encodeURIComponent(li)}`,
      );
      const json = await res.json();
      if (json.code === 200 && json.data) {
        setDetail(json.data);
        setPhase('dashboard');
      } else {
        setPhase('selector');
      }
    } catch {
      setPhase('selector');
    }
  }, []);

  useEffect(() => {
    const last = getLastNeighborhood();
    if (last?.city && last?.district && last?.li) {
      loadDashboard(last.city, last.district, last.li);
    } else {
      setPhase('selector');
    }
  }, [loadDashboard]);

  if (phase === 'init') {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#bbb' }}>
        載入你的社區中...
      </div>
    );
  }

  if (phase === 'selector' || !detail) {
    return (
      <HomeSelector
        onSelect={(city, district, li) => {
          saveLastNeighborhood({ city, district, li });
          loadDashboard(city, district, li);
        }}
      />
    );
  }

  return <Dashboard detail={detail} onSwitch={() => setPhase('selector')} />;
}

/* ── Dashboard ────────────────────────────────────────── */
function Dashboard({ detail, onSwitch }: { detail: LiDetail; onSwitch: () => void }) {
  const cityHref     = `/${encodeURIComponent(detail.city)}`;
  const districtHref = `/${encodeURIComponent(detail.city)}/${encodeURIComponent(detail.district)}`;
  const liHref       = `/${encodeURIComponent(detail.city)}/${encodeURIComponent(detail.district)}/${encodeURIComponent(detail.name)}`;

  return (
    <>
      {/* 麵包屑 */}
      <div className="location-bar" style={{ margin: '-1.5rem -1.5rem 0', padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="inner">
          <Link href={cityHref}>{detail.city}</Link>
          <span className="sep">›</span>
          <Link href={districtHref}>{detail.district}</Link>
          <span className="sep">›</span>
          <span style={{ color: '#1c5373', fontWeight: 600 }}>{detail.name}</span>
        </div>
        <button
          onClick={onSwitch}
          style={{
            background: 'none', border: '1px solid #e6e6e6',
            borderRadius: 6, padding: '0.2rem 0.6rem',
            fontSize: '0.72rem', color: '#828282', cursor: 'pointer',
          }}
        >
          切換
        </button>
      </div>

      {/* Banner 1 */}
      <HomeBanner variant="top" />

      {/* 天氣 */}
      <WeatherWidget city={detail.city} lat={detail.lat} lng={detail.lng} />

      {/* 在地資訊 */}
      <HomeInfoList
        neighborhoodId={detail.id}
        sectionTitle={`${detail.district}${detail.name}`}
        liHref={liHref}
      />

      {/* Banner 2 */}
      <HomeBanner variant="middle" />

      <HomeCommunityList neighborhoodId={detail.id} liHref={liHref} />
    </>
  );
}

/* ── HomeSelector ─────────────────────────────────────── */
function HomeSelector({ onSelect }: {
  onSelect: (city: string, district: string, li: string) => void;
}) {
  const [cities,    setCities]    = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [lis,       setLis]       = useState<{ id: number; name: string }[]>([]);
  const [city,      setCity]      = useState('');
  const [district,  setDistrict]  = useState('');
  const [li,        setLi]        = useState('');

  useEffect(() => {
    fetch(`${CLIENT_BASE_URL}/api/v1/geo/cities`)
      .then(r => r.json())
      .then(d => setCities(d.data ?? []));
  }, []);

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

  const sel: React.CSSProperties = {
    width: '100%', padding: '0.65rem 0.75rem',
    border: '1px solid #e6e6e6', borderRadius: 8,
    fontSize: '0.9rem', background: '#fff', color: '#1e1e1e', cursor: 'pointer',
  };

  return (
    <>
      {/* Hero */}
      <div style={{
        margin: '-1.5rem -1.5rem 2rem',
        background: 'linear-gradient(135deg, #1c5373 0%, #245f82 100%)',
        padding: '3rem 1.5rem',
        color: '#fff',
        textAlign: 'center',
      }}>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 800, marginBottom: '0.6rem' }}>
          探索你的社區
        </h1>
        <p style={{ opacity: 0.85, fontSize: '1rem' }}>
          選擇你所在的里，查看在地資訊與社群動態
        </p>
      </div>

      {/* 選擇卡 */}
      <div style={{
        background: '#fff', border: '1px solid #e6e6e6',
        borderRadius: 14, padding: '1.75rem',
        maxWidth: 460, margin: '0 auto',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1c5373', marginBottom: '0.4rem' }}>
          選擇你的里
        </h2>
        <p style={{ fontSize: '0.78rem', color: '#bbb', marginBottom: '1.25rem' }}>
          選好後下次會自動帶入，不需要重選
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <label style={labelStyle}>
            縣市
            <select value={city} onChange={e => setCity(e.target.value)} style={sel}>
              <option value="">-- 選擇縣市 --</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label style={labelStyle}>
            行政區
            <select value={district} onChange={e => setDistrict(e.target.value)}
              disabled={!city} style={{ ...sel, opacity: city ? 1 : 0.45 }}>
              <option value="">-- 選擇行政區 --</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>

          <label style={labelStyle}>
            里
            <select value={li} onChange={e => setLi(e.target.value)}
              disabled={!district} style={{ ...sel, opacity: district ? 1 : 0.45 }}>
              <option value="">-- 選擇里 --</option>
              {lis.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </select>
          </label>

          <button
            onClick={() => { if (li) onSelect(city, district, li); }}
            disabled={!li}
            style={{
              background: li ? '#1c5373' : '#e6e6e6',
              color: li ? '#fff' : '#bbb',
              border: 'none', borderRadius: 8,
              padding: '0.7rem',
              fontSize: '0.95rem', fontWeight: 600,
              cursor: li ? 'pointer' : 'default',
              marginTop: '0.25rem',
              transition: 'background 0.15s',
            }}
          >
            進入社區 →
          </button>
        </div>
      </div>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column',
  gap: '0.3rem', fontSize: '0.8rem',
  color: '#828282', fontWeight: 500,
};
