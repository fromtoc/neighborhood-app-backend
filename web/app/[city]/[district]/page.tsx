import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface LiItem {
  id: number;
  name: string;
  city: string;
  district: string;
  lat: number | null;
  lng: number | null;
  status: number;
}

interface Props {
  params: { city: string; district: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = decodeURIComponent(params.city);
  const district = decodeURIComponent(params.district);
  const title = `${city} ${district} 各里資訊`;
  const description = `${city}${district}各里的在地生活資訊、社群貼文、里民聊聊，探索你的社區。`;
  const url = `/${encodeURIComponent(city)}/${encodeURIComponent(district)}`;
  return {
    title,
    description,
    openGraph: { title, description, url },
    alternates: { canonical: url },
  };
}

export const revalidate = 86400; // 24h
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const cities = await apiFetch<string[]>('/api/v1/geo/cities');
    const results = await Promise.all(
      cities.map(async (city) => {
        try {
          const districts = await apiFetch<string[]>(
            `/api/v1/geo/districts?city=${encodeURIComponent(city)}`,
          );
          return districts.map((district) => ({
            city: encodeURIComponent(city),
            district: encodeURIComponent(district),
          }));
        } catch {
          return [];
        }
      }),
    );
    return results.flat();
  } catch {
    return [];
  }
}

async function getLis(city: string, district: string): Promise<LiItem[]> {
  return apiFetch<LiItem[]>(
    `/api/v1/geo/lis?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`,
  );
}

export default async function DistrictPage({ params }: Props) {
  const city = decodeURIComponent(params.city);
  const district = decodeURIComponent(params.district);

  let lis: LiItem[];
  try {
    lis = await getLis(city, district);
  } catch {
    notFound();
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="location-bar" style={{ margin: '-1.5rem -1.5rem 1.5rem', padding: '0.5rem 1.5rem' }}>
        <div className="inner">
          <Link href={`/${encodeURIComponent(city)}`}>{city}</Link>
          <span className="sep">›</span>
          <span style={{ color: '#1c5373', fontWeight: 600 }}>{district}</span>
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
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>
          {city} {district}
        </h1>
        <p style={{ opacity: 0.8, fontSize: '0.85rem', marginTop: '0.25rem' }}>
          選擇里，進入社區資訊與社群
        </p>
      </div>

      {/* Li list */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">里列表</h2>
          <span style={{ fontSize: '0.8rem', color: '#bbb' }}>{lis.length} 個里</span>
        </div>

        {lis.length > 0 ? (
          <div className="li-list">
            {lis.map((li) => (
              <Link
                key={li.id}
                href={`/${encodeURIComponent(city)}/${encodeURIComponent(district)}/${encodeURIComponent(li.name)}`}
                className="li-card"
              >
                <span className="li-name">{li.name}</span>
                <span className="li-arrow">›</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🏡</div>
            <p>尚無里資料</p>
          </div>
        )}
      </div>
    </>
  );
}
