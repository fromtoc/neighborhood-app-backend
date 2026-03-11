'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import CommunitySection from './CommunitySection';

interface Props {
  neighborhoodId: number;
  district: string;
  liName: string;
}

type SubTab = 'district' | 'li';

export default function CommunityTabSection({ neighborhoodId, district, liName }: Props) {
  const searchParams = useSearchParams();
  const initialSub = searchParams.get('sub') === 'li' ? 'li' : 'district';
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
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button style={tabStyle(subTab === 'district')} onClick={() => setSubTab('district')}>
          區社群
        </button>
        <button style={tabStyle(subTab === 'li')} onClick={() => setSubTab('li')}>
          里社群
        </button>
      </div>

      {subTab === 'district' && (
        <CommunitySection
          neighborhoodId={neighborhoodId}
          type="district_community"
          title={`${district} 區社群`}
          mode="community"
          scope="district"
        />
      )}

      {subTab === 'li' && (
        <CommunitySection
          neighborhoodId={neighborhoodId}
          type="li_community"
          title={`${liName} 里社群`}
          mode="community"
          scope="li"
        />
      )}
    </>
  );
}
