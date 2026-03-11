'use client';

import { useState } from 'react';
import ChatSection from './ChatSection';
import DistrictChatSection from './DistrictChatSection';

interface Props {
  neighborhoodId: number;
  neighborhoodName: string;
  city: string;
  district: string;
}

type SubTab = 'district' | 'li';

export default function ChatTabSection({ neighborhoodId, neighborhoodName, city, district }: Props) {
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
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button style={tabStyle(subTab === 'district')} onClick={() => setSubTab('district')}>
          區來聊聊
        </button>
        <button style={tabStyle(subTab === 'li')} onClick={() => setSubTab('li')}>
          里來聊聊
        </button>
      </div>

      {subTab === 'district' && (
        <DistrictChatSection city={city} district={district} />
      )}

      {subTab === 'li' && (
        <ChatSection neighborhoodId={neighborhoodId} neighborhoodName={neighborhoodName} />
      )}
    </>
  );
}
