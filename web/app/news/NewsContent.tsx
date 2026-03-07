'use client';

import NeighborhoodPageShell from '@/components/NeighborhoodPageShell';

export default function NewsContent() {
  return (
    <NeighborhoodPageShell
      tab="info"
      emptyIcon="📰"
      emptyTitle="里長資訊"
      emptyDesc="選擇你的社區，瀏覽里長公告與在地資訊"
    />
  );
}
