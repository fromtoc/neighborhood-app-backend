'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CreatePlaceForm from './CreatePlaceForm';
import PlaceEditButton from './PlaceEditButton';

const SHOP_CATEGORIES = ['全部', '美食', '飲品', '生活百貨', '美容美髮', '醫療保健', '修繕服務', '教育學習', '寵物', '3C家電', '服飾'];
const SORT_OPTIONS: { label: string; value: string }[] = [
  { label: '最新到最舊', value: 'newest' },
  { label: '最舊到最新', value: 'oldest' },
  { label: '評分最高', value: 'rating' },
];

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

function StarRating({ rating }: { rating: number }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) stars.push(<span key={i} style={{ color: '#FACC15' }}>★</span>);
    else if (rating >= i - 0.5) stars.push(<span key={i} style={{ color: '#FACC15' }}>★</span>);
    else stars.push(<span key={i} style={{ color: '#D1D5DB' }}>☆</span>);
  }
  return <span style={{ display: 'inline-flex', gap: '1px', fontSize: '0.8rem' }}>{stars}</span>;
}

type SubTab = 'li' | 'district';

interface Props {
  neighborhoodId: number;
  city: string;
  district: string;
  liName: string;
  initialPlaces: PlaceItem[];
  initialDistrictPlaces?: PlaceItem[];
}

export default function ShopsSection({ neighborhoodId, city, district, liName, initialPlaces, initialDistrictPlaces = [] }: Props) {
  const router = useRouter();
  const [subTab, setSubTab] = useState<SubTab>('district');
  const [liPlaces, setLiPlaces] = useState<PlaceItem[]>(initialPlaces);
  const [districtPlaces, setDistrictPlaces] = useState<PlaceItem[]>(initialDistrictPlaces);
  const places = subTab === 'li' ? liPlaces : districtPlaces;

  const [searchInput, setSearchInput] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [sortOrder, setSortOrder] = useState('newest');
  const [showCategories, setShowCategories] = useState(false);
  const [showSort, setShowSort] = useState(false);

  const filtered = useMemo(() => {
    let list = [...places];
    if (selectedCategory !== '全部') {
      list = list.filter(p => p.categoryName === selectedCategory);
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.address && p.address.toLowerCase().includes(q)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q))
      );
    }
    if (sortOrder === 'rating') {
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortOrder === 'oldest') {
      list.reverse();
    }
    return list;
  }, [places, selectedCategory, searchText, sortOrder]);

  const doSearch = () => setSearchText(searchInput);

  const handlePlaceCreated = () => {
    router.refresh();
  };

  // Sync when initialPlaces changes (after router.refresh())
  const [prevInitial, setPrevInitial] = useState(initialPlaces);
  if (initialPlaces !== prevInitial) {
    setPrevInitial(initialPlaces);
    setLiPlaces(initialPlaces);
  }
  const [prevDistrictInitial, setPrevDistrictInitial] = useState(initialDistrictPlaces);
  if (initialDistrictPlaces !== prevDistrictInitial) {
    setPrevDistrictInitial(initialDistrictPlaces);
    setDistrictPlaces(initialDistrictPlaces);
  }

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortOrder)?.label ?? '最新到最舊';

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.45rem 1.1rem',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.88rem',
    fontWeight: active ? 700 : 400,
    background: active ? '#1c5373' : '#f0f0f0',
    color: active ? '#fff' : '#555',
    transition: 'background 0.15s, color 0.15s',
  });

  return (
    <div className="section">
      {/* Sub tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button style={tabStyle(subTab === 'district')} onClick={() => { setSubTab('district'); setSearchInput(''); setSearchText(''); setSelectedCategory('全部'); }}>
          {district}
        </button>
        <button style={tabStyle(subTab === 'li')} onClick={() => { setSubTab('li'); setSearchInput(''); setSearchText(''); setSelectedCategory('全部'); }}>
          {liName}
        </button>
      </div>

      {/* 店家優惠 */}
      <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #eee' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <span style={{ fontSize: '1.1rem' }}>🏷️</span>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#1c5373' }}>店家優惠</span>
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '2rem 1rem', color: '#999',
          background: '#fafafa', borderRadius: 12,
        }}>
          <span style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎁</span>
          <p style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.2rem', color: '#888' }}>店家優惠即將上線</p>
          <p style={{ fontSize: '0.8rem', color: '#bbb' }}>在地店家專屬優惠敬請期待</p>
        </div>
      </div>

      {/* Search bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: '#f5f5f5', borderRadius: 10, padding: '8px 12px', marginBottom: '10px',
      }}>
        <span style={{ fontSize: '1rem', color: '#999' }}>🔍</span>
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') doSearch(); }}
          placeholder="搜尋店家名稱、地址..."
          style={{
            flex: 1, border: 'none', background: 'transparent', outline: 'none',
            fontSize: '0.9rem', color: '#333', padding: 0,
          }}
        />
        {searchInput && (
          <button onClick={() => { setSearchInput(''); setSearchText(''); }}
            style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}>
            ✕
          </button>
        )}
        <button onClick={doSearch}
          style={{
            background: '#C8A951', color: '#fff', border: 'none', borderRadius: 10,
            padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
          }}>
          搜尋
        </button>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '12px', gap: '10px',
      }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Category dropdown */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setShowCategories(!showCategories); setShowSort(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '7px 14px', borderRadius: 10, border: '1px solid #ddd',
                background: '#fff', fontSize: '0.85rem', color: '#555', cursor: 'pointer', fontWeight: 500,
              }}>
              {selectedCategory}
              <span style={{ fontSize: '0.7rem' }}>▼</span>
            </button>
            {showCategories && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 20,
                background: '#fff', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                border: '1px solid #eee', minWidth: 160, overflow: 'hidden',
              }}>
                {SHOP_CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => { setSelectedCategory(cat); setShowCategories(false); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px',
                      border: 'none', background: selectedCategory === cat ? '#f0f7ff' : 'transparent',
                      fontSize: '0.85rem', cursor: 'pointer',
                      color: selectedCategory === cat ? '#1c5373' : '#555',
                      fontWeight: selectedCategory === cat ? 600 : 400,
                    }}>
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort dropdown */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setShowSort(!showSort); setShowCategories(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '7px 14px', borderRadius: 10, border: '1px solid #ddd',
                background: '#fff', fontSize: '0.85rem', color: '#555', cursor: 'pointer', fontWeight: 500,
              }}>
              {currentSortLabel}
              <span style={{ fontSize: '0.7rem' }}>▼</span>
            </button>
            {showSort && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 20,
                background: '#fff', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                border: '1px solid #eee', minWidth: 140, overflow: 'hidden',
              }}>
                {SORT_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => { setSortOrder(opt.value); setShowSort(false); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px',
                      border: 'none', background: sortOrder === opt.value ? '#f0f7ff' : 'transparent',
                      fontSize: '0.85rem', cursor: 'pointer',
                      color: sortOrder === opt.value ? '#1c5373' : '#555',
                      fontWeight: sortOrder === opt.value ? 600 : 400,
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <span style={{ fontSize: '0.82rem', color: '#999', fontWeight: 500 }}>
          {filtered.length} 間店家
        </span>
      </div>

      {/* Close dropdowns on outside click */}
      {(showCategories || showSort) && (
        <div onClick={() => { setShowCategories(false); setShowSort(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
      )}

      {subTab === 'li' && <CreatePlaceForm neighborhoodId={neighborhoodId} onSuccess={handlePlaceCreated} />}

      {/* Shop list */}
      {filtered.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(p => (
            <div key={p.id} style={{
              background: '#fff', borderRadius: 12, overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'relative',
            }}>
              {p.isPartner && (
                <div style={{
                  position: 'absolute', top: 10, right: 10, zIndex: 2,
                  background: '#C8A951', color: '#fff', fontSize: '0.68rem', fontWeight: 700,
                  padding: '3px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: '3px',
                }}>
                  巷口特約
                </div>
              )}

              <Link href={`/places/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ display: 'flex', padding: '12px', gap: '12px' }}>
                  {p.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.coverImageUrl} alt={p.name}
                      style={{ width: 100, height: 100, borderRadius: 10, objectFit: 'cover', flexShrink: 0, background: '#f0f0f0' }} />
                  ) : (
                    <div style={{
                      width: 100, height: 100, borderRadius: 10, background: '#f0f0f0', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#ccc',
                    }}>🏪</div>
                  )}

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e1e1e' }}>{p.name}</div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <StarRating rating={p.rating ?? 0} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#555' }}>{(p.rating ?? 0).toFixed(1)}</span>
                      <span style={{ fontSize: '0.75rem', color: '#999' }}>({p.reviewCount ?? 0})</span>
                    </div>

                    {p.address && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: '#777' }}>
                        <span style={{ fontSize: '0.8rem' }}>📍</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.address}</span>
                      </div>
                    )}

                    {p.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: '#777' }}>
                        <span style={{ fontSize: '0.8rem' }}>📞</span>
                        <span>{p.phone}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                      {p.categoryName && (
                        <span style={{
                          fontSize: '0.7rem', background: '#FFF7ED', color: '#C2410C',
                          padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                        }}>{p.categoryName}</span>
                      )}
                      {p.tags && p.tags.length > 0 && p.tags.map((tag, i) => (
                        <span key={i} style={{
                          fontSize: '0.7rem', background: '#f0f0f0', color: '#666',
                          padding: '2px 8px', borderRadius: 4, fontWeight: 500,
                        }}>#{tag}</span>
                      ))}
                      {p.hasHomeService && (
                        <span style={{
                          fontSize: '0.7rem', background: '#EBF5FF', color: '#1c5373',
                          padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                          display: 'inline-flex', alignItems: 'center', gap: '3px',
                        }}>🚗 到府服務</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>

              <div style={{ padding: '0 12px 8px' }}>
                <PlaceEditButton place={p} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🏪</div>
          <p>{searchText || selectedCategory !== '全部' ? '沒有找到相關店家' : subTab === 'li' ? '此里尚無店家資料' : '此區尚無其他里的店家資料'}</p>
        </div>
      )}
    </div>
  );
}
