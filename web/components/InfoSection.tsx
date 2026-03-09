'use client';

import { useState } from 'react';
import CommunitySection from './CommunitySection';

interface Props {
  neighborhoodId: number;
  district: string;
  liName: string;
}

type SubTab = 'district' | 'li';

export default function InfoSection({ neighborhoodId, district, liName }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('district');

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
          區資訊
        </button>
        <button style={tabStyle(subTab === 'li')} onClick={() => setSubTab('li')}>
          里資訊
        </button>
      </div>

      {subTab === 'district' && (
        <CommunitySection
          neighborhoodId={neighborhoodId}
          type="district_info"
          title={`${district} 區資訊`}
          mode="info"
          defaultPostType="district_info"
          allowedPostTypes={['district_info']}
        />
      )}

      {subTab === 'li' && (
        <CommunitySection
          neighborhoodId={neighborhoodId}
          type="li_info"
          title={`${liName} 里資訊`}
          mode="info"
          defaultPostType="li_info"
          allowedPostTypes={['li_info', 'broadcast']}
        />
      )}
    </>
  );
}
