'use client';

const KEY = 'golocal_last_neighborhood';

export interface LastNeighborhood {
  city: string;
  district: string;
  li: string;
}

export function saveLastNeighborhood(data: LastNeighborhood) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getLastNeighborhood(): LastNeighborhood | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LastNeighborhood) : null;
  } catch {
    return null;
  }
}
