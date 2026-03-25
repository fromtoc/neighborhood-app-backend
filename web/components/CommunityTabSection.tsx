'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import CommunitySection from './CommunitySection';
import AnimatedTabs from './AnimatedTabs';

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

  const communityTabs = [
    { key: 'district', label: district },
    { key: 'li', label: liName },
  ];

  return (
    <>
      <AnimatedTabs tabs={communityTabs} activeKey={subTab} onTabChange={(key) => setSubTab(key as SubTab)} />

      {subTab === 'district' && (
        <CommunitySection
          neighborhoodId={neighborhoodId}
          type="district_community"
          title=""
          mode="community"
          scope="district"
        />
      )}

      {subTab === 'li' && (
        <CommunitySection
          neighborhoodId={neighborhoodId}
          type="li_community"
          title=""
          mode="community"
          scope="li"
        />
      )}
    </>
  );
}
