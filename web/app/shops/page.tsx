import type { Metadata } from 'next';
import ShopsContent from './ShopsContent';

export const metadata: Metadata = { title: '探店' };

export default function ShopsPage() {
  return <ShopsContent />;
}
