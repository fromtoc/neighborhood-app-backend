'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import CommunitySection from './CommunitySection';

interface Props {
  neighborhoodId: number;
  district: string;
  liName: string;
}

type SubTab = 'district' | 'li' | 'garbage';

export default function InfoSection({ neighborhoodId, district, liName }: Props) {
  const searchParams = useSearchParams();
  const subParam = searchParams.get('sub');
  const initialSub: SubTab = subParam === 'li' ? 'li' : subParam === 'garbage' ? 'garbage' : 'district';
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
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button style={tabStyle(subTab === 'district')} onClick={() => setSubTab('district')}>
          {district}
        </button>
        <button style={tabStyle(subTab === 'li')} onClick={() => setSubTab('li')}>
          {liName}
        </button>
        <button style={tabStyle(subTab === 'garbage')} onClick={() => setSubTab('garbage')}>
          垃圾車
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

      {subTab === 'garbage' && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '3rem 1rem', color: '#999',
        }}>
          <span style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🚛</span>
          <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>里垃圾車即將上線</p>
          <p style={{ fontSize: '0.82rem', color: '#bbb' }}>垃圾車路線與時間資訊敬請期待</p>
        </div>
      )}
    </>
  );
}
