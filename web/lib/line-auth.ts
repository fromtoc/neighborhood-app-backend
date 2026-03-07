'use client';

const LINE_CLIENT_ID = '2008946161';
const VERIFIER_KEY   = 'line_verifier';
const RETURN_KEY     = 'line_return_url';
const NID_KEY        = 'line_neighborhood_id';

// ── PKCE helpers（與 firebase-test.html 相同邏輯）──────────────

function base64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const verifier  = base64url(crypto.getRandomValues(new Uint8Array(32)).buffer);
  const challenge = base64url(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  );
  return { verifier, challenge };
}

// ── Public API ─────────────────────────────────────────────────

/** 儲存 verifier 並重導向至 LINE 授權頁 */
export async function redirectToLine(neighborhoodId: number): Promise<void> {
  const { verifier, challenge } = await generatePKCE();
  const state       = base64url(crypto.getRandomValues(new Uint8Array(8)).buffer);
  const redirectUri = `${location.origin}/auth/callback`;

  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(RETURN_KEY,   location.href);
  sessionStorage.setItem(NID_KEY,      String(neighborhoodId));

  const url =
    `https://access.line.me/oauth2/v2.1/authorize?` +
    `response_type=code` +
    `&client_id=${LINE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}` +
    `&scope=profile%20openid` +
    `&code_challenge=${challenge}` +
    `&code_challenge_method=S256`;

  location.href = url;
}

/** 從 sessionStorage 取出 LINE 回調所需的資料 */
export function getLineCallbackData(): {
  verifier: string | null;
  returnUrl: string | null;
  neighborhoodId: number | null;
} {
  return {
    verifier:       sessionStorage.getItem(VERIFIER_KEY),
    returnUrl:      sessionStorage.getItem(RETURN_KEY),
    neighborhoodId: Number(sessionStorage.getItem(NID_KEY)) || null,
  };
}

/** 清除 sessionStorage 的暫存資料 */
export function clearLineCallbackData(): void {
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(RETURN_KEY);
  sessionStorage.removeItem(NID_KEY);
}
