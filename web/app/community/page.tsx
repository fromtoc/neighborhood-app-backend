import type { Metadata } from 'next';
import CommunityContent from './CommunityContent';

export const metadata: Metadata = { title: '社群' };

export default function CommunityPage() {
  return <CommunityContent />;
}
