'use client';

import NeighborhoodPageShell from '@/components/NeighborhoodPageShell';

export default function ChatContent() {
  return (
    <NeighborhoodPageShell
      tab="chat"
      emptyIcon="💬"
      emptyTitle="里民聊聊"
      emptyDesc="選擇你的社區，和鄰居即時互動"
    />
  );
}
