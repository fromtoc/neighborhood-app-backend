'use client';

import { useEffect } from 'react';
import { saveLastNeighborhood } from '@/lib/last-neighborhood';

export default function SaveNeighborhood({
  city, district, li,
}: {
  city: string; district: string; li: string;
}) {
  useEffect(() => {
    saveLastNeighborhood({ city, district, li });
  }, [city, district, li]);

  return null; // 純側效，不渲染任何 DOM
}
