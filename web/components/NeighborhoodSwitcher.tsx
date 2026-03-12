'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { fetchFollowing, type FollowedNeighborhood } from '@/lib/follow';
import { getToken } from '@/lib/auth-client';

const LS_KEY = 'golocal_active_village_id';

/** Format village label matching app: "district · name〔alias〕" */
function villageLabel(f: FollowedNeighborhood): string {
  const alias = f.alias ? `〔${f.alias}〕` : '';
  return `${f.district} · ${f.name}${alias}`;
}

export default function NeighborhoodSwitcher() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [follows, setFollows] = useState<FollowedNeighborhood[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isGuest = !user || user.role === 'GUEST';

  const load = useCallback(async () => {
    const t = token || getToken();
    if (!t || isGuest) return;
    try {
      const data = await fetchFollowing(t);
      setFollows(data.follows);
      const savedId = localStorage.getItem(LS_KEY);
      const saved = savedId ? Number(savedId) : null;
      if (saved && data.follows.some(f => f.id === saved)) {
        setActiveId(saved);
      } else {
        const def = data.follows.find(f => f.isDefault) || data.follows[0];
        if (def) {
          setActiveId(def.id);
          localStorage.setItem(LS_KEY, String(def.id));
        }
      }
    } catch { /* ignore */ }
  }, [token, isGuest]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    function handler() { load(); }
    window.addEventListener('follow-changed', handler);
    return () => window.removeEventListener('follow-changed', handler);
  }, [load]);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  if (isGuest || follows.length === 0) return null;

  const active = follows.find(f => f.id === activeId) || follows[0];

  const handleSelect = (f: FollowedNeighborhood) => {
    setActiveId(f.id);
    localStorage.setItem(LS_KEY, String(f.id));
    setOpen(false);
    router.push(`/${encodeURIComponent(f.city)}/${encodeURIComponent(f.district)}/${encodeURIComponent(f.name)}`);
  };

  // Single follow — static display, click navigates
  if (follows.length === 1) {
    return (
      <button
        onClick={() => handleSelect(active)}
        style={{
          background: 'none', border: 'none',
          padding: '0.3rem 0.5rem', fontSize: '0.82rem', color: '#1c5373',
          cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: '0.3rem',
        }}
      >
        <span style={{ fontSize: '0.9rem' }}>&#x1F4CD;</span>
        {villageLabel(active)}
      </button>
    );
  }

  // Multiple follows — dropdown
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none',
          padding: '0.3rem 0.5rem', fontSize: '0.82rem', color: '#1c5373',
          cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: '0.3rem',
        }}
      >
        <span style={{ fontSize: '0.9rem' }}>&#x1F4CD;</span>
        {villageLabel(active)}
        <span style={{ fontSize: '0.65rem', color: '#999', marginLeft: '0.1rem' }}>
          {open ? '\u25B2' : '\u25BC'}
        </span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          background: '#fff', border: '1px solid #e6e6e6', borderRadius: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 220,
          zIndex: 200, overflow: 'hidden',
        }}>
          <div style={{
            padding: '0.6rem 1rem 0.4rem', fontSize: '0.78rem',
            fontWeight: 700, color: '#999', textAlign: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}>
            切換關注里
          </div>
          {follows.map((f, i) => {
            const isActive = f.id === activeId;
            return (
              <button
                key={f.id}
                onClick={() => handleSelect(f)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', textAlign: 'left',
                  padding: '0.7rem 1rem',
                  background: isActive ? 'rgba(217, 170, 56, 0.08)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  borderBottom: i < follows.length - 1 ? '1px solid #f5f5f5' : 'none',
                }}
              >
                <span style={{
                  fontSize: '0.9rem',
                  color: isActive ? '#b8860b' : '#333',
                  fontWeight: isActive ? 600 : 400,
                }}>
                  {villageLabel(f)}
                  {f.isDefault && (
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 600,
                      marginLeft: '0.4rem', padding: '1px 5px',
                      borderRadius: 4,
                      background: 'rgba(217, 170, 56, 0.13)', color: '#b8860b',
                    }}>
                      預設
                    </span>
                  )}
                </span>
                {isActive && (
                  <span style={{ color: '#b8860b', fontSize: '1rem' }}>&#10003;</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
