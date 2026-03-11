'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import { CLIENT_BASE_URL } from '@/lib/api';
import { dispatchAuthExpired } from '@/lib/auth-client';

type Mode = 'info' | 'community';

interface Props {
  neighborhoodId: number;
  mode?: Mode;
  scope?: string;
  defaultPostType?: string;
  allowedPostTypes?: string[];
  onCreated?: () => void;
}

const COMMUNITY_TYPES = [
  { value: 'fresh',        label: '新鮮事' },
  { value: 'store_visit',  label: '探店' },
  { value: 'selling',      label: '我要賣' },
  { value: 'renting',      label: '要出租' },
  { value: 'group_buy',    label: '發團購' },
  { value: 'group_event',  label: '揪團活動' },
  { value: 'free_give',    label: '免費贈' },
  { value: 'help',         label: '生活求助' },
  { value: 'want_rent',    label: '想承租' },
  { value: 'find',         label: '尋人找物' },
  { value: 'recruit',      label: '徵人求才' },
  { value: 'report',       label: '通報' },
];

const INFO_TYPES = [
  { value: 'district_info', label: '區資訊' },
  { value: 'li_info',       label: '里資訊' },
  { value: 'broadcast',     label: '廣播' },
];

const URGENCY_OPTIONS = [
  { value: 'normal', label: '一般' },
  { value: 'medium', label: '中等' },
  { value: 'urgent', label: '緊急' },
];

export default function CreatePostForm({ neighborhoodId, mode = 'community', scope, defaultPostType, allowedPostTypes, onCreated }: Props) {
  const { user, token, nickname, showLoginModal } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!expanded) return;
    function handleClickOutside(e: MouseEvent) {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [expanded]);

  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState(defaultPostType ?? (mode === 'info' ? 'district_info' : 'fresh'));
  const [urgency, setUrgency] = useState('normal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (images.length + files.length > 9) {
      setError('最多上傳 9 張圖片');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const urls: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${CLIENT_BASE_URL}/api/v1/images/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const json = await res.json();
        if (json.code !== 200) throw new Error(json.message ?? '上傳失敗');
        urls.push(json.data as string);
      }
      setImages(prev => [...prev, ...urls]);
    } catch (e) {
      setError('圖片上傳失敗：' + (e as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removeImage(idx: number) {
    setImages(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          neighborhoodId,
          title: title || undefined,
          content,
          type,
          scope: scope || undefined,
          urgency: mode === 'info' ? urgency : undefined,
          images: images.length > 0 ? images : undefined,
        }),
      });
      const json = await res.json();
      if (json.code === 401) { dispatchAuthExpired(); return; }
      if (json.code !== 200) throw new Error(json.message);
      setContent('');
      setTitle('');
      setImages([]);
      setType(defaultPostType ?? (mode === 'info' ? 'district_info' : 'fresh'));
      setUrgency('normal');
      setExpanded(false);
      onCreated?.();
    } catch (e) {
      setError('發文失敗：' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // 未登入 → 顯示訪客登入提示
  if (!user || !token) {
    return (
      <div style={{
        background: '#fff',
        border: '1px solid #e6e6e6',
        borderRadius: 10,
        padding: '1.25rem',
        marginBottom: '1rem',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '0.9rem', color: '#828282', marginBottom: '0.75rem' }}>
          登入後即可發表貼文
        </p>
        <button
          onClick={() => showLoginModal(neighborhoodId)}
          style={{
            background: '#1c5373',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '0.5rem 1.5rem',
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          登入
        </button>
      </div>
    );
  }

  const baseInfoTypes = allowedPostTypes
    ? INFO_TYPES.filter(t => allowedPostTypes.includes(t.value))
    : INFO_TYPES;
  const typeOptions = mode === 'info' ? baseInfoTypes : COMMUNITY_TYPES;
  const placeholder = mode === 'info' ? '發布在地資訊或廣播...' : '分享你的社區動態...';
  const selfName = user?.role === 'GUEST'
    ? `訪客 #${user.userId}`
    : (nickname || `用戶 #${user?.userId}`);
  const avatarLetter = selfName.charAt(0).toUpperCase();

  // 收合狀態：顯示一個簡單的輸入列
  if (!expanded) {
    return (
      <div
        onClick={() => setExpanded(true)}
        style={{
          background: '#fff',
          border: '1px solid #e6e6e6',
          borderRadius: 10,
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          cursor: 'text',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: '#1c5373', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
        }}>
          {avatarLetter}
        </div>
        <span style={{ fontSize: '0.9rem', color: '#bbb', flex: 1 }}>{placeholder}</span>
      </div>
    );
  }

  return (
    <div ref={formRef}>
    <form onSubmit={handleSubmit} style={{
      background: '#fff',
      border: '1px solid #e6e6e6',
      borderRadius: 10,
      padding: '1rem',
      marginBottom: '1rem',
    }}>
      {/* Header row: avatar + type selector + close */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: '#1c5373', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
        }}>
          {avatarLetter}
        </div>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          style={{
            border: '1px solid #e6e6e6', borderRadius: 6,
            padding: '0.25rem 0.5rem', fontSize: '0.8rem',
            color: '#555', background: '#f8f9f9',
          }}
        >
          {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {mode === 'info' && (
          <select
            value={urgency}
            onChange={e => setUrgency(e.target.value)}
            style={{
              border: '1px solid #e6e6e6', borderRadius: 6,
              padding: '0.25rem 0.5rem', fontSize: '0.8rem',
              color: urgency === 'urgent' ? '#c0392b' : urgency === 'medium' ? '#e67e22' : '#555',
              background: '#f8f9f9',
            }}
          >
            {URGENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        <button
          type="button"
          onClick={() => setExpanded(false)}
          style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            color: '#bbb', fontSize: '1.1rem', cursor: 'pointer', lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="標題（選填）"
        maxLength={255}
        style={{
          width: '100%', border: 'none', borderBottom: '1px solid #f0f0f0',
          padding: '0.4rem 0', marginBottom: '0.5rem',
          fontSize: '0.9rem', outline: 'none', background: 'transparent',
          boxSizing: 'border-box',
        }}
      />

      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={placeholder}
        required
        maxLength={5000}
        rows={3}
        autoFocus
        style={{
          width: '100%', border: 'none', resize: 'vertical',
          fontSize: '0.9rem', outline: 'none', background: 'transparent',
          lineHeight: 1.6, color: '#1e1e1e',
        }}
      />

      {/* Image previews */}
      {images.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: images.length === 1 ? '1fr' : 'repeat(3, 1fr)',
          gap: '0.4rem',
          marginTop: '0.5rem',
        }}>
          {images.map((url, i) => (
            <div key={i} style={{ position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`預覽 ${i + 1}`}
                style={{
                  width: '100%',
                  aspectRatio: images.length === 1 ? '16/9' : '1',
                  objectFit: 'cover',
                  borderRadius: 6,
                  display: 'block',
                  background: '#f3f3f3',
                }}
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 20, height: 20,
                  background: 'rgba(0,0,0,0.55)', color: '#fff',
                  border: 'none', borderRadius: '50%',
                  fontSize: '0.7rem', cursor: 'pointer', lineHeight: '20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bottom toolbar + submit */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', borderTop: '1px solid #f0f0f0', paddingTop: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          {/* 圖片上傳按鈕 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            style={{ display: 'none' }}
            onChange={handleImageSelect}
          />
          <button
            type="button"
            disabled={uploading || images.length >= 9}
            onClick={() => fileInputRef.current?.click()}
            title="新增圖片"
            style={{
              background: 'none', border: 'none',
              color: images.length >= 9 ? '#ccc' : '#1c5373',
              cursor: images.length >= 9 ? 'default' : 'pointer',
              fontSize: '1.2rem', padding: '0.2rem 0.4rem', lineHeight: 1,
            }}
          >
            {uploading ? '⏳' : '📷'}
          </button>
          {images.length > 0 && (
            <span style={{ fontSize: '0.75rem', color: '#999' }}>{images.length}/9</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {error
            ? <span style={{ fontSize: '0.8rem', color: '#e53e3e' }}>{error}</span>
            : <span style={{ fontSize: '0.75rem', color: '#bbb' }}>{content.length} / 5000</span>
          }
          <button
            type="submit"
            disabled={loading || !content.trim()}
            style={{
              background: content.trim() ? '#1c5373' : '#e6e6e6',
              color: content.trim() ? '#fff' : '#bbb',
              border: 'none', borderRadius: 8,
              padding: '0.4rem 1.2rem', fontSize: '0.85rem',
              cursor: content.trim() ? 'pointer' : 'default',
              transition: 'background 0.15s',
            }}
          >
            {loading ? '發送中...' : '發布'}
          </button>
        </div>
      </div>
    </form>
    </div>
  );
}
