import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import WeatherWidget from '@/components/WeatherWidget';
import HomeBanner from '@/components/HomeBanner';
import HomeInfoList from '@/components/HomeInfoList';
import HomeCommunityList from '@/components/HomeCommunityList';
import CommunitySection from '@/components/CommunitySection';
import CommunityTabSection from '@/components/CommunityTabSection';
import InfoSection from '@/components/InfoSection';
import ChatTabSection from '@/components/ChatTabSection';
import SaveNeighborhood from '@/components/SaveNeighborhood';
import SwitchNeighborhoodLink from '@/components/SwitchNeighborhoodLink';
import FollowButton from '@/components/FollowButton';
import ShopsSection from '@/components/ShopsSection';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://golocal.tw';

interface LiDetail {
  id: number;
  name: string;
  city: string;
  district: string;
  lat: number | null;
  lng: number | null;
  status: number;
}

interface Props {
  params: { city: string; district: string; li: string };
  searchParams: { tab?: string };
}

export const revalidate = 300;
export const dynamicParams = true;

async function getLiDetail(city: string, district: string, li: string): Promise<LiDetail> {
  return apiFetch<LiDetail>(
    `/api/v1/geo/li?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}&li=${encodeURIComponent(li)}`,
  );
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const city     = decodeURIComponent(params.city);
  const district = decodeURIComponent(params.district);
  const li       = decodeURIComponent(params.li);
  const tab      = searchParams.tab ?? 'home';
  const base     = `/${encodeURIComponent(city)}/${encodeURIComponent(district)}/${encodeURIComponent(li)}`;

  const tabMeta: Record<string, { title: string; description: string; canonical: string; noindex?: boolean }> = {
    home:      { title: `${city} ${district} ${li} — 在地資訊`,  description: `${city}${district}${li}的天氣、最新資訊與社群動態。`,              canonical: base },
    info:      { title: `${city} ${district} ${li} 相關資訊`,   description: `${city}${district}${li}的里長公告、在地資訊與社區通知。`,           canonical: `${base}?tab=info` },
    community: { title: `${city} ${district} ${li} 社群動態`,   description: `${city}${district}${li}的居民討論、在地生活分享與社群互動。`,        canonical: `${base}?tab=community` },
    shops:     { title: `${city} ${district} ${li} 在地店家`,   description: `${city}${district}${li}的在地店家、餐飲與商家資訊。`,               canonical: `${base}?tab=shops` },
    chat:      { title: `${city} ${district} ${li} 里民聊聊`,   description: `${city}${district}${li}的即時聊天室，與鄰居即時互動。`,             canonical: `${base}?tab=chat`, noindex: true },
  };

  const m = tabMeta[tab] ?? tabMeta.home;
  return {
    title: m.title,
    description: m.description,
    openGraph: { title: m.title, description: m.description, url: m.canonical, type: 'website' },
    alternates: { canonical: m.canonical },
    ...(m.noindex ? { robots: { index: false } } : {}),
  };
}

export default async function LiPage({ params, searchParams }: Props) {
  const city   = decodeURIComponent(params.city);
  const district = decodeURIComponent(params.district);
  const liName = decodeURIComponent(params.li);
  const tab    = searchParams.tab ?? 'home';

  let liDetail: LiDetail;
  try {
    liDetail = await getLiDetail(city, district, liName);
  } catch {
    notFound();
  }

  const base = `/${encodeURIComponent(city)}/${encodeURIComponent(district)}/${encodeURIComponent(liName)}`;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: city,     item: `${SITE_URL}/${encodeURIComponent(city)}` },
      { '@type': 'ListItem', position: 2, name: district, item: `${SITE_URL}/${encodeURIComponent(city)}/${encodeURIComponent(district)}` },
      { '@type': 'ListItem', position: 3, name: liName,   item: `${SITE_URL}${base}` },
    ],
  };

  return (
    <>
      <Script id="breadcrumb-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <SaveNeighborhood city={city} district={district} li={liName} />

      {/* 麵包屑 */}
      <div className="location-bar" style={{ margin: '-1.5rem -1.5rem 1.5rem', padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="inner">
          <Link href={`/${encodeURIComponent(city)}`}>{city}</Link>
          <span className="sep">›</span>
          <Link href={`/${encodeURIComponent(city)}/${encodeURIComponent(district)}`}>{district}</Link>
          <span className="sep">›</span>
          <span style={{ color: '#1c5373', fontWeight: 600 }}>{liName}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <FollowButton neighborhoodId={liDetail.id} />
          <SwitchNeighborhoodLink />
        </div>
      </div>

      {/* 主頁 */}
      {tab === 'home' && (
        <>
          <HomeBanner variant="top" />
          <WeatherWidget city={city} lat={liDetail.lat} lng={liDetail.lng} />
          <HomeInfoList
            neighborhoodId={liDetail.id}
            liHref={base}
          />
          <HomeBanner variant="middle" />
          <HomeCommunityList neighborhoodId={liDetail.id} liHref={base} />
        </>
      )}

      {/* 資訊 */}
      {tab === 'info' && (
        <InfoSection
          neighborhoodId={liDetail.id}
          district={district}
          liName={liName}
        />
      )}

      {/* 社群 */}
      {tab === 'community' && (
        <CommunityTabSection
          neighborhoodId={liDetail.id}
          district={district}
          liName={liName}
        />
      )}

      {/* 店家 */}
      {tab === 'shops' && <ShopsSectionWrapper neighborhoodId={liDetail.id} city={city} district={district} liName={liName} />}

      {/* 聊聊 */}
      {tab === 'chat' && (
        <ChatTabSection
          neighborhoodId={liDetail.id}
          neighborhoodName={liName}
          city={city}
          district={district}
        />
      )}
    </>
  );
}

/* ── 店家 Server Wrapper ──────────────────────────────── */

interface PlaceItem {
  id: number;
  neighborhoodId: number;
  categoryId: number | null;
  categoryName: string | null;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  hours: string | null;
  coverImageUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  likeCount: number | null;
  hasHomeService: boolean;
  isPartner: boolean;
  tags: string[];
}

async function ShopsSectionWrapper({ neighborhoodId, city, district, liName }: { neighborhoodId: number; city: string; district: string; liName: string }) {
  let initialPlaces: PlaceItem[] = [];
  let initialDistrictPlaces: PlaceItem[] = [];
  try {
    const [liRes, distRes] = await Promise.all([
      apiFetch<{ total: number; records: PlaceItem[] }>(
        `/api/v1/places?neighborhoodId=${neighborhoodId}&size=200`,
      ),
      apiFetch<{ total: number; records: PlaceItem[] }>(
        `/api/v1/places/by-district?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}&excludeNeighborhoodId=${neighborhoodId}&size=200`,
      ),
    ]);
    initialPlaces = liRes.records;
    initialDistrictPlaces = distRes.records;
  } catch { /* ignore */ }

  return (
    <ShopsSection
      neighborhoodId={neighborhoodId}
      city={city}
      district={district}
      liName={liName}
      initialPlaces={initialPlaces}
      initialDistrictPlaces={initialDistrictPlaces}
    />
  );
}
