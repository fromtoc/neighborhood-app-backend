import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import ShareButton from '@/components/ShareButton';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://golocal.tw';

interface Post {
  id: number;
  neighborhoodId: number;
  userId: number;
  authorName: string | null;
  title: string | null;
  content: string;
  images: string[];
  type: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
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

export const revalidate = 60;
export const dynamicParams = true;

async function getPost(id: string): Promise<Post> {
  return apiFetch<Post>(`/api/v1/posts/${id}`);
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
    const post = await getPost(params.id);
    const title = post.title ?? post.content.slice(0, 40);
    const description = post.content.slice(0, 120).replace(/\n/g, ' ');
    const url = `/posts/${post.id}`;
    const ogImage = post.images[0] ?? undefined;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        type: 'article',
        publishedTime: post.createdAt,
        ...(ogImage ? { images: [{ url: ogImage }] } : {}),
      },
      alternates: { canonical: url },
    };
  } catch {
    return { title: '貼文不存在' };
  }
}

const TYPE_LABEL: Record<string, string> = {
  info:        '資訊',
  broadcast:   '廣播',
  fresh:       '新鮮事',
  store_visit: '探店',
  selling:     '我要賣',
  renting:     '要出租',
  group_buy:   '發團購',
  group_event: '揪團活動',
  free_give:   '免費贈',
  help:        '生活求助',
  want_rent:   '想承租',
  find:        '尋人找物',
  recruit:     '徵人求才',
  report:      '通報',
};

export default async function PostDetailPage({ params }: Props) {
  let post: Post;
  try {
    post = await getPost(params.id);
  } catch {
    notFound();
  }

  const nb = await getNeighborhood(post.neighborhoodId);

  const timeLabel = new Date(post.createdAt).toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const liUrl = nb
    ? `/${encodeURIComponent(nb.city)}/${encodeURIComponent(nb.district)}/${encodeURIComponent(nb.name)}`
    : null;

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title ?? post.content.slice(0, 110),
    description: post.content.slice(0, 200),
    datePublished: post.createdAt,
    author: { '@type': 'Person', name: post.authorName ?? `用戶 #${post.userId}` },
    url: `${SITE_URL}/posts/${post.id}`,
    ...(post.images[0] ? { image: post.images[0] } : {}),
    ...(nb
      ? {
          locationCreated: {
            '@type': 'Place',
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
            { '@type': 'ListItem', position: 5, name: post.title ?? '貼文', item: `${SITE_URL}/posts/${post.id}` },
          ]
        : [
            { '@type': 'ListItem', position: 2, name: post.title ?? '貼文', item: `${SITE_URL}/posts/${post.id}` },
          ]),
    ],
  };

  return (
    <>
      <Script id="article-jsonld" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
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
          <span style={{ color: '#1c5373', fontWeight: 600 }}>貼文</span>
        </div>
      </div>

      {/* Article */}
      <article className="section" style={{ marginTop: '1rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '1rem' }}>
          {TYPE_LABEL[post.type] && (
            <span style={{
              fontSize: '0.75rem', background: '#f0f7ff',
              color: '#1c5373', padding: '2px 8px', borderRadius: 4,
              marginBottom: '0.5rem', display: 'inline-block',
            }}>
              {TYPE_LABEL[post.type]}
            </span>
          )}
          {post.title && (
            <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e1e1e', marginTop: '0.4rem' }}>
              {post.title}
            </h1>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem', color: '#bbb', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <span>👤 {post.authorName ?? `用戶 #${post.userId}`}</span>
            <span>{timeLabel}</span>
            {nb && <span>📍 {nb.city}{nb.district}{nb.name}</span>}
          </div>
        </div>

        {/* Content */}
        <p style={{ fontSize: '0.95rem', lineHeight: 1.8, color: '#2c2c2c', whiteSpace: 'pre-wrap' }}>
          {post.content}
        </p>

        {/* Images */}
        {post.images.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {post.images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt={`圖片 ${i + 1}`}
                style={{ maxWidth: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 8 }}
              />
            ))}
          </div>
        )}

        {/* Stats + Share */}
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f0f0f0', fontSize: '0.85rem', color: '#828282', alignItems: 'center' }}>
          <span>❤️ {post.likeCount} 個讚</span>
          <span>💬 {post.commentCount} 則留言</span>
          <ShareButton title={post.title ?? post.content.slice(0, 40)} path={`/posts/${post.id}`} style={{ marginLeft: 'auto' }} />
        </div>

        {/* Back */}
        {liUrl && (() => {
          const isInfo = ['info', 'broadcast'].includes(post.type);
          return (
            <div style={{ marginTop: '1.25rem' }}>
              <Link
                href={`${liUrl}?tab=${isInfo ? 'info' : 'community'}`}
                style={{ fontSize: '0.85rem', color: '#1c5373', textDecoration: 'none' }}
              >
                ← 回到 {nb?.name} {isInfo ? '相關資訊' : '社群'}
              </Link>
            </div>
          );
        })()}
      </article>
    </>
  );
}
