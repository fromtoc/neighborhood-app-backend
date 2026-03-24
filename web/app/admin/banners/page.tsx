'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { CLIENT_BASE_URL } from '@/lib/api';

interface BannerSlot {
  id: number;
  name: string;
  label: string;
  maxItems: number;
  sortOrder: number;
  status: number;
}

interface BannerItem {
  id: number;
  slotId: number;
  sourceType: string;
  sourceId: number;
  imageUrl: string;
  title: string | null;
  sortOrder: number;
  status: number;
  startAt: string | null;
  endAt: string | null;
}

export default function AdminBannersPage() {
  const { token } = useAuth();
  const [slots, setSlots] = useState<BannerSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<BannerSlot | null>(null);
  const [items, setItems] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New slot form
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [slotFormData, setSlotFormData] = useState({ name: '', label: '', maxItems: '10' });

  // New item form
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<BannerItem | null>(null);
  const [formData, setFormData] = useState({
    sourceType: 'post',
    sourceId: '',
    imageUrl: '',
    title: '',
    sortOrder: '0',
  });

  // Source search
  interface SourceOption { sourceType: string; sourceId: number; title: string; coverImage: string | null; images: string[]; }
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [sourceSearch, setSourceSearch] = useState('');
  const [sourceType, setSourceType] = useState('info');
  const [loadingSources, setLoadingSources] = useState(false);
  const [selectedSource, setSelectedSource] = useState<SourceOption | null>(null);

  const sourceTypeLabel = (t: string) => {
    switch (t) {
      case 'info': return '資訊';
      case 'community': return '社群';
      case 'guide': return '巷口說明書';
      case 'place': return '店家';
      default: return t;
    }
  };

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchSlots = useCallback(async () => {
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/admin/banners/slots`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.code === 200) {
        setSlots(json.data);
        if (json.data.length > 0 && !selectedSlot) {
          setSelectedSlot(json.data[0]);
        }
      }
    } catch { setError('無法載入廣告位'); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchItems = useCallback(async (slotId: number) => {
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/admin/banners/slots/${slotId}/items`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.code === 200) setItems(json.data);
    } catch { setError('無法載入廣告項目'); }
  }, [token]);

  useEffect(() => { if (token) fetchSlots(); }, [token, fetchSlots]);
  useEffect(() => { if (selectedSlot) fetchItems(selectedSlot.id); }, [selectedSlot, fetchItems]);

  async function handleCreateSlot() {
    if (!slotFormData.name.trim() || !slotFormData.label.trim()) {
      setError('請填寫廣告位代碼和顯示名稱');
      return;
    }
    try {
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/admin/banners/slots`, {
        method: 'POST', headers,
        body: JSON.stringify({
          name: slotFormData.name.trim(),
          label: slotFormData.label.trim(),
          maxItems: Number(slotFormData.maxItems) || 10,
        }),
      });
      const json = await res.json();
      if (json.code === 200) {
        await fetchSlots();
        setSelectedSlot(json.data);
        setShowSlotForm(false);
        setSlotFormData({ name: '', label: '', maxItems: '10' });
      } else {
        setError(json.message);
      }
    } catch { setError('建立失敗'); }
  }

  async function fetchSources(type: string, keyword: string) {
    setLoadingSources(true);
    try {
      const params = new URLSearchParams({ type, limit: '20' });
      if (keyword) params.set('keyword', keyword);
      const res = await fetch(`${CLIENT_BASE_URL}/api/v1/admin/banners/sources?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.code === 200) setSources(json.data);
    } catch {}
    finally { setLoadingSources(false); }
  }

  function openCreateForm() {
    setEditItem(null);
    setSelectedSource(null);
    setFormData({ sourceType: 'post', sourceId: '', imageUrl: '', title: '', sortOrder: '0' });
    setSourceType('info');
    setSourceSearch('');
    setSources([]);
    setShowForm(true);
    fetchSources('info', '');
  }

  function openEditForm(item: BannerItem) {
    setEditItem(item);
    setFormData({
      sourceType: item.sourceType,
      sourceId: String(item.sourceId),
      imageUrl: item.imageUrl,
      title: item.title || '',
      sortOrder: String(item.sortOrder),
    });
    setShowForm(true);
  }

  async function handleSubmitItem() {
    if (!selectedSlot) return;
    const body: Record<string, unknown> = {
      slotId: selectedSlot.id,
      sourceType: formData.sourceType,
      sourceId: Number(formData.sourceId),
      imageUrl: formData.imageUrl,
      title: formData.title || null,
      sortOrder: Number(formData.sortOrder),
    };

    try {
      const url = editItem
        ? `${CLIENT_BASE_URL}/api/v1/admin/banners/items/${editItem.id}`
        : `${CLIENT_BASE_URL}/api/v1/admin/banners/items`;
      const res = await fetch(url, {
        method: editItem ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.code === 200) {
        setShowForm(false);
        fetchItems(selectedSlot.id);
      } else {
        setError(json.message);
      }
    } catch { setError('儲存失敗'); }
  }

  async function handleDeleteItem(id: number) {
    if (!confirm('確定刪除此廣告？')) return;
    try {
      await fetch(`${CLIENT_BASE_URL}/api/v1/admin/banners/items/${id}`, {
        method: 'DELETE', headers,
      });
      if (selectedSlot) fetchItems(selectedSlot.id);
    } catch { setError('刪除失敗'); }
  }

  async function handleToggleStatus(item: BannerItem) {
    try {
      await fetch(`${CLIENT_BASE_URL}/api/v1/admin/banners/items/${item.id}`, {
        method: 'PUT', headers,
        body: JSON.stringify({ status: item.status === 1 ? 0 : 1 }),
      });
      if (selectedSlot) fetchItems(selectedSlot.id);
    } catch { setError('更新失敗'); }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.5rem 0.75rem',
    border: '1px solid #ddd', borderRadius: 6, fontSize: '0.875rem',
    boxSizing: 'border-box',
  };

  if (loading) return <div style={{ padding: '2rem', color: '#bbb' }}>載入中...</div>;

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>廣告輪播管理</h1>
        <button onClick={() => setShowSlotForm(!showSlotForm)} style={{
          background: '#1c5373', color: '#fff', border: 'none', borderRadius: 6,
          padding: '0.4rem 1rem', fontSize: '0.8rem', cursor: 'pointer',
        }}>
          {showSlotForm ? '取消' : '+ 新增廣告位'}
        </button>
      </div>

      {error && (
        <p style={{ color: '#e53e3e', fontSize: '0.8rem', marginBottom: '1rem' }}>
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e' }}>✕</button>
        </p>
      )}

      {/* New slot form (inline) */}
      {showSlotForm && (
        <div style={{
          background: '#fff', border: '1px solid #e6e6e6', borderRadius: 8,
          padding: '1rem', marginBottom: '1rem',
          display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>廣告位代碼</label>
            <input
              type="text"
              value={slotFormData.name}
              onChange={e => setSlotFormData({ ...slotFormData, name: e.target.value })}
              placeholder="如 homepage_top"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>顯示名稱</label>
            <input
              type="text"
              value={slotFormData.label}
              onChange={e => setSlotFormData({ ...slotFormData, label: e.target.value })}
              placeholder="如 首頁頂部輪播"
              style={inputStyle}
            />
          </div>
          <div style={{ width: 80 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>上限</label>
            <input
              type="number"
              value={slotFormData.maxItems}
              onChange={e => setSlotFormData({ ...slotFormData, maxItems: e.target.value })}
              style={inputStyle}
            />
          </div>
          <button onClick={handleCreateSlot} style={{
            background: '#10b981', color: '#fff', border: 'none', borderRadius: 6,
            padding: '0.5rem 1rem', fontSize: '0.8rem', cursor: 'pointer', height: 36,
          }}>
            建立
          </button>
        </div>
      )}

      {/* Slot tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {slots.map(slot => (
          <button
            key={slot.id}
            onClick={() => setSelectedSlot(slot)}
            style={{
              padding: '0.4rem 1rem', borderRadius: 20,
              border: selectedSlot?.id === slot.id ? '2px solid #1c5373' : '1px solid #ddd',
              background: selectedSlot?.id === slot.id ? '#e8f4f8' : '#fff',
              color: selectedSlot?.id === slot.id ? '#1c5373' : '#555',
              fontWeight: selectedSlot?.id === slot.id ? 600 : 400,
              fontSize: '0.82rem', cursor: 'pointer',
            }}
          >
            {slot.label}
            <span style={{ fontSize: '0.7rem', color: '#999', marginLeft: '0.3rem' }}>({slot.name})</span>
          </button>
        ))}
      </div>

      {selectedSlot && (
        <>
          {/* Items header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
              {selectedSlot.label} — 廣告項目
            </h2>
            <button onClick={openCreateForm} style={{
              background: '#10b981', color: '#fff', border: 'none', borderRadius: 6,
              padding: '0.35rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer',
            }}>
              + 新增廣告
            </button>
          </div>

          {/* Items list */}
          {items.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#bbb', background: '#fff', borderRadius: 8 }}>
              尚無廣告項目，點擊上方按鈕新增
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {items.map(item => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  background: '#fff', borderRadius: 8, padding: '0.75rem',
                  border: '1px solid #e6e6e6',
                  opacity: item.status === 1 ? 1 : 0.5,
                }}>
                  {/* Preview */}
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" style={{
                      width: 120, height: 70, borderRadius: 6, flexShrink: 0,
                      objectFit: 'cover',
                    }} />
                  ) : (
                    <div style={{
                      width: 120, height: 70, borderRadius: 6, flexShrink: 0,
                      background: '#f0f0f0', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: '#bbb', fontSize: '0.7rem',
                    }}>無圖片</div>
                  )}

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: '0 0 0.2rem' }}>
                      {item.title || `${item.sourceType} #${item.sourceId}`}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#888', margin: 0 }}>
                      來源: {item.sourceType} #{item.sourceId} · 排序: {item.sortOrder}
                      {item.status === 0 && ' · 已停用'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <button onClick={() => handleToggleStatus(item)} style={{
                      padding: '0.25rem 0.5rem', fontSize: '0.72rem', borderRadius: 4,
                      border: '1px solid #ddd', background: '#fff', cursor: 'pointer',
                    }}>
                      {item.status === 1 ? '停用' : '啟用'}
                    </button>
                    <button onClick={() => openEditForm(item)} style={{
                      padding: '0.25rem 0.5rem', fontSize: '0.72rem', borderRadius: 4,
                      border: '1px solid #1c5373', color: '#1c5373', background: '#fff', cursor: 'pointer',
                    }}>
                      編輯
                    </button>
                    <button onClick={() => handleDeleteItem(item.id)} style={{
                      padding: '0.25rem 0.5rem', fontSize: '0.72rem', borderRadius: 4,
                      border: '1px solid #e53e3e', color: '#e53e3e', background: '#fff', cursor: 'pointer',
                    }}>
                      刪除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create/Edit modal */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 12, padding: '1.5rem',
            width: '95%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto',
          }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>
              {editItem ? '編輯廣告' : '新增廣告'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Source selection (only for new, not edit) */}
              {!editItem && (
                <>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <div style={{ width: 140 }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.25rem', display: 'block' }}>來源類型</label>
                      <select
                        value={sourceType}
                        onChange={e => { setSourceType(e.target.value); fetchSources(e.target.value, sourceSearch); }}
                        style={inputStyle}
                      >
                        <option value="info">資訊</option>
                        <option value="community">社群貼文</option>
                        <option value="guide">巷口說明書</option>
                        <option value="place">店家</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.25rem', display: 'block' }}>搜尋</label>
                      <input
                        type="text"
                        value={sourceSearch}
                        onChange={e => setSourceSearch(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') fetchSources(sourceType, sourceSearch); }}
                        placeholder="輸入關鍵字後按 Enter..."
                        style={inputStyle}
                      />
                    </div>
                    <button onClick={() => fetchSources(sourceType, sourceSearch)} style={{
                      padding: '0.5rem 0.75rem', background: '#1c5373', color: '#fff',
                      border: 'none', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer', height: 36,
                    }}>搜尋</button>
                  </div>

                  {/* Source list */}
                  <div style={{
                    maxHeight: 320, overflowY: 'auto', border: '1px solid #e6e6e6',
                    borderRadius: 8, background: '#fafafa',
                  }}>
                    {loadingSources ? (
                      <p style={{ padding: '1rem', textAlign: 'center', color: '#bbb', fontSize: '0.8rem' }}>搜尋中...</p>
                    ) : sources.length === 0 ? (
                      <p style={{ padding: '1rem', textAlign: 'center', color: '#bbb', fontSize: '0.8rem' }}>無結果</p>
                    ) : sources.map(src => (
                      <div
                        key={`${src.sourceType}-${src.sourceId}`}
                        onClick={() => {
                          setSelectedSource(src);
                          setFormData({
                            ...formData,
                            sourceType: src.sourceType,
                            sourceId: String(src.sourceId),
                            title: src.title || '',
                            imageUrl: src.coverImage || (src.images.length > 0 ? src.images[0] : ''),
                          });
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.6rem',
                          padding: '0.5rem 0.75rem', cursor: 'pointer',
                          background: selectedSource?.sourceId === src.sourceId && selectedSource?.sourceType === src.sourceType ? '#e8f4f8' : 'transparent',
                          borderBottom: '1px solid #eee',
                        }}
                      >
                        {src.coverImage ? (
                          <img src={src.coverImage} alt="" style={{ width: 48, height: 36, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 48, height: 36, borderRadius: 4, background: '#e6e6e6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#bbb' }}>無圖</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.82rem', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {src.title || `#${src.sourceId}`}
                          </p>
                          <p style={{ fontSize: '0.7rem', color: '#999', margin: 0 }}>
                            {sourceTypeLabel(src.sourceType)} #{src.sourceId} · {src.images.length} 張圖
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Image selection from source */}
                  {selectedSource && selectedSource.images.length > 0 && (
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.25rem', display: 'block' }}>選擇廣告圖片</label>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {selectedSource.images.map((img, i) => (
                          <div
                            key={i}
                            onClick={() => setFormData({ ...formData, imageUrl: img })}
                            style={{
                              width: 80, height: 56, borderRadius: 6, cursor: 'pointer',
                              border: formData.imageUrl === img ? '3px solid #1c5373' : '2px solid #e6e6e6',
                              backgroundImage: `url(${img})`,
                              backgroundSize: 'cover', backgroundPosition: 'center',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Edit mode: show source info */}
              {editItem && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.25rem', display: 'block' }}>來源</label>
                  <p style={{ fontSize: '0.85rem', color: '#555', margin: 0 }}>
                    {sourceTypeLabel(formData.sourceType)} #{formData.sourceId}
                  </p>
                </div>
              )}

              {/* Image: upload or URL */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.25rem', display: 'block' }}>
                  廣告圖片
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{
                    padding: '0.4rem 0.8rem', background: '#1c5373', color: '#fff',
                    borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-block',
                  }}>
                    上傳圖片
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !token) return;
                        const fd = new FormData();
                        fd.append('file', file);
                        try {
                          const res = await fetch(`${CLIENT_BASE_URL}/api/v1/images/upload`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}` },
                            body: fd,
                          });
                          const json = await res.json();
                          if (json.code === 200 && json.data) {
                            setFormData({ ...formData, imageUrl: json.data });
                          } else {
                            setError('圖片上傳失敗');
                          }
                        } catch { setError('圖片上傳失敗'); }
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#999' }}>或貼上圖片網址</span>
                </div>
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://..."
                  style={inputStyle}
                />
                {formData.imageUrl && (
                  <img src={formData.imageUrl} alt="preview" style={{ marginTop: '0.5rem', maxWidth: '100%', maxHeight: 140, borderRadius: 6, objectFit: 'cover' }} />
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.25rem', display: 'block' }}>標題（選填）</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="廣告標題"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.25rem', display: 'block' }}>排序（數字越小越前面）</label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={e => setFormData({ ...formData, sortOrder: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button onClick={() => setShowForm(false)} style={{
                padding: '0.4rem 1rem', border: '1px solid #ddd', borderRadius: 6,
                background: '#fff', cursor: 'pointer', fontSize: '0.85rem',
              }}>
                取消
              </button>
              <button onClick={handleSubmitItem} style={{
                padding: '0.4rem 1rem', border: 'none', borderRadius: 6,
                background: '#1c5373', color: '#fff', cursor: 'pointer', fontSize: '0.85rem',
              }}>
                {editItem ? '更新' : '建立'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
