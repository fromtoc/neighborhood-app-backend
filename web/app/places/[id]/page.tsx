import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import ShareButton from '@/components/ShareButton';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://golocal.tw';

interface Place {
  id: number;
  neighborhoodId: number;
  categoryId: number | null;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  hours: string | null;
  lat: number | null;
  lng: number | null;
  coverImageUrl: string | null;
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

      {/* Breadcrumb */}
      <div className="location-bar" style={{ margin: '-1.5rem -1.5rem 0', padding: '0.5rem 1.5rem' }}>
        <div className="inner">
          <Link href="/">首頁</Link>
          {nb && liUrl && (
            <>
              <span className="sep">›</span>
              <Link href={`/${encodeURIComponent(nb.city)}`}>{nb.city}</Link>
              <span className="sep">›</span>
              <Link href={`/${encodeURIComponent(nb.city)}/${encodeURIComponent(nb.district)}`}>{nb.district}</Link>
              <span className="sep">›</span>
              <Link href={liUrl}>{nb.name}</Link>
            </>
          )}
          <span className="sep">›</span>
          <span style={{ color: '#1c5373', fontWeight: 600 }}>{place.name}</span>
        </div>
      </div>

      {/* Place Card */}
      <div className="section" style={{ marginTop: '1rem' }}>
        {/* Cover Image */}
        {place.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={place.coverImageUrl}
            alt={place.name}
            style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 10, marginBottom: '1rem' }}
          />
        )}

        {/* Name */}
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e1e1e', marginBottom: '0.75rem' }}>
          🏪 {place.name}
        </h1>

        {/* Description */}
        {place.description && (
          <p style={{ fontSize: '0.95rem', color: '#444', lineHeight: 1.7, marginBottom: '1rem' }}>
            {place.description}
          </p>
        )}

        {/* Info rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem', color: '#555' }}>
          {place.address && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span>📍</span>
              <span>{place.address}</span>
            </div>
          )}
          {place.phone && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span>📞</span>
              <a href={`tel:${place.phone}`} style={{ color: '#1c5373', textDecoration: 'none' }}>
                {place.phone}
              </a>
            </div>
          )}
          {place.hours && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span>🕐</span>
              <span style={{ whiteSpace: 'pre-wrap' }}>{place.hours}</span>
            </div>
          )}
          {place.website && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span>🌐</span>
              <a
                href={place.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#1c5373', textDecoration: 'none', wordBreak: 'break-all' }}
              >
                {place.website}
              </a>
            </div>
          )}
          {nb && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span>🏘️</span>
              <span>{nb.city}{nb.district}{nb.name}</span>
            </div>
          )}
        </div>

        {/* Share */}
        <div style={{ marginTop: '1.25rem' }}>
          <ShareButton title={place.name} path={`/places/${place.id}`} />
        </div>

        {/* Map link */}
        {place.lat && place.lng && (
          <a
            href={`https://maps.google.com/?q=${place.lat},${place.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block', marginTop: '1rem',
              background: '#1c5373', color: '#fff',
              padding: '0.5rem 1.25rem', borderRadius: 8,
              fontSize: '0.85rem', textDecoration: 'none',
            }}
          >
            在 Google Maps 查看
          </a>
        )}

        {/* Back */}
        {liUrl && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f0f0f0' }}>
            <Link
              href={liUrl ? `${liUrl}?tab=shops` : '/shops'}
              style={{ fontSize: '0.85rem', color: '#1c5373', textDecoration: 'none' }}
            >
              ← 回到 {nb?.name} 在地店家
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
