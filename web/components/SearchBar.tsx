'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState } from 'react';

function SearchBarInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(searchParams.get('q') ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleOpen() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false);
      setValue('');
    }
  }

  if (open) {
    return (
      <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (!value.trim()) setOpen(false); }}
          placeholder="搜尋里名 / 縣市 / 區..."
          style={{
            border: '1px solid #e6e6e6',
            borderRadius: 20,
            padding: '0.3rem 0.85rem',
            fontSize: '0.85rem',
            outline: 'none',
            width: 200,
            background: '#fafafa',
          }}
        />
        <button
          type="submit"
          style={{
            background: '#1c5373', color: '#fff',
            border: 'none', borderRadius: 20,
            padding: '0.3rem 0.75rem',
            fontSize: '0.82rem', cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          搜尋
        </button>
      </form>
    );
  }

  return (
    <button
      onClick={handleOpen}
      aria-label="搜尋"
      style={{
        background: 'none', border: 'none',
        cursor: 'pointer', padding: '0.3rem',
        fontSize: '1.1rem', color: '#828282',
        display: 'flex', alignItems: 'center',
      }}
    >
      🔍
    </button>
  );
}

export default function SearchBar() {
  return (
    <Suspense fallback={null}>
      <SearchBarInner />
    </Suspense>
  );
}
