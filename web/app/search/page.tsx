'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { saveLastNeighborhood } from '@/lib/last-neighborhood';
import { CLIENT_BASE_URL } from '@/lib/api';

interface Neighborhood {
  id: number;
  city: string;
  district: string;
  name: string;
  status: number;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get('q')?.trim() ?? '';
  const [results, setResults] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) { setResults([]); return; }
    setLoading(true);
    fetch(`${CLIENT_BASE_URL}/api/v1/neighborhoods?keyword=${encodeURIComponent(q)}&page=1&size=50`)
      .then(r => r.json())
      .then(d => setResults(d.data?.records ?? []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [q]);

  function handleSelect(n: Neighborhood) {
    saveLastNeighborhood({ city: n.city, district: n.district, li: n.name });
    router.push(`/${encodeURIComponent(n.city)}/${encodeURIComponent(n.district)}/${encodeURIComponent(n.name)}`);
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1c5373' }}>
          {q ? `「${q}」搜尋結果` : '搜尋'}
        </h1>
        {q && !loading && (
          <p style={{ fontSize: '0.82rem', color: '#828282', marginTop: '0.25rem' }}>
            共找到 {results.length} 個里
          </p>
        )}
      </div>

      {!q && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#bbb' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
          <p style={{ fontSize: '0.9rem' }}>請輸入關鍵字搜尋里名、縣市或地區</p>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#bbb' }}>
          <p style={{ fontSize: '0.9rem' }}>搜尋中...</p>
        </div>
      )}

      {!loading && q && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#bbb' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>😕</div>
          <p style={{ fontSize: '0.9rem' }}>找不到符合「{q}」的結果</p>
          <p style={{ fontSize: '0.82rem', marginTop: '0.5rem' }}>試試其他關鍵字，例如縣市、行政區或里名</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {results.map(n => (
            <button
              key={n.id}
              onClick={() => handleSelect(n)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.9rem 1.1rem',
                background: '#fff',
                border: '1px solid #e6e6e6',
                borderRadius: 10,
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1e1e1e' }}>
                  {n.name}
                  {n.status === 0 && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', color: '#bbb' }}>（未編定）</span>
                  )}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#828282', marginTop: '0.15rem' }}>
                  {n.city} · {n.district}
                </div>
              </div>
              <span style={{ color: '#bbb', fontSize: '0.9rem' }}>›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '3rem 0', color: '#bbb' }}>搜尋中...</div>}>
      <SearchContent />
    </Suspense>
  );
}
