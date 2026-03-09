'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';
import { getLineCallbackData, clearLineCallbackData } from '@/lib/line-auth';
import { saveAuth, saveNickname } from '@/lib/auth-client';
import { CLIENT_BASE_URL } from '@/lib/api';
import type { AuthUser } from '@/lib/auth-client';

export default function LineCallbackPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '4rem', color: '#bbb' }}>處理中...</div>}>
      <LineCallback />
    </Suspense>
  );
}

function decodeJwtRole(token: string): string {
  try {
    // JWT uses base64url (- instead of +, _ instead of /); atob requires standard base64
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64));
    return payload.role ?? 'USER';
  } catch {
    return 'USER';
  }
}

function LineCallback() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('處理 LINE 授權中...');
  const [error,  setError]  = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) { setError('未收到授權 code'); return; }

    const { verifier, returnUrl, neighborhoodId } = getLineCallbackData();
    if (!verifier) { setError('PKCE verifier 遺失，請重新登入'); return; }

    const redirectUri = `${location.origin}/auth/callback`;

    (async () => {
      try {
        // Step 1: code + verifier → Firebase custom token
        setStatus('取得 Firebase token 中...');
        const r1 = await fetch(`${CLIENT_BASE_URL}/api/v1/auth/line/custom-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, redirectUri, codeVerifier: verifier }),
        });
        const d1 = await r1.json();
        if (d1.code !== 200) throw new Error(d1.message);

        // Step 2: Firebase custom token → Firebase user
        setStatus('Firebase 登入中...');
        const cred    = await signInWithCustomToken(firebaseAuth, d1.data.firebaseCustomToken);
        const idToken = await cred.user.getIdToken();

        // Step 3: Firebase idToken → 後端 JWT
        setStatus('取得後端 token 中...');
        const nid      = neighborhoodId ?? 1;
        const deviceId = `web-line-${Date.now()}`;
        const r2 = await fetch(`${CLIENT_BASE_URL}/api/v1/auth/firebase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, neighborhoodId: nid, deviceId }),
        });
        const d2 = await r2.json();
        if (d2.code !== 200) throw new Error(d2.message);

        const { accessToken, user: u } = d2.data;
        const authUser: AuthUser = {
          userId:         u.id,
          neighborhoodId: u.defaultNeighborhoodId ?? nid,
          role:           decodeJwtRole(accessToken),
        };
        saveAuth(accessToken, authUser);

        // 回填暱稱，避免重新登入後被清空
        if (u.nickname) saveNickname(u.nickname);

        clearLineCallbackData();
        setStatus('登入成功！返回頁面...');

        // 完整頁面導向（非 SPA router），讓 AuthProvider 重新從 localStorage 讀取最新狀態
        window.location.replace(returnUrl ?? '/');
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '1rem',
    }}>
      {error ? (
        <>
          <p style={{ fontSize: '2rem' }}>❌</p>
          <p style={{ color: '#e53e3e', fontWeight: 600 }}>LINE 登入失敗</p>
          <p style={{ color: '#828282', fontSize: '0.9rem' }}>{error}</p>
          <button onClick={() => window.history.back()} style={{
            background: '#1c5373', color: '#fff', border: 'none',
            borderRadius: 8, padding: '0.5rem 1.5rem', cursor: 'pointer',
          }}>返回</button>
        </>
      ) : (
        <>
          <p style={{ fontSize: '2rem' }}>🟢</p>
          <p style={{ color: '#1e1e1e', fontWeight: 600 }}>{status}</p>
        </>
      )}
    </div>
  );
}
