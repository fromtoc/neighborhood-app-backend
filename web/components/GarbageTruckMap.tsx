'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { CLIENT_BASE_URL } from '@/lib/api';

import 'leaflet/dist/leaflet.css';

import { MapContainer, TileLayer, Marker, Popup, GeoJSON, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const truckIcon = L.divIcon({
  html: '<div style="font-size:1.6rem;text-align:center">🚛</div>',
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

interface Truck {
  carId: string;
  lat: number;
  lng: number;
  carType: string;
  addr: string;
  cleanStatus: string;
  status: string;
}

interface Props {
  neighborhoodId: number;
  city: string;
}

/** 在里邊界外面蓋一層半透明白色遮罩，凸顯里的範圍 */
function MaskOutside({ geojsonData }: { geojsonData: any }) {
  const maskData = useMemo(() => {
    // 超大外框（覆蓋整個地球）
    const outerRing: [number, number][] = [
      [-90, -180], [-90, 180], [90, 180], [90, -180], [-90, -180]
    ];

    // 從 GeoJSON 取得里的座標作為 hole
    let holes: [number, number][][] = [];
    try {
      const geo = typeof geojsonData === 'string' ? JSON.parse(geojsonData) : geojsonData;
      if (geo.type === 'Polygon') {
        // 反轉座標順序讓它成為 hole
        holes = geo.coordinates.map((ring: number[][]) =>
          ring.map((c: number[]) => [c[1], c[0]] as [number, number])
        );
      } else if (geo.type === 'MultiPolygon') {
        geo.coordinates.forEach((poly: number[][][]) => {
          poly.forEach((ring: number[][]) => {
            holes.push(ring.map((c: number[]) => [c[1], c[0]] as [number, number]));
          });
        });
      }
    } catch {}

    return [outerRing, ...holes];
  }, [geojsonData]);

  return (
    <Polygon
      positions={maskData}
      pathOptions={{
        color: 'transparent',
        fillColor: '#ffffff',
        fillOpacity: 0.55,
        stroke: false,
      }}
    />
  );
}

/** fitBounds + 多 zoom 半級讓邊界盡量填滿 */
function FitAndRestrict({ geojsonData }: { geojsonData: any }) {
  const map = useMap();
  useEffect(() => {
    if (!geojsonData) return;
    try {
      const layer = L.geoJSON(geojsonData);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        // 先用 fitBounds 取得最佳整數 zoom
        map.fitBounds(bounds, { padding: [10, 10] });
        // 再用 fractional zoom 多放大 0.5 級填滿留白
        const idealZoom = map.getBoundsZoom(bounds, false, L.point(10, 10));
        map.setZoom(idealZoom + 0.3, { animate: false });
        map.setMaxBounds(bounds.pad(0.15));
        map.setMinZoom(idealZoom - 1);
      }
    } catch {}
  }, [geojsonData, map]);
  return null;
}

export default function GarbageTruckMap({ neighborhoodId, city }: Props) {
  if (city !== '桃園市') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '3rem 1rem', color: '#999',
      }}>
        <span style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🚛</span>
        <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
          {city}垃圾車即將上線
        </p>
        <p style={{ fontSize: '0.82rem', color: '#bbb' }}>垃圾車路線與時間資訊敬請期待</p>
      </div>
    );
  }

  return <GarbageTruckMapInner neighborhoodId={neighborhoodId} />;
}

function GarbageTruckMapInner({ neighborhoodId }: { neighborhoodId: number }) {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [nhName, setNhName] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');
  const [geojsonStr, setGeojsonStr] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const geojsonData = useMemo(() => {
    if (!geojsonStr) return null;
    try { return JSON.parse(geojsonStr); } catch { return null; }
  }, [geojsonStr]);

  const fetchTrucks = useCallback(async () => {
    if (document.hidden) return;
    try {
      const res = await fetch(
        `${CLIENT_BASE_URL}/api/v1/garbage-trucks?neighborhoodId=${neighborhoodId}&radiusMeters=1000`
      );
      const json = await res.json();
      if (json.code === 200 && json.data) {
        setTrucks(json.data.trucks || []);
        if (json.data.center) {
          setCenter([json.data.center.lat, json.data.center.lng]);
        }
        setNhName(json.data.neighborhood || '');
        setLastUpdate(json.data.lastUpdate || '');
      }
    } catch {
    }
  }, [neighborhoodId]);

  const fetchBoundary = useCallback(async () => {
    try {
      const res = await fetch(
        `${CLIENT_BASE_URL}/api/v1/garbage-trucks/boundary?neighborhoodId=${neighborhoodId}`
      );
      const json = await res.json();
      if (json.code === 200 && json.data?.geojson) {
        setGeojsonStr(json.data.geojson);
      }
    } catch {}
  }, [neighborhoodId]);

  useEffect(() => {
    fetchTrucks();
    fetchBoundary();
    intervalRef.current = setInterval(fetchTrucks, 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchTrucks, fetchBoundary]);

  const mapCenter = center || [24.9936, 121.3010];

  return (
    <div>
      <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: '0.5rem' }}>
        <MapContainer
          center={mapCenter as [number, number]}
          zoom={16}
          zoomSnap={0.1}
          zoomDelta={0.5}
          style={{ height: 'calc(100vh - 220px)', minHeight: 400, width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {geojsonData && (
            <>
              <MaskOutside geojsonData={geojsonData} />
              <GeoJSON
                data={geojsonData}
                style={{ color: '#1c5373', weight: 2, fillColor: 'transparent', fillOpacity: 0 }}
              />
              <FitAndRestrict geojsonData={geojsonData} />
            </>
          )}

          {trucks.map((t) => t.lat !== 0 && t.lng !== 0 && (
            <Marker key={t.carId} position={[t.lat, t.lng]} icon={truckIcon}>
              <Popup>
                <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
                  <strong>{t.carId}</strong>
                  <br />
                  類型：{t.carType || '—'}
                  <br />
                  狀態：{t.cleanStatus || t.status || '—'}
                  <br />
                  位置：{t.addr || '—'}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* 資訊列 */}
      <div style={{ fontSize: '0.78rem', color: '#888', padding: '0.4rem 0', display: 'flex', justifyContent: 'space-between' }}>
        <span>{nhName} 附近 · {trucks.length} 台車</span>
        <span>
          {lastUpdate
            ? `${new Date(lastUpdate).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} 更新`
            : '等待資料中'}
        </span>
      </div>

      {/* 車輛列表 */}
      {trucks.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '1rem', color: '#aaa',
          background: '#fafafa', borderRadius: 8,
        }}>
          目前附近沒有垃圾車
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {trucks.map((t) => (
            <div key={t.carId} style={{
              background: '#fff', border: '1px solid #eee', borderRadius: 8,
              padding: '0.5rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>🚛 {t.carId}</div>
                <div style={{ fontSize: '0.75rem', color: '#888', marginTop: 2 }}>{t.addr || '位置更新中'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#555' }}>{t.carType || '—'}</div>
                <div style={{
                  fontSize: '0.7rem', marginTop: 2, padding: '1px 6px', borderRadius: 4,
                  background: t.cleanStatus === '清運中' ? '#e8f5e9' : '#f5f5f5',
                  color: t.cleanStatus === '清運中' ? '#2e7d32' : '#999',
                }}>
                  {t.cleanStatus || t.status || '—'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
