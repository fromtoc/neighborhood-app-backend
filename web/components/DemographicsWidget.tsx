'use client';

import { useEffect, useState } from 'react';
import { CLIENT_BASE_URL } from '@/lib/api';

interface Demographics {
  period: string;
  periodLabel: string;
  householdCount: number;
  populationTotal: number;
  populationMale: number;
  populationFemale: number;
  birthTotal: number;
  deathTotal: number;
  marryCount: number;
  divorceCount: number;
}

interface Props {
  neighborhoodId: number;
}

export default function DemographicsWidget({ neighborhoodId }: Props) {
  const [data, setData] = useState<Demographics | null>(null);

  useEffect(() => {
    fetch(`${CLIENT_BASE_URL}/api/v1/neighborhoods/${neighborhoodId}/demographics`)
      .then(r => r.json())
      .then(json => {
        if (json.code === 200 && json.data) setData(json.data);
      })
      .catch(() => {});
  }, [neighborhoodId]);

  if (!data) return null;

  const stats = [
    { label: '戶數', value: data.householdCount.toLocaleString(), icon: '🏠' },
    { label: '人口數', value: data.populationTotal.toLocaleString(), icon: '👥' },
    { label: '出生', value: data.birthTotal.toLocaleString(), icon: '👶' },
  ];

  return (
    <div style={{ margin: '1.25rem 0' }}>
      <div style={{
        background: '#fff', border: '1px solid #e6e6e6', borderRadius: 12,
        padding: '1rem',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '0.75rem',
        }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e1e1e', margin: 0 }}>
            人口統計
          </h3>
          <span style={{ fontSize: '0.68rem', color: '#bbb' }}>
            {data.periodLabel}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {stats.map(s => (
            <div key={s.label} style={{
              flex: 1, textAlign: 'center',
              background: '#f8f9f9', borderRadius: 8,
              padding: '0.6rem 0.4rem',
            }}>
              <div style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>{s.icon}</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1c5373' }}>
                {s.value}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '0.15rem' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: '0.6rem', fontSize: '0.62rem', color: '#bbb',
          textAlign: 'right',
        }}>
          資料來源：內政部戶政司
        </div>
      </div>
    </div>
  );
}
