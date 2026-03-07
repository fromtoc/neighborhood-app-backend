'use client';

import { useRouter } from 'next/navigation';
import { saveLastNeighborhood } from '@/lib/last-neighborhood';

export default function SwitchNeighborhoodLink() {
  const router = useRouter();

  function handleSwitch() {
    saveLastNeighborhood({ city: '', district: '', li: '' });
    router.push('/');
  }

  return (
    <button
      onClick={handleSwitch}
      style={{
        background: 'none', border: '1px solid #e6e6e6',
        borderRadius: 6, padding: '0.2rem 0.6rem',
        fontSize: '0.72rem', color: '#828282', cursor: 'pointer',
      }}
    >
      切換
    </button>
  );
}
