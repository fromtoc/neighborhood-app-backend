'use client'

import React from 'react'

const URL_REGEX = /https?:\/\/[^\s\u3000\uff00-\uffef]+/g

/**
 * 將文字內容的 URL 轉為可點擊連結。
 * 特別處理「📰 閱讀全文：URL」格式，顯示為按鈕樣式。
 */
export default function ContentWithLinks({
  text,
  style,
}: {
  text: string
  style?: React.CSSProperties
}) {
  // 先處理「📰 閱讀全文：URL」整行，抽出後從 text 移除
  const readMoreMatch = text.match(/📰\s*閱讀全文[：:]\s*(https?:\/\/\S+)/)
  const readMoreUrl = readMoreMatch?.[1] ?? null
  const cleanText = text.replace(/📰[^\n]*\n?/, '').trimEnd()

  // 其餘文字中的 URL 轉連結
  const parts = cleanText.split(URL_REGEX)
  const urls = cleanText.match(URL_REGEX) ?? []

  const nodes: React.ReactNode[] = []
  parts.forEach((part, i) => {
    if (part) nodes.push(<span key={`t${i}`} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>)
    if (urls[i]) {
      nodes.push(
        <a
          key={`u${i}`}
          href={urls[i]}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#1c5373', wordBreak: 'break-all' }}
          onClick={e => e.stopPropagation()}
        >
          {urls[i]}
        </a>
      )
    }
  })

  return (
    <div style={style}>
      <p style={{ fontSize: '0.95rem', lineHeight: 1.8, color: '#2c2c2c', margin: 0 }}>{nodes}</p>
      {readMoreUrl && (
        <a
          href={readMoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            display: 'inline-block',
            marginTop: '0.75rem',
            padding: '6px 14px',
            borderRadius: 6,
            border: '1px solid #1c5373',
            color: '#1c5373',
            fontSize: '0.82rem',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          閱讀全文 →
        </a>
      )}
    </div>
  )
}
