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
  neighborhoodName?: string;
}

export default function DemographicsWidget({ neighborhoodId, neighborhoodName }: Props) {
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
    <div style={{ margin: '1rem 0', textAlign: 'center' }}>
      <div style={{
        borderTop: '1px solid rgba(28, 83, 115, 0.15)',
        paddingTop: '0.75rem',
      }}>
        <div style={{ fontSize: '0.78rem', color: '#666' }}>
          {neighborhoodName}・戶數 {data.householdCount.toLocaleString()}・人口 {data.populationTotal.toLocaleString()}・出生總數 {data.birthTotal.toLocaleString()}
        </div>
        <div style={{ fontSize: '0.6rem', color: '#bbb', marginTop: '0.3rem' }}>
          資料來源：戶政司
        </div>
      </div>
    </div>
  );
}
