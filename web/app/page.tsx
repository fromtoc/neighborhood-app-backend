import type { Metadata } from 'next';
import HomeContent from '@/components/HomeContent';

export const metadata: Metadata = {
  title: '巷口 GoLocal — 探索你的社區',
  description: '選擇你的里，掌握在地資訊、社群動態與天氣。',
};

export default function HomePage() {
  return <HomeContent />;
}
