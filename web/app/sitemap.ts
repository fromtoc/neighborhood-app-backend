import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://golocal.tw';
const API_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

interface ApiResponse<T> {
  code: number;
  data: T;
}

async function safeApiFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json: ApiResponse<T> = await res.json();
    return json.code === 200 ? json.data : null;
  } catch {
    return null;
  }
}

export const revalidate = 86400; // 每天重新產生

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
  ];

  const cities = await safeApiFetch<string[]>('/api/v1/geo/cities');
  if (!cities) return entries;

  for (const city of cities) {
    const cityUrl = `${SITE_URL}/${encodeURIComponent(city)}`;
    entries.push({ url: cityUrl, changeFrequency: 'weekly', priority: 0.8 });

    const districts = await safeApiFetch<string[]>(
      `/api/v1/geo/districts?city=${encodeURIComponent(city)}`,
    );
    if (!districts) continue;

    // 並行取所有里
    const lisPerDistrict = await Promise.all(
      districts.map(async (district) => {
        const lis = await safeApiFetch<{ id: number; name: string }[]>(
          `/api/v1/geo/lis?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`,
        );
        return { district, lis: lis ?? [] };
      }),
    );

    for (const { district, lis } of lisPerDistrict) {
      const districtUrl = `${SITE_URL}/${encodeURIComponent(city)}/${encodeURIComponent(district)}`;
      entries.push({ url: districtUrl, changeFrequency: 'weekly', priority: 0.7 });

      for (const li of lis) {
        entries.push({
          url: `${districtUrl}/${encodeURIComponent(li.name)}`,
          changeFrequency: 'daily',
          priority: 0.6,
        });
      }
    }
  }

  return entries;
}
