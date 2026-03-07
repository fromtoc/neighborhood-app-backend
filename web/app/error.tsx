'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2 style={{ marginBottom: '1rem', color: '#991b1b' }}>發生錯誤</h2>
      <p style={{ color: '#555', marginBottom: '1.5rem' }}>{error.message}</p>
      <button
        onClick={reset}
        style={{
          padding: '0.5rem 1.25rem',
          background: '#0070f3',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        重試
      </button>
    </div>
  );
}
