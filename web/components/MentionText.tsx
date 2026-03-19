'use client';

import Link from 'next/link';

// 匹配 @[暱稱](userId) 格式
const MENTION_REGEX = /@\[([^\]]+)\]\((\d+)\)/g;

/** 把 @[暱稱](userId) 轉成純文字 @暱稱（用於預覽、通知等不需要連結的地方） */
export function stripMentionFormat(text: string): string {
  if (!text) return text;
  return text.replace(/@\[([^\]]+)\]\(\d+\)/g, '@$1');
}

interface Props {
  text: string;
  style?: React.CSSProperties;
}

export default function MentionText({ text, style }: Props) {
  if (!text) return null;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(MENTION_REGEX.source, 'g');
  while ((match = regex.exec(text)) !== null) {
    // 普通文字
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Mention 連結
    const nickname = match[1];
    const userId = match[2];
    parts.push(
      <Link
        key={`${userId}-${match.index}`}
        href={`/users/${userId}`}
        onClick={e => e.stopPropagation()}
        style={{
          color: '#1c5373',
          fontWeight: 600,
          textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        @{nickname}
      </Link>
    );
    lastIndex = match.index + match[0].length;
  }

  // 剩餘文字
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  // 沒有 mention，直接返回純文字
  if (parts.length === 0) return <span style={style}>{text}</span>;

  return <span style={style}>{parts}</span>;
}
