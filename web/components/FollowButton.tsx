'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { fetchFollowing, followNeighborhood, unfollowNeighborhood } from '@/lib/follow';

export default function FollowButton({ neighborhoodId }: { neighborhoodId: number }) {
  const { user, token } = useAuth();
  const [followed, setFollowed]   = useState(false);
  const [followCount, setCount]   = useState(0);
  const [loading, setLoading]     = useState(false);
  const [initialized, setInit]    = useState(false);

  useEffect(() => {
    if (!token) { setInit(true); return; }
    fetchFollowing(token).then(list => {
      setCount(list.length);
      setFollowed(list.some(n => n.id === neighborhoodId));
      setInit(true);
    }).catch(() => setInit(true));
  }, [token, neighborhoodId]);

  // 訪客不顯示
  if (!user || user.isGuest || !initialized) return null;

  async function handleClick() {
    if (!token || loading) return;
    setLoading(true);
    try {
      if (followed) {
        await unfollowNeighborhood(token, neighborhoodId);
        setFollowed(false);
        setCount(c => Math.max(0, c - 1));
      } else {
        if (followCount >= 3) {
          alert('最多只能關注 3 個里，請先取消關注其他里');
          return;
        }
        await followNeighborhood(token, neighborhoodId);
        setFollowed(true);
        setCount(c => c + 1);
      }
      window.dispatchEvent(new Event('follow-changed'));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : (followed ? '取消關注失敗' : '關注失敗'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        padding: '4px 12px',
        borderRadius: 20,
        border: '1.5px solid #1c5373',
        background: followed ? '#1c5373' : '#fff',
        color: followed ? '#fff' : '#1c5373',
        fontSize: '0.8rem',
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        transition: 'all 0.2s',
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      {followed ? '✓ 已關注' : '+ 關注'}
    </button>
  );
}
