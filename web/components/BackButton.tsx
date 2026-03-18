'use client';

export default function BackButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => history.back()}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        fontSize: '0.85rem', color: '#1c5373',
      }}
    >
      ← 回到{label}
    </button>
  );
}
