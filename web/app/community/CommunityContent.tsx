'use client';

import NeighborhoodPageShell from '@/components/NeighborhoodPageShell';

export default function CommunityContent() {
  return (
    <NeighborhoodPageShell
      tab="community"
      emptyIcon="👥"
      emptyTitle="社群動態"
      emptyDesc="選擇你的社區，加入居民討論、分享在地生活"
    />
  );
}
