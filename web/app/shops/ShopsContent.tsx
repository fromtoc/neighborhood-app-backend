'use client';

import NeighborhoodPageShell from '@/components/NeighborhoodPageShell';

export default function ShopsContent() {
  return (
    <NeighborhoodPageShell
      tab="shops"
      emptyIcon="🏪"
      emptyTitle="在地店家"
      emptyDesc="選擇你的社區，探索周邊餐飲、購物好去處"
    />
  );
}
