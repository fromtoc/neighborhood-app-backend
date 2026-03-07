import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface Props {
  params: { city: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = decodeURIComponent(params.city);
  const title = `${city} 社區資訊`;
  const description = `${city}各行政區、里的在地資訊、社群動態與店家，盡在巷口 GoLocal。`;
  return {
    title,
    description,
    openGraph: { title, description, url: `/${encodeURIComponent(city)}` },
    alternates: { canonical: `/${encodeURIComponent(city)}` },
  };
}

export const revalidate = 86400; // 24h
export const dynamicParams = true; // 未知城市仍可動態渲染

export async function generateStaticParams() {
  try {
    const cities = await apiFetch<string[]>('/api/v1/geo/cities');
    return cities.map((city) => ({ city: encodeURIComponent(city) }));
  } catch {
    return []; // build 時 API 不可用 → 全部改用 ISR
  }
}

async function getDistricts(city: string): Promise<string[]> {
  return apiFetch<string[]>(`/api/v1/geo/districts?city=${encodeURIComponent(city)}`);
}

export default async function CityPage({ params }: Props) {
  const city = decodeURIComponent(params.city);

  let districts: string[];
  try {
    districts = await getDistricts(city);
  } catch {
    notFound();
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="location-bar" style={{ margin: '-1.5rem -1.5rem 1.5rem', padding: '0.5rem 1.5rem' }}>
        <div className="inner">
          <span style={{ color: '#1c5373', fontWeight: 600 }}>{city}</span>
        </div>
      </div>

      {/* Hero */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1c5373 0%, #245f82 100%)',
          color: '#fff',
          padding: '1.5rem',
          borderRadius: 12,
          marginBottom: '1.5rem',
        }}
      >
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{city}</h1>
        <p style={{ opacity: 0.8, fontSize: '0.85rem', marginTop: '0.25rem' }}>
          選擇行政區，探索在地里民資訊
        </p>
      </div>

      {/* District grid */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">行政區</h2>
          <span style={{ fontSize: '0.8rem', color: '#bbb' }}>{districts.length} 個行政區</span>
        </div>

        {districts.length > 0 ? (
          <div className="district-grid">
            {districts.map((district) => (
              <Link
                key={district}
                href={`/${encodeURIComponent(city)}/${encodeURIComponent(district)}`}
                className="district-card"
              >
                {district}
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🏘️</div>
            <p>尚無行政區資料</p>
          </div>
        )}
      </div>
    </>
  );
}
