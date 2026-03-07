import { NextResponse } from 'next/server';

const CWA_KEY = process.env.CWA_API_KEY ?? 'CWA-000248A6-64BE-4F2D-B284-DC2E4E9EAE2D';

export interface WeatherPeriod {
  startTime: string;
  endTime:   string;
  wx:        string;
  wxCode:    number;
  pop:       string;
  minT:      string;
  maxT:      string;
}

/* ── CWA F-C0032-001（縣市36小時預報）────────────────── */
async function fromCwa(city: string): Promise<WeatherPeriod[] | null> {
  try {
    const url =
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001` +
      `?Authorization=${CWA_KEY}&format=JSON&locationName=${encodeURIComponent(city)}`;
    const res = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = await res.json();
    const location = data?.records?.location?.[0];
    if (!location) return null;

    const map: Record<string, { startTime: string; endTime: string; parameter: { parameterName: string; parameterValue?: string } }[]> = {};
    for (const el of location.weatherElement) map[el.elementName] = el.time;

    return (map['Wx'] ?? []).map((wx: { startTime: string; endTime: string; parameter: { parameterName: string; parameterValue?: string } }, i: number) => ({
      startTime: wx.startTime,
      endTime:   wx.endTime,
      wx:        wx.parameter.parameterName,
      wxCode:    Number(wx.parameter.parameterValue ?? 0),
      pop:       map['PoP']?.[i]?.parameter?.parameterName ?? '0',
      minT:      map['MinT']?.[i]?.parameter?.parameterName ?? '-',
      maxT:      map['MaxT']?.[i]?.parameter?.parameterName ?? '-',
    }));
  } catch {
    return null;
  }
}

/* ── WMO code → Chinese label ──────────────────────────── */
function wmoLabel(code: number): string {
  if (code === 0)  return '晴天';
  if (code === 1)  return '大致晴朗';
  if (code === 2)  return '局部多雲';
  if (code === 3)  return '陰天';
  if (code <= 48)  return '霧';
  if (code <= 55)  return '毛毛雨';
  if (code <= 57)  return '凍雨';
  if (code === 61) return '小雨';
  if (code === 63) return '中雨';
  if (code <= 65)  return '大雨';
  if (code <= 77)  return '降雪';
  if (code <= 82)  return '短暫陣雨';
  if (code <= 86)  return '陣雪';
  if (code === 95) return '雷雨';
  return '強雷雨';
}

/* ── Open-Meteo fallback（逐小時 → 聚合3時段）─────────── */
async function fromOpenMeteo(lat: number, lng: number): Promise<WeatherPeriod[] | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&hourly=temperature_2m,precipitation_probability,weather_code` +
      `&timezone=Asia%2FTaipei&forecast_days=2`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return null;

    const data = await res.json();
    const times: string[] = data.hourly.time;
    const temps: number[] = data.hourly.temperature_2m;
    const pops:  number[] = data.hourly.precipitation_probability;
    const codes: number[] = data.hourly.weather_code;

    // Taiwan local date from first entry
    const todayStr    = times[0].slice(0, 10);
    const tomorrowStr = new Date(new Date(todayStr).getTime() + 86400000)
      .toISOString().slice(0, 10);

    const defs = [
      { start: `${todayStr}T06:00`,    end: `${todayStr}T18:00`    },
      { start: `${todayStr}T18:00`,    end: `${tomorrowStr}T06:00` },
      { start: `${tomorrowStr}T06:00`, end: `${tomorrowStr}T18:00` },
    ];

    const labels = ['今日白天', '今晚明晨', '明日白天'];

    return defs.map((def, idx) => {
      const idxs = times.reduce<number[]>((acc, t, i) => {
        if (t >= def.start && t < def.end) acc.push(i);
        return acc;
      }, []);

      if (idxs.length === 0) {
        return { startTime: def.start, endTime: def.end, wx: labels[idx], wxCode: 0, pop: '0', minT: '-', maxT: '-' };
      }

      const periodTemps = idxs.map(i => temps[i]).filter(v => v != null);
      const periodPops  = idxs.map(i => pops[i]).filter(v => v != null);
      const periodCodes = idxs.map(i => codes[i]).filter(v => v != null);

      // Dominant WMO code
      const cnt: Record<number, number> = {};
      for (const c of periodCodes) cnt[c] = (cnt[c] ?? 0) + 1;
      const domCode = Number(Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0]);

      return {
        startTime: def.start.replace('T', ' ') + ':00',
        endTime:   def.end.replace('T', ' ') + ':00',
        wx:        wmoLabel(domCode),
        wxCode:    domCode,
        pop:       String(Math.round(Math.max(...periodPops))),
        minT:      String(Math.round(Math.min(...periodTemps))),
        maxT:      String(Math.round(Math.max(...periodTemps))),
      };
    });
  } catch {
    return null;
  }
}

/* ── Route Handler ─────────────────────────────────────── */
export async function GET(req: Request) {
  const sp   = new URL(req.url).searchParams;
  const city = sp.get('city') ?? '';
  const lat  = parseFloat(sp.get('lat') ?? '');
  const lng  = parseFloat(sp.get('lng') ?? '');

  // Try CWA first, fallback to Open-Meteo
  const cwa = city ? await fromCwa(city) : null;
  if (cwa && cwa.length > 0) {
    return NextResponse.json({ source: 'cwa', city, periods: cwa });
  }

  if (!isNaN(lat) && !isNaN(lng)) {
    const om = await fromOpenMeteo(lat, lng);
    if (om) return NextResponse.json({ source: 'open-meteo', city, periods: om });
  }

  return NextResponse.json({ error: 'weather unavailable' }, { status: 503 });
}
