'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import { CLIENT_BASE_URL } from '@/lib/api';

interface MentionCandidate {
  id: number;
  nickname: string;
  avatarUrl: string | null;
  badge: string | null;
}

// mention entry: 記錄每次 @ 的暱稱和 userId
export interface MentionEntry { nickname: string; userId: number; }
export type MentionMap = MentionEntry[];

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** 当 mention 发生变化时通知父组件 */
  onMentionsChange?: (mentions: MentionMap) => void;
  neighborhoodId: number;
  scope?: 'li' | 'district';
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  style?: React.CSSProperties;
  onSubmit?: () => void;
}

const AVATAR_COLORS = ['#e53935','#8e24aa','#1e88e5','#43a047','#fb8c00','#00acc1','#6d4c41','#546e7a'];

/** 提交前把 @暱稱 轉成 @[暱稱](userId) 格式 */
export function applyMentions(text: string, mentions: MentionMap): string {
  let result = text;
  // 按暱稱長度倒序替換（避免短暱稱誤匹配長暱稱的子串）
  const sorted = [...mentions].sort((a, b) => b.nickname.length - a.nickname.length);
  for (const { nickname, userId } of sorted) {
    result = result.replace(
      new RegExp(`@${nickname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`, 'g'),
      `@[${nickname}](${userId})`
    );
  }
  return result;
}

export default function MentionInput({
  value, onChange, onMentionsChange, neighborhoodId, scope = 'li',
  placeholder, maxLength, disabled, multiline, rows = 1,
  style, onSubmit,
}: Props) {
  const { token } = useAuth();
  const [candidates, setCandidates] = useState<MentionCandidate[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const mentionsRef = useRef<MentionEntry[]>([]);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // 搜尋候選人
  const searchCandidates = useCallback(async (keyword: string) => {
    if (!token) { setCandidates([]); return; }
    try {
      const res = await fetch(
        `${CLIENT_BASE_URL}/api/v1/users/mention-candidates?keyword=${encodeURIComponent(keyword)}&neighborhoodId=${neighborhoodId}&scope=${scope}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (json.code === 200) setCandidates(json.data ?? []);
    } catch {
      setCandidates([]);
    }
  }, [token, neighborhoodId, scope]);

  // 監聽輸入，偵測 @ 觸發
  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) {
    const newValue = e.target.value;
    // 先取游標位置（必須在 onChange 觸發 re-render 之前）
    const cursorPos = e.target.selectionStart ?? newValue.length;
    onChange(newValue);

    const textBefore = newValue.slice(0, cursorPos);
    const atIdx = textBefore.lastIndexOf('@');

    if (atIdx >= 0) {
      const charBefore = atIdx > 0 ? textBefore[atIdx - 1] : ' ';
      if (atIdx === 0 || charBefore === ' ' || charBefore === '\n') {
        const query = textBefore.slice(atIdx + 1);
        if (!query.includes(' ') && query.length <= 20) {
          setMentionQuery(query);
          setMentionStart(atIdx);
          setShowDropdown(true);
          setSelectedIdx(0);
          if (searchTimeout.current) clearTimeout(searchTimeout.current);
          if (query.length === 0) {
            searchCandidates('');
          } else {
            searchTimeout.current = setTimeout(() => searchCandidates(query), 200);
          }
          return;
        }
      }
    }
    setShowDropdown(false);
  }

  // 選擇候選人
  function selectCandidate(candidate: MentionCandidate) {
    const before = value.slice(0, mentionStart);
    const after = value.slice(mentionStart + 1 + mentionQuery.length);
    // 輸入框顯示 @暱稱，mentionsList 記住 {nickname, userId}
    const mention = `@${candidate.nickname} `;
    // 避免重複記錄同一用戶
    if (!mentionsRef.current.some(m => m.userId === candidate.id)) {
      mentionsRef.current.push({ nickname: candidate.nickname, userId: candidate.id });
    }
    onMentionsChange?.([...mentionsRef.current]);
    onChange(before + mention + after);
    setShowDropdown(false);
    setCandidates([]);
    setTimeout(() => {
      const el = inputRef.current;
      if (el) {
        const pos = before.length + mention.length;
        el.setSelectionRange(pos, pos);
        el.focus();
      }
    }, 0);
  }

  // 中文輸入法組字中標記
  const composingRef = useRef(false);

  // 鍵盤導航
  function handleKeyDown(e: React.KeyboardEvent) {
    // 輸入法組字中，不攔截任何按鍵
    if (composingRef.current) return;

    if (showDropdown && candidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx(i => (i + 1) % candidates.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(i => (i - 1 + candidates.length) % candidates.length);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        selectCandidate(candidates[selectedIdx]);
        return;
      } else if (e.key === 'Escape') {
        setShowDropdown(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey && !multiline && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  }

  // 點外部關閉
  useEffect(() => {
    if (!showDropdown) return;
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showDropdown]);

  const inputProps = {
    ref: inputRef as any,
    value,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    onCompositionStart: () => { composingRef.current = true; },
    onCompositionEnd: () => { composingRef.current = false; },
    placeholder,
    maxLength,
    disabled,
    style: {
      width: '100%', border: 'none', outline: 'none', resize: 'none' as const,
      fontSize: '0.9rem', fontFamily: 'inherit', color: '#1e1e1e',
      background: 'transparent', ...style,
    },
  };

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      {multiline ? (
        <textarea {...inputProps} rows={rows} />
      ) : (
        <input {...inputProps} />
      )}

      {/* @ Mention 下拉 */}
      {showDropdown && (
        <div ref={dropdownRef} style={{
          position: 'absolute', bottom: '100%', left: 0, right: 0,
          background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10,
          boxShadow: '0 -4px 16px rgba(0,0,0,0.1)',
          maxHeight: 220, overflowY: 'auto', zIndex: 100,
          marginBottom: 4,
        }}>
          {candidates.length === 0 ? (
            <div style={{ padding: '0.6rem 0.75rem', fontSize: '0.82rem', color: '#bbb', textAlign: 'center' }}>
              沒有找到用戶
            </div>
          ) : candidates.map((c, i) => (
            <div
              key={c.id}
              onClick={() => selectCandidate(c)}
              onMouseEnter={() => setSelectedIdx(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 0.75rem', cursor: 'pointer',
                background: i === selectedIdx ? '#f0f7ff' : '#fff',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: c.avatarUrl ? undefined : AVATAR_COLORS[c.id % AVATAR_COLORS.length],
                backgroundImage: c.avatarUrl ? `url(${c.avatarUrl})` : undefined,
                backgroundSize: 'cover',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: 700, color: '#fff',
              }}>
                {!c.avatarUrl && c.nickname.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e1e1e' }}>{c.nickname}</span>
              {c.badge && (
                <span style={{ fontSize: '0.6rem', background: '#E6FCF5', color: '#047857', padding: '1px 4px', borderRadius: 3, fontWeight: 600 }}>{c.badge}</span>
              )}
            </div>
          ))
          }
        </div>
      )}
    </div>
  );
}
