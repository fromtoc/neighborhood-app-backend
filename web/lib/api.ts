/**
 * Backend fetch wrapper
 *
 * - Server Components / API Routes：讀 API_BASE_URL（不暴露給瀏覽器）
 * - Client Components：讀 NEXT_PUBLIC_API_BASE_URL
 */

const SERVER_BASE_URL =
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

export const CLIENT_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

/** Backend 統一回應格式 */
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  traceId: string | null;
}

/**
 * Server-side fetch（Server Component / Route Handler 使用）
 * 自動解開 ApiResponse.data；非 2xx 拋出 Error
 *
 * 預設 cache: 'no-store'（不快取）。
 * ISR 頁面傳入 { next: { revalidate: N } } 覆寫。
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } },
): Promise<T> {
  const url = `${SERVER_BASE_URL}${path}`;
  const res = await fetch(url, {
    cache: 'no-store',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`API ${res.status} — ${path}`);
  }

  const json: ApiResponse<T> = await res.json();

  if (json.code !== 200) {
    throw new Error(`Backend error ${json.code}: ${json.message}`);
  }

  return json.data;
}

/**
 * Client-side fetch（'use client' Component 使用）
 * 直接回傳 data；非 2xx 或 code !== 200 拋出 Error
 */
export async function clientFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${CLIENT_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`API ${res.status} — ${path}`);
  }

  const json: ApiResponse<T> = await res.json();

  if (json.code !== 200) {
    throw new Error(`Backend error ${json.code}: ${json.message}`);
  }

  return json.data;
}
