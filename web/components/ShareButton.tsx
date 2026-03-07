'use client';

import { useState } from 'react';

interface Props {
  title: string;
  /** 絕對 URL 或相對路徑（相對路徑會自動加上 window.location.origin） */
  path?: string;
  style?: React.CSSProperties;
}

export default function ShareButton({ title, path, style }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareUrl = path
      ? path.startsWith('http') ? path : `${window.location.origin}${path}`
      : window.location.href;

    // 只在行動裝置使用 Web Share API，桌機直接複製連結
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleShare}
      style={{
        background: 'none',
        border: '1px solid #e6e6e6',
        borderRadius: 6,
        padding: '2px 10px',
        fontSize: '0.75rem',
        color: copied ? '#1c5373' : '#828282',
        cursor: 'pointer',
        transition: 'color 0.2s',
        ...style,
      }}
    >
      {copied ? '✅ 已複製' : '🔗 分享'}
    </button>
  );
}
