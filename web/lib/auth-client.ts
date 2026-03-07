'use client';

const TOKEN_KEY = 'golocal_access_token';
const USER_KEY = 'golocal_user';
const NICKNAME_KEY = 'golocal_nickname';

export interface AuthUser {
  userId: number;
  neighborhoodId: number | null;
  role: string;
  displayName?: string | null;
  photoURL?: string | null;
}

export function saveAuth(accessToken: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getNickname(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(NICKNAME_KEY);
}

export function saveNickname(name: string) {
  localStorage.setItem(NICKNAME_KEY, name);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(NICKNAME_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

/** 取得 JWT 到期時間（秒級 Unix timestamp），解析失敗回傳 0 */
export function getTokenExpiry(): number {
  const token = getToken();
  if (!token) return 0;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp : 0;
  } catch {
    return 0;
  }
}

/** token 是否已過期（預留 30 秒緩衝） */
export function isTokenExpired(): boolean {
  const exp = getTokenExpiry();
  if (!exp) return false; // 無法解析時不強制登出
  return Date.now() / 1000 > exp - 30;
}

/** 收到 401 時呼叫，觸發全域重新登入流程 */
export function dispatchAuthExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }
}
