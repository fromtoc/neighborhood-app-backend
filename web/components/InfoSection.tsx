'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import CommunitySection from './CommunitySection';
import AnimatedTabs from './AnimatedTabs';

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
  const initialSub: SubTab = subParam === 'li' ? 'li' : subParam === 'garbage' ? 'garbage' : subParam === 'guide' ? 'guide' : 'district';
  const [subTab, setSubTab] = useState<SubTab>(initialSub);

  const infoTabs = [
    { key: 'district', label: district },
    { key: 'li', label: liName },
    { key: 'garbage', label: '垃圾車' },
    { key: 'guide', label: '巷口說明書' },
  ];

  return (
    <>
      {/* 子 Tab */}
      <AnimatedTabs tabs={infoTabs} activeKey={subTab} onTabChange={(key) => setSubTab(key as SubTab)} />

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
