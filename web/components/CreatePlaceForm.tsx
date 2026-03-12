'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getUser } from '@/lib/auth-client';

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

interface PlaceData {
  id: number;
  neighborhoodId: number;
  categoryId: number | null;
  categoryName: string | null;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  hours: string | null;
  coverImageUrl: string | null;
  tags: string[];
  hasHomeService: boolean;
  isPartner: boolean;
}

interface Props {
  neighborhoodId: number;
  editPlace?: PlaceData;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function CreatePlaceForm({ neighborhoodId, editPlace, onClose, onSuccess }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(!!editPlace);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const [categoryName, setCategoryName] = useState(editPlace?.categoryName ?? '');
  const [name, setName] = useState(editPlace?.name ?? '');
  const [description, setDescription] = useState(editPlace?.description ?? '');
  const [address, setAddress] = useState(editPlace?.address ?? '');
  const [phone, setPhone] = useState(editPlace?.phone ?? '');
  const [website, setWebsite] = useState(editPlace?.website ?? '');
  const [hours, setHours] = useState(editPlace?.hours ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState(editPlace?.coverImageUrl ?? '');
  const [tagsStr, setTagsStr] = useState(editPlace?.tags?.join(',') ?? '');
  const [hasHomeService, setHasHomeService] = useState(editPlace?.hasHomeService ?? false);
  const [isPartner, setIsPartner] = useState(editPlace?.isPartner ?? false);

  useEffect(() => {
    const user = getUser();
    if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
      setIsAdmin(true);
    }
  }, []);

  if (!isAdmin) return null;

  const isEdit = !!editPlace;

  const handleCancel = () => {
    setOpen(false);
    onClose?.();
  };

  const handleUploadCover = async (file: File) => {
    const token = getToken();
    if (!token) { setError('請先登入'); return; }
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API}/api/v1/images/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (json.code === 200) {
        setCoverImageUrl(json.data);
      } else {
        setError(json.message || '圖片上傳失敗');
      }
    } catch {
      setError('圖片上傳失敗');
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('店家名稱不得為空'); return; }
    const token = getToken();
    if (!token) { setError('請先登入'); return; }

    setSubmitting(true);
    setError('');

    const body: Record<string, unknown> = {
      neighborhoodId,
      categoryName: categoryName.trim() || null,
      name: name.trim(),
      description: description.trim() || null,
      address: address.trim() || null,
      phone: phone.trim() || null,
      website: website.trim() || null,
      hours: hours.trim() || null,
      coverImageUrl: coverImageUrl || null,
      tags: tagsStr.trim() ? tagsStr.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [],
      hasHomeService,
      isPartner,
    };

    const url = isEdit ? `${API}/api/v1/places/${editPlace.id}` : `${API}/api/v1/places`;
    const method = isEdit ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.code === 200) {
        if (!isEdit) {
          setName(''); setDescription(''); setAddress(''); setPhone('');
          setWebsite(''); setHours(''); setCoverImageUrl(''); setTagsStr('');
          setHasHomeService(false); setIsPartner(false); setCategoryName('');
        }
        setOpen(false);
        onClose?.();
        onSuccess?.();
        router.refresh();
      } else {
        setError(json.message || (isEdit ? '編輯失敗' : '新增失敗'));
      }
    } catch {
      setError('網路錯誤');
    }
    setSubmitting(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.5rem', borderRadius: 6,
    border: '1px solid #ddd', fontSize: '0.9rem', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: '0.2rem',
  };

  if (!open && !isEdit) {
    return (
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => setOpen(true)}
          style={{ background: '#1c5373', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer' }}>
          + 新增店家
        </button>
      </div>
    );
  }

  if (!open) return null;

  return (
    <div style={{ padding: '1rem', background: '#fafafa', borderRadius: 10, marginBottom: isEdit ? 0 : '1rem' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#333' }}>
        {isEdit ? '編輯店家' : '新增店家'}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div>
          <div style={labelStyle}>店家分類</div>
          <select value={categoryName} onChange={e => setCategoryName(e.target.value)}
            style={{ ...inputStyle, appearance: 'auto' }}>
            <option value="">請選擇分類</option>
            {['美食', '飲品', '生活百貨', '美容美髮', '醫療保健', '修繕服務', '教育學習', '寵物', '3C家電', '服飾'].map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={labelStyle}>店家名稱 *</div>
          <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="店家名稱" />
        </div>
        <div>
          <div style={labelStyle}>簡介</div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="店家簡介" />
        </div>
        <div>
          <div style={labelStyle}>地址</div>
          <input value={address} onChange={e => setAddress(e.target.value)} style={inputStyle} placeholder="地址" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <div>
            <div style={labelStyle}>電話</div>
            <input value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} placeholder="電話" />
          </div>
          <div>
            <div style={labelStyle}>網站</div>
            <input value={website} onChange={e => setWebsite(e.target.value)} style={inputStyle} placeholder="https://..." />
          </div>
        </div>
        <div>
          <div style={labelStyle}>營業時間</div>
          <input value={hours} onChange={e => setHours(e.target.value)} style={inputStyle} placeholder="例：週一至週五 9:00-18:00" />
        </div>
        <div>
          <div style={labelStyle}>封面圖片</div>
          <input ref={fileRef} type="file" accept="image/*"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadCover(f); }}
            style={{ display: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ background: '#eee', border: '1px solid #ddd', borderRadius: 6, padding: '0.4rem 0.75rem', fontSize: '0.85rem', cursor: 'pointer' }}>
              {uploading ? '上傳中...' : '選擇圖片'}
            </button>
            {coverImageUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverImageUrl} alt="cover" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 4 }} />
                <button type="button" onClick={() => setCoverImageUrl('')}
                  style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '0.8rem' }}>
                  移除
                </button>
              </div>
            )}
          </div>
        </div>
        <div>
          <div style={labelStyle}>標籤（逗號分隔）</div>
          <input value={tagsStr} onChange={e => setTagsStr(e.target.value)} style={inputStyle} placeholder="例：美食,咖啡,早午餐" />
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={hasHomeService} onChange={e => setHasHomeService(e.target.checked)} />
            到府服務
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={isPartner} onChange={e => setIsPartner(e.target.checked)} />
            合作夥伴
          </label>
        </div>
      </div>
      {error && <div style={{ color: '#e53e3e', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</div>}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <button onClick={handleSubmit} disabled={submitting}
          style={{ background: '#1c5373', color: '#fff', border: 'none', padding: '0.4rem 1rem', borderRadius: 6, fontSize: '0.85rem', cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
          {submitting ? (isEdit ? '儲存中...' : '新增中...') : (isEdit ? '儲存' : '確認新增')}
        </button>
        <button onClick={handleCancel}
          style={{ background: '#eee', color: '#666', border: 'none', padding: '0.4rem 1rem', borderRadius: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
          取消
        </button>
      </div>
    </div>
  );
}
