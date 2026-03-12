'use client';

import { useState, useEffect } from 'react';
import { getUser } from '@/lib/auth-client';
import CreatePlaceForm from './CreatePlaceForm';

interface PlaceData {
  id: number;
  neighborhoodId: number;
  categoryId: number | null;
  categoryName: string | null;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  hours: string | null;
  coverImageUrl: string | null;
  tags: string[];
  hasHomeService: boolean;
  isPartner: boolean;
}

export default function PlaceEditButton({ place }: { place: PlaceData }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
      setIsAdmin(true);
    }
  }, []);

  if (!isAdmin) return null;

  if (editing) {
    return (
      <div style={{ marginTop: '0.5rem' }}>
        <CreatePlaceForm
          neighborhoodId={place.neighborhoodId}
          editPlace={place}
          onClose={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      style={{
        background: 'none', border: '1px solid #ddd', borderRadius: 4,
        padding: '2px 8px', fontSize: '0.75rem', color: '#888', cursor: 'pointer', marginTop: '0.25rem',
      }}
    >
      編輯
    </button>
  );
}
