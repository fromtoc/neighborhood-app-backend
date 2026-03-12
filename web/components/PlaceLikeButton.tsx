'use client';

import { useState } from 'react';
import { getToken, getUser } from '@/lib/auth-client';

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

export default function PlaceLikeButton({ placeId, initialLikeCount }: { placeId: number; initialLikeCount: number }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialLikeCount);
  const [busy, setBusy] = useState(false);

  const handleLike = async () => {
    const token = getToken();
    const user = getUser();
    if (!token || !user || user.role === 'GUEST') return;
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/v1/places/${placeId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.code === 200) {
        setLiked(json.data.liked);
        setCount(json.data.likeCount);
      }
    } catch { /* ignore */ }
    setBusy(false);
  };

  return (
    <button onClick={handleLike}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '0.88rem', color: liked ? '#e53e3e' : '#999',
        display: 'flex', alignItems: 'center', gap: '4px', padding: 0,
      }}>
      {liked ? '❤️' : '🤍'} {count} 喜歡
    </button>
  );
}
