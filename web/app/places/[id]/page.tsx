import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import ShareButton from '@/components/ShareButton';
import PlaceComments from '@/components/PlaceComments';
import PlaceLikeButton from '@/components/PlaceLikeButton';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://golocal.tw';

interface Place {
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
  lat: number | null;
  lng: number | null;
  coverImageUrl: string | null;
  images: string[];
  tags: string[];
  rating: number | null;
  reviewCount: number | null;
  likeCount: number | null;
  hasHomeService: boolean;
  isPartner: boolean;
  status: number;
}

interface Neighborhood {
  id: number;
  name: string;
  city: string;
  district: string;
}

interface Props {
  params: { id: string };
}

export const revalidate = 3600;
export const dynamicParams = true;

async function getPlace(id: string): Promise<Place> {
  return apiFetch<Place>(`/api/v1/places/${id}`);
}

async function getNeighborhood(id: number): Promise<Neighborhood | null> {
  try {
    return await apiFetch<Neighborhood>(`/api/v1/neighborhoods/${id}`);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const place = await getPlace(params.id);
    const title = place.name;
    const description = [place.description, place.address].filter(Boolean).join(' — ').slice(0, 120);
    const url = `/places/${place.id}`;
    return {
      title,
      description: description || `${place.name} — 在地店家資訊`,
      openGraph: {
        title,
        description,
        url,
        type: 'website',
        ...(place.coverImageUrl ? { images: [{ url: place.coverImageUrl }] } : {}),
      },
      alternates: { canonical: url },
    };
  } catch {
    return { title: '店家不存在' };
  }
}

function StarRating({ rating }: { rating: number }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) stars.push(<span key={i} style={{ color: '#FACC15' }}>★</span>);
    else if (rating >= i - 0.5) stars.push(<span key={i} style={{ color: '#FACC15' }}>★</span>);
    else stars.push(<span key={i} style={{ color: '#D1D5DB' }}>☆</span>);
  }
  return <span style={{ display: 'inline-flex', gap: '1px', fontSize: '0.88rem' }}>{stars}</span>;
}

export default async function PlaceDetailPage({ params }: Props) {
  let place: Place;
  try {
    place = await getPlace(params.id);
  } catch {
    notFound();
  }

  const nb = await getNeighborhood(place.neighborhoodId);
  const liUrl = nb
    ? `/${encodeURIComponent(nb.city)}/${encodeURIComponent(nb.district)}/${encodeURIComponent(nb.name)}`
    : null;

  const localBusinessJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: place.name,
    url: `${SITE_URL}/places/${place.id}`,
    ...(place.description ? { description: place.description } : {}),
    ...(place.address
      ? { address: { '@type': 'PostalAddress', streetAddress: place.address, addressCountry: 'TW' } }
      : {}),
    ...(place.phone ? { telephone: place.phone } : {}),
    ...(place.website ? { sameAs: place.website } : {}),
    ...(place.hours ? { openingHours: place.hours } : {}),
    ...(place.lat && place.lng
      ? { geo: { '@type': 'GeoCoordinates', latitude: place.lat, longitude: place.lng } }
      : {}),
    ...(place.coverImageUrl ? { image: place.coverImageUrl } : {}),
    ...(nb
      ? {
          containedInPlace: {
            '@type': 'AdministrativeArea',
            name: `${nb.city}${nb.district}${nb.name}`,
          },
        }
      : {}),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首頁', item: SITE_URL },
      ...(nb && liUrl
        ? [
            { '@type': 'ListItem', position: 2, name: nb.city, item: `${SITE_URL}/${encodeURIComponent(nb.city)}` },
            { '@type': 'ListItem', position: 3, name: nb.district, item: `${SITE_URL}/${encodeURIComponent(nb.city)}/${encodeURIComponent(nb.district)}` },
            { '@type': 'ListItem', position: 4, name: nb.name, item: `${SITE_URL}${liUrl}` },
            { '@type': 'ListItem', position: 5, name: place.name, item: `${SITE_URL}/places/${place.id}` },
          ]
        : [
            { '@type': 'ListItem', position: 2, name: place.name, item: `${SITE_URL}/places/${place.id}` },
          ]),
    ],
  };

  return (
    <>
      <Script id="localbusiness-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }} />
      <Script id="breadcrumb-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Back nav */}
      <div style={{ margin: '-1.5rem -1.5rem 0', padding: '0.6rem 1rem', background: '#fff', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href={liUrl ? `${liUrl}?tab=shops` : '/'}
          style={{ fontSize: '0.9rem', color: '#1c5373', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
          ← 店家
        </Link>
        <ShareButton title={place.name} path={`/places/${place.id}`} />
      </div>

      {/* Hero image */}
      {(() => {
        const allImages = [
          ...(place.coverImageUrl ? [place.coverImageUrl] : []),
          ...(place.images ?? []),
        ];
        if (allImages.length === 0) return null;
        return (
          <div style={{ margin: '0 -1.5rem', position: 'relative' }}>
            <div style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory' }}>
              {allImages.map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={img} alt={`${place.name} ${i + 1}`}
                  style={{ width: '100%', minWidth: '100%', height: 240, objectFit: 'cover', scrollSnapAlign: 'start', flexShrink: 0 }} />
              ))}
            </div>
            {/* Partner badge */}
            {place.isPartner && (
              <div style={{
                position: 'absolute', top: 12, right: 12,
                background: '#C8A951', color: '#fff', fontSize: '0.75rem', fontWeight: 700,
                padding: '4px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                巷口特約
              </div>
            )}
          </div>
        );
      })()}

      {/* Shop info section */}
      <div style={{ background: '#fff', padding: '1.25rem 1.5rem', margin: '0 -1.5rem' }}>
        {/* Name */}
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e1e1e', margin: '0 0 0.5rem' }}>
          {place.name}
        </h1>

        {/* Rating row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.6rem' }}>
          <StarRating rating={place.rating ?? 0} />
          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#555' }}>{(place.rating ?? 0).toFixed(1)}</span>
          <span style={{ fontSize: '0.82rem', color: '#999' }}>({place.reviewCount ?? 0} 則評價)</span>
        </div>

        {/* Category + service tags */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {place.categoryName && (
            <span style={{ fontSize: '0.75rem', background: '#FFF7ED', color: '#C2410C', padding: '3px 10px', borderRadius: 6, fontWeight: 600 }}>
              {place.categoryName}
            </span>
          )}
          {place.hasHomeService && (
            <span style={{ fontSize: '0.75rem', background: '#EBF5FF', color: '#1c5373', padding: '3px 10px', borderRadius: 6, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              🚗 到府服務
            </span>
          )}
        </div>

        {/* Detail group */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '1px solid #f0f0f0' }}>
          {place.address && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.9rem' }}>
              <span style={{ color: '#1c5373' }}>📍</span>
              <span style={{ color: '#1c5373', fontWeight: 600, minWidth: 32 }}>地址</span>
              <span style={{ color: '#555', flex: 1 }}>{place.address}</span>
            </div>
          )}
          {place.phone && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.9rem' }}>
              <span style={{ color: '#1c5373' }}>📞</span>
              <span style={{ color: '#1c5373', fontWeight: 600, minWidth: 32 }}>電話</span>
              <a href={`tel:${place.phone}`} style={{ color: '#555', textDecoration: 'none', flex: 1 }}>{place.phone}</a>
            </div>
          )}
          {place.hours && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.9rem' }}>
              <span style={{ color: '#1c5373' }}>🕐</span>
              <span style={{ color: '#1c5373', fontWeight: 600, minWidth: 32 }}>營業</span>
              <span style={{ color: '#555', flex: 1, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{place.hours}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {place.description && (
          <p style={{ fontSize: '0.95rem', color: '#333', lineHeight: 1.7, margin: '0 0 0.75rem' }}>
            {place.description}
          </p>
        )}

        {/* Tags */}
        {place.tags && place.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {place.tags.map((tag, i) => (
              <span key={i} style={{ fontSize: '0.88rem', color: '#1c5373', fontWeight: 500 }}>#{tag}</span>
            ))}
          </div>
        )}

        {/* Location info */}
        {nb && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', color: '#777' }}>
            <span>📍</span>
            <span>{nb.district}、{nb.name}</span>
          </div>
        )}

        {/* Website */}
        {place.website && (
          <div style={{ marginTop: '0.5rem' }}>
            <a href={place.website} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '0.85rem', color: '#1c5373', textDecoration: 'none', wordBreak: 'break-all' }}>
              🌐 {place.website}
            </a>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#fff', padding: '0.75rem 1.5rem', margin: '0 -1.5rem',
        borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0',
        marginTop: '0.5rem',
      }}>
        <PlaceLikeButton placeId={place.id} initialLikeCount={place.likeCount ?? 0} />

        <span style={{ fontSize: '0.88rem', color: '#999', display: 'flex', alignItems: 'center', gap: '4px' }}>
          💬 {place.reviewCount ?? 0} 回覆
        </span>

        <ShareButton title={place.name} path={`/places/${place.id}`} />
      </div>

      {/* Map link */}
      {place.lat && place.lng && (
        <div style={{ textAlign: 'center', padding: '0.75rem 0' }}>
          <a
            href={`https://maps.google.com/?q=${place.lat},${place.lng}`}
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '0.85rem', color: '#1c5373', textDecoration: 'none' }}
          >
            📍 在 Google Maps 查看
          </a>
        </div>
      )}

      {/* Comments Section */}
      <PlaceComments placeId={place.id} />
    </>
  );
}
