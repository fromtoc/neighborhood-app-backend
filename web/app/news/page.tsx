import type { Metadata } from 'next';
import NewsContent from './NewsContent';

export const metadata: Metadata = { title: '資訊' };

export default function NewsPage() {
  return <NewsContent />;
}
