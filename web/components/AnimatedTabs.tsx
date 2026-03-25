'use client';

import { useState, useRef, useEffect } from 'react';

interface Tab {
  key: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  activeKey: string;
  onTabChange: (key: string) => void;
}

export default function AnimatedTabs({ tabs, activeKey, onTabChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeIndex = tabs.findIndex(t => t.key === activeKey);
    if (activeIndex < 0) return;
    const btn = container.children[activeIndex] as HTMLElement;
    if (!btn) return;
    setIndicatorStyle({
      left: btn.offsetLeft,
      width: btn.offsetWidth,
    });
  }, [activeKey, tabs]);

  return (
    <div style={{ position: 'relative', borderBottom: '1px solid #e5e5e5', background: '#fff' }}>
      <div ref={containerRef} style={{ display: 'flex' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            style={{
              flex: 1,
              padding: '0.7rem 0.5rem',
              background: 'none',
              border: 'none',
              fontSize: '0.9rem',
              fontWeight: activeKey === tab.key ? 600 : 400,
              color: activeKey === tab.key ? '#1C5373' : '#999',
              cursor: 'pointer',
              transition: 'color 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          height: 2,
          background: '#D4911C',
          borderRadius: 1,
          transition: 'left 0.25s ease, width 0.25s ease',
          left: indicatorStyle.left,
          width: indicatorStyle.width,
        }}
      />
    </div>
  );
}
