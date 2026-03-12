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
  { value: 'fresh',        label: '動態' },
  { value: 'store_visit',  label: '踩點' },
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

/** Info mode: unified type+urgency options */
const INFO_UNIFIED_OPTIONS = [
  { value: 'post',             label: '貼文' },
  { value: 'broadcast_normal', label: '廣播(一般)' },
  { value: 'broadcast_medium', label: '廣播(中等)' },
  { value: 'broadcast_urgent', label: '廣播(緊急)' },
];

/** 各 post type 的專屬欄位定義 */
interface ExtraFieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
}

const EXTRA_FIELDS: Record<string, ExtraFieldDef[]> = {
  store_visit: [
    { key: 'shopName', label: '店家名稱', type: 'text', placeholder: '店家名稱' },
  ],
  selling: [
    { key: 'brandName', label: '品名/品牌', type: 'text', placeholder: '品名或品牌' },
    { key: 'price', label: '售價', type: 'text', placeholder: '例：100 元' },
    { key: 'quantity', label: '數量', type: 'text', placeholder: '例：1' },
    { key: 'condition', label: '狀態', type: 'select', options: [
      { value: '全新', label: '全新' }, { value: '二手', label: '二手' },
    ]},
  ],
  renting: [
    { key: 'rentalTarget', label: '出租項目', type: 'text', placeholder: '房屋/車位/物品...' },
    { key: 'price', label: '月租金', type: 'text', placeholder: '例：5000 元/月' },
  ],
  group_buy: [
    { key: 'brandName', label: '品名/品牌', type: 'text', placeholder: '品名或品牌' },
    { key: 'price', label: '團購價', type: 'text', placeholder: '例：200 元' },
    { key: 'minQty', label: '最低成團數', type: 'number', placeholder: '例：10' },
    { key: 'deadline', label: '截止日期', type: 'date' },
  ],
  free_give: [
    { key: 'brandName', label: '物品名稱', type: 'text', placeholder: '物品名稱' },
    { key: 'quantity', label: '數量', type: 'text', placeholder: '例：1' },
  ],
  want_rent: [
    { key: 'rentalTarget', label: '想租項目', type: 'text', placeholder: '房屋/車位/物品...' },
    { key: 'price', label: '預算', type: 'text', placeholder: '例：5000 元/月' },
  ],
  find: [
    { key: 'searchTarget', label: '尋找對象', type: 'text', placeholder: '人名/物品描述...' },
    { key: 'datetime', label: '最後出現時間', type: 'text', placeholder: '例：3/12 下午 2 點' },
  ],
  recruit: [
    { key: 'jobTitle', label: '職稱', type: 'text', placeholder: '例：店員' },
    { key: 'minSalary', label: '最低薪資', type: 'number', placeholder: '例：30000' },
    { key: 'maxSalary', label: '最高薪資', type: 'number', placeholder: '例：40000' },
    { key: 'jobType', label: '類型', type: 'select', options: [
      { value: '全職', label: '全職' }, { value: '兼職', label: '兼職' }, { value: '臨時', label: '臨時' },
    ]},
    { key: 'expiry', label: '截止日期', type: 'date' },
  ],
};

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #e6e6e6', borderRadius: 6,
  padding: '0.35rem 0.5rem', fontSize: '0.82rem', outline: 'none',
  background: '#fafafa', boxSizing: 'border-box',
};

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
  const [infoUnified, setInfoUnified] = useState('post');
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // 切換 type 時重設 extra
  function handleTypeChange(newType: string) {
    setType(newType);
    setExtra({});
  }

  function updateExtra(key: string, value: string) {
    setExtra(prev => ({ ...prev, [key]: value }));
  }

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
    // 驗證必填 extra 欄位
    const currentExtraFields = EXTRA_FIELDS[type] ?? [];
    for (const f of currentExtraFields) {
      if (!extra[f.key]?.trim()) {
        setError(`請填寫「${f.label}」`);
        return;
      }
    }
    setLoading(true);
    setError('');
    try {
      // 過濾空值 extra
      const extraClean = Object.fromEntries(
        Object.entries(extra).filter(([, v]) => v.trim())
      );

      // Derive actual type and urgency for info mode
      let submitType = type;
      let submitUrgency: string | undefined;
      if (mode === 'info') {
        if (infoUnified === 'post') {
          submitType = defaultPostType ?? 'district_info';
          submitUrgency = undefined;
        } else {
          submitType = 'broadcast';
          submitUrgency = infoUnified.replace('broadcast_', '');
        }
      }

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
          type: submitType,
          scope: scope || undefined,
          urgency: submitUrgency,
          images: images.length > 0 ? images : undefined,
          extra: Object.keys(extraClean).length > 0 ? extraClean : undefined,
        }),
      });
      const json = await res.json();
      if (json.code === 401) { dispatchAuthExpired(); return; }
      if (json.code !== 200) throw new Error(json.message);
      setContent('');
      setTitle('');
      setImages([]);
      setExtra({});
      setType(defaultPostType ?? (mode === 'info' ? 'district_info' : 'fresh'));
      setInfoUnified('post');
      setExpanded(false);
      onCreated?.();
    } catch (e) {
      setError('發文失敗：' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // 未登入
  if (!user || !token) {
    return (
      <div style={{
        background: '#fff', border: '1px solid #e6e6e6', borderRadius: 10,
        padding: '1.25rem', marginBottom: '1rem', textAlign: 'center',
      }}>
        <p style={{ fontSize: '0.9rem', color: '#828282', marginBottom: '0.75rem' }}>登入後即可發表貼文</p>
        <button onClick={() => showLoginModal(neighborhoodId)}
          style={{ background: '#1c5373', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
          登入
        </button>
      </div>
    );
  }

  const typeOptions = COMMUNITY_TYPES;
  const placeholder = mode === 'info' ? '發布在地資訊或廣播...' : '分享你的社區動態...';
  const selfName = user?.role === 'GUEST'
    ? `訪客 #${user.userId}`
    : (nickname || `用戶 #${user?.userId}`);
  const avatarLetter = selfName.charAt(0).toUpperCase();
  const extraFields = EXTRA_FIELDS[type] ?? [];

  // 收合狀態
  if (!expanded) {
    return (
      <div onClick={() => setExpanded(true)} style={{
        background: '#fff', border: '1px solid #e6e6e6', borderRadius: 10,
        padding: '0.75rem 1rem', marginBottom: '1rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'text',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', background: '#1c5373', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
        }}>{avatarLetter}</div>
        <span style={{ fontSize: '0.9rem', color: '#bbb', flex: 1 }}>{placeholder}</span>
      </div>
    );
  }

  return (
    <div ref={formRef}>
    <form onSubmit={handleSubmit} style={{
      background: '#fff', border: '1px solid #e6e6e6', borderRadius: 10,
      padding: '1rem', marginBottom: '1rem',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', background: '#1c5373', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
        }}>{avatarLetter}</div>
        {mode === 'info' ? (
          <select value={infoUnified} onChange={e => setInfoUnified(e.target.value)}
            style={{ border: '1px solid #e6e6e6', borderRadius: 6, padding: '0.25rem 0.5rem', fontSize: '0.8rem',
              color: infoUnified.includes('urgent') ? '#c0392b' : infoUnified.includes('medium') ? '#e67e22' : '#555', background: '#f8f9f9' }}>
            {INFO_UNIFIED_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <select value={type} onChange={e => handleTypeChange(e.target.value)}
            style={{ border: '1px solid #e6e6e6', borderRadius: 6, padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: '#555', background: '#f8f9f9' }}>
            {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        <button type="button" onClick={() => setExpanded(false)}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#bbb', fontSize: '1.1rem', cursor: 'pointer', lineHeight: 1 }}>
          ×
        </button>
      </div>

      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="標題（選填）" maxLength={255}
        style={{ width: '100%', border: 'none', borderBottom: '1px solid #f0f0f0', padding: '0.4rem 0', marginBottom: '0.5rem', fontSize: '0.9rem', outline: 'none', background: 'transparent', boxSizing: 'border-box' }} />

      <textarea value={content} onChange={e => setContent(e.target.value)} placeholder={placeholder}
        required maxLength={5000} rows={3} autoFocus
        style={{ width: '100%', border: 'none', resize: 'vertical', fontSize: '0.9rem', outline: 'none', background: 'transparent', lineHeight: 1.6, color: '#1e1e1e' }} />

      {/* 分類專屬欄位 */}
      {extraFields.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem', marginTop: '0.5rem', padding: '0.5rem', background: '#f8f9fa', borderRadius: 8 }}>
          {extraFields.map(f => (
            <label key={f.key} style={{ fontSize: '0.78rem', color: '#555' }}>
              {f.label} <span style={{ color: '#e53e3e' }}>*</span>
              {f.type === 'select' ? (
                <select value={extra[f.key] ?? ''} onChange={e => updateExtra(f.key, e.target.value)}
                  required
                  style={{ ...inputStyle, marginTop: 2 }}>
                  <option value="">請選擇</option>
                  {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input
                  type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                  value={extra[f.key] ?? ''}
                  onChange={e => updateExtra(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  required
                  style={{ ...inputStyle, marginTop: 2 }}
                />
              )}
            </label>
          ))}
        </div>
      )}

      {/* Image previews */}
      {images.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: images.length === 1 ? '1fr' : 'repeat(3, 1fr)', gap: '0.4rem', marginTop: '0.5rem' }}>
          {images.map((url, i) => (
            <div key={i} style={{ position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`預覽 ${i + 1}`}
                style={{ width: '100%', aspectRatio: images.length === 1 ? '16/9' : '1', objectFit: 'cover', borderRadius: 6, display: 'block', background: '#f3f3f3' }} />
              <button type="button" onClick={() => removeImage(i)}
                style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', fontSize: '0.7rem', cursor: 'pointer', lineHeight: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bottom toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', borderTop: '1px solid #f0f0f0', paddingTop: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple style={{ display: 'none' }} onChange={handleImageSelect} />
          <button type="button" disabled={uploading || images.length >= 9} onClick={() => fileInputRef.current?.click()} title="新增圖片"
            style={{ background: 'none', border: 'none', color: images.length >= 9 ? '#ccc' : '#1c5373', cursor: images.length >= 9 ? 'default' : 'pointer', fontSize: '1.2rem', padding: '0.2rem 0.4rem', lineHeight: 1 }}>
            {uploading ? '⏳' : '📷'}
          </button>
          {images.length > 0 && <span style={{ fontSize: '0.75rem', color: '#999' }}>{images.length}/9</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {error
            ? <span style={{ fontSize: '0.8rem', color: '#e53e3e' }}>{error}</span>
            : <span style={{ fontSize: '0.75rem', color: '#bbb' }}>{content.length} / 5000</span>}
          <button type="submit" disabled={loading || !content.trim()}
            style={{ background: content.trim() ? '#1c5373' : '#e6e6e6', color: content.trim() ? '#fff' : '#bbb', border: 'none', borderRadius: 8, padding: '0.4rem 1.2rem', fontSize: '0.85rem', cursor: content.trim() ? 'pointer' : 'default', transition: 'background 0.15s' }}>
            {loading ? '發送中...' : '發布'}
          </button>
        </div>
      </div>
    </form>
    </div>
  );
}
