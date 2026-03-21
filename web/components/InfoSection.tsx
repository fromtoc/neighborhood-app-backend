'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import CommunitySection from './CommunitySection';

const GarbageTruckMap = dynamic(() => import('./GarbageTruckMap'), { ssr: false });

interface Props {
  neighborhoodId: number;
  city: string;
  district: string;
  liName: string;
}

type SubTab = 'district' | 'li' | 'garbage' | 'guide';

export default function InfoSection({ neighborhoodId, city, district, liName }: Props) {
  const searchParams = useSearchParams();
  const subParam = searchParams.get('sub');
  const initialSub: SubTab = subParam === 'li' ? 'li' : (subParam === 'garbage' && city === '桃園市') ? 'garbage' : subParam === 'guide' ? 'guide' : 'district';
  const [subTab, setSubTab] = useState<SubTab>(initialSub);

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
    <>
      {/* 子 Tab */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button style={tabStyle(subTab === 'district')} onClick={() => setSubTab('district')}>
          {district}
        </button>
        <button style={tabStyle(subTab === 'li')} onClick={() => setSubTab('li')}>
          {liName}
        </button>
        {city === '桃園市' && (
          <button style={tabStyle(subTab === 'garbage')} onClick={() => setSubTab('garbage')}>
            垃圾車
          </button>
        )}
        <button style={tabStyle(subTab === 'guide')} onClick={() => setSubTab('guide')}>
          巷口說明書
        </button>
      </div>

      {subTab === 'district' && (
        <CommunitySection
          neighborhoodId={neighborhoodId}
          type="district_info"
          title=""
          mode="info"
          defaultPostType="district_info"
          allowedPostTypes={['district_info']}
        />
      )}

      {subTab === 'li' && (
        <CommunitySection
          neighborhoodId={neighborhoodId}
          type="li_info"
          title=""
          mode="info"
          defaultPostType="li_info"
          allowedPostTypes={['li_info', 'broadcast']}
        />
      )}

      {subTab === 'garbage' && city === '桃園市' && (
        <GarbageTruckMap neighborhoodId={neighborhoodId} city={city} />
      )}

      {subTab === 'guide' && (
        <CommunitySection
          neighborhoodId={neighborhoodId}
          type="guide"
          title=""
          mode="info"
          defaultPostType="guide"
          allowedPostTypes={['guide']}
        />
      )}
    </>
  );
}
