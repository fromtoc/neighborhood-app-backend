'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithCustomToken,
  signOut,
} from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';
import { redirectToLine } from '@/lib/line-auth';
import {
  type AuthUser,
  clearAuth,
  getToken,
  getUser,
  getNickname,
  saveAuth,
  saveNickname,
  isTokenExpired,
} from '@/lib/auth-client';
import { CLIENT_BASE_URL } from '@/lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  nickname: string | null;
  setNickname: (name: string) => void;
  loginAsGuest: (neighborhoodId: number) => Promise<void>;
  loginWithGoogle: (neighborhoodId: number) => Promise<void>;
  loginWithFacebook: (neighborhoodId: number) => Promise<void>;
  loginWithApple: (neighborhoodId: number) => Promise<void>;
  loginWithLine: (neighborhoodId: number) => Promise<void>;
  /** 完成 Firebase idToken → 後端 /auth/firebase 登入 */
  loginWithFirebaseToken: (idToken: string, neighborhoodId: number, profile?: { displayName?: string | null; photoURL?: string | null }) => Promise<void>;
  showLoginModal: (neighborhoodId?: number) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  nickname: null,
  setNickname: () => {},
  loginAsGuest: async () => {},
  loginWithGoogle: async () => {},
  loginWithFacebook: async () => {},
  loginWithApple: async () => {},
  loginWithLine: async () => {},
  loginWithFirebaseToken: async () => {},
  showLoginModal: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,     setUser]     = useState<AuthUser | null>(null);
  const [token,    setToken]    = useState<string | null>(null);
  const [nickname, setNicknameState] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen]   = useState(false);
  const [loginModalNid,  setLoginModalNid]    = useState<number | undefined>(undefined);

  useEffect(() => {
    setToken(getToken());
    const u = getUser();
    setUser(u);
    const saved = getNickname();
    if (saved) {
      setNicknameState(saved);
    }
  }, []);

  // 自動偵測 token 過期 → 登出並彈出登入 modal
  useEffect(() => {
    function forceLogout() {
      if (!getToken()) return; // 已登出，不重複觸發
      clearAuth();
      setToken(null);
      setUser(null);
      setNicknameState(null);
      setLoginModalOpen(true);
    }

    function checkExpiry() {
      if (getToken() && isTokenExpired()) forceLogout();
    }

    // 每 30 秒檢查一次
    const timer = setInterval(checkExpiry, 30_000);
    // 使用者切回此分頁時也立即檢查
    document.addEventListener('visibilitychange', checkExpiry);
    // 任何地方收到 401 都可以觸發此事件
    window.addEventListener('auth:expired', forceLogout);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', checkExpiry);
      window.removeEventListener('auth:expired', forceLogout);
    };
  }, []);

  const setNickname = useCallback((name: string) => {
    saveNickname(name);
    setNicknameState(name);
  }, []);

  // ── 從 JWT payload 解析 role ────────────────────────────────────
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

  // ── 共用：把 Firebase idToken 換成後端 JWT ─────────────────────
  const loginWithFirebaseToken = useCallback(async (
    idToken: string,
    neighborhoodId: number,
    profile?: { displayName?: string | null; photoURL?: string | null },
  ) => {
    const deviceId = `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const res  = await fetch(`${CLIENT_BASE_URL}/api/v1/auth/firebase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, neighborhoodId, deviceId }),
    });
    const json = await res.json();
    if (json.code !== 200) throw new Error(json.message);

    const { accessToken, user: u } = json.data;
    const authUser: AuthUser = {
      userId:         u.id,
      neighborhoodId: u.defaultNeighborhoodId ?? neighborhoodId,
      role:           decodeJwtRole(accessToken),
      displayName:    profile?.displayName ?? null,
      photoURL:       profile?.photoURL ?? null,
    };
    saveAuth(accessToken, authUser);
    setToken(accessToken);
    setUser(authUser);
    // 用 DB 中的暱稱更新本地快取（API 回傳的 nickname 是最新的）
    if (u.nickname) {
      saveNickname(u.nickname);
      setNicknameState(u.nickname);
    }
  }, []);

  // ── Firebase Popup（Google / Facebook / Apple）────────────────
  const loginWithPopup = useCallback(async (
    provider: GoogleAuthProvider | FacebookAuthProvider | OAuthProvider,
    neighborhoodId: number,
  ) => {
    const result   = await signInWithPopup(firebaseAuth, provider);
    const idToken  = await result.user.getIdToken();
    await loginWithFirebaseToken(idToken, neighborhoodId, {
      displayName: result.user.displayName,
      photoURL:    result.user.photoURL,
    });
  }, [loginWithFirebaseToken]);

  const loginWithGoogle = useCallback((nid: number) =>
    loginWithPopup(new GoogleAuthProvider(), nid), [loginWithPopup]);

  const loginWithFacebook = useCallback((nid: number) =>
    loginWithPopup(new FacebookAuthProvider(), nid), [loginWithPopup]);

  const loginWithApple = useCallback((nid: number) => {
    const p = new OAuthProvider('apple.com');
    p.addScope('email'); p.addScope('name');
    return loginWithPopup(p, nid);
  }, [loginWithPopup]);

  const loginWithLine = useCallback(async (nid: number) => {
    await redirectToLine(nid);
  }, []);

  // ── 訪客登入 ────────────────────────────────────────────────────
  const loginAsGuest = useCallback(async (neighborhoodId: number) => {
    const deviceId = `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const res  = await fetch(`${CLIENT_BASE_URL}/api/v1/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ neighborhoodId, deviceId }),
    });
    const json = await res.json();
    if (json.code !== 200) throw new Error(json.message);

    const { accessToken, user: u } = json.data;
    const authUser: AuthUser = {
      userId:         u.id,
      neighborhoodId: u.defaultNeighborhoodId ?? neighborhoodId,
      role:           decodeJwtRole(accessToken),
    };
    saveAuth(accessToken, authUser);
    setToken(accessToken);
    setUser(authUser);
  }, []);

  const logout = useCallback(async () => {
    try { await signOut(firebaseAuth); } catch {}
    clearAuth();
    setToken(null);
    setUser(null);
    setNicknameState(null);
  }, []);

  const showLoginModal = useCallback((nid?: number) => {
    setLoginModalNid(nid);
    setLoginModalOpen(true);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, token, nickname, setNickname,
      loginAsGuest,
      loginWithGoogle, loginWithFacebook, loginWithApple, loginWithLine,
      loginWithFirebaseToken,
      showLoginModal,
      logout,
    }}>
      {children}
      {loginModalOpen && (
        <LoginModal
          neighborhoodId={loginModalNid}
          onClose={() => setLoginModalOpen(false)}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// ── LoginModal（內嵌，避免循環 import）─────────────────────────

interface LoginModalProps {
  neighborhoodId?: number;
  onClose: () => void;
}

function LoginModal({ neighborhoodId, onClose }: LoginModalProps) {
  const {
    loginAsGuest, loginWithGoogle, loginWithFacebook,
    loginWithApple, loginWithLine,
  } = useAuth();

  const [loading, setLoading] = useState<string | null>(null);
  const [error,   setError]   = useState('');

  // 用 last-neighborhood 作為 fallback
  const getNid = (): number => {
    if (neighborhoodId) return neighborhoodId;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('golocal_last_neighborhood');
        if (raw) return JSON.parse(raw).id ?? 1;
      } catch {}
    }
    return 1;
  };

  async function handle(label: string, fn: () => Promise<void>) {
    setLoading(label); setError('');
    try {
      await fn();
      onClose();
    } catch (e: unknown) {
      const msg = (e as Error).message ?? '';
      const ignored = ['auth/cancelled-popup-request', 'auth/popup-closed-by-user'];
      if (!ignored.some(c => msg.includes(c))) setError(msg);
    } finally {
      setLoading(null);
    }
  }

  const btnStyle = (bg: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
    width: '100%', padding: '0.7rem', border: 'none', borderRadius: 10,
    fontSize: '0.95rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.65 : 1, background: bg, color: '#fff', marginBottom: '0.6rem',
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '1.5rem',
        width: '100%', maxWidth: 360,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e1e1e' }}>登入 / 建立帳號</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#828282' }}>✕</button>
        </div>

        <button style={btnStyle('#4285f4')} disabled={!!loading}
          onClick={() => handle('google', () => loginWithGoogle(getNid()))}>
          {loading === 'google' ? '登入中...' : '🔵 Google 登入'}
        </button>

        <button style={btnStyle('#06c755')} disabled={!!loading}
          onClick={() => handle('line', () => loginWithLine(getNid()))}>
          {loading === 'line' ? '跳轉中...' : '🟢 LINE 登入'}
        </button>

        <button style={btnStyle('#1877f2')} disabled={!!loading}
          onClick={() => handle('facebook', () => loginWithFacebook(getNid()))}>
          {loading === 'facebook' ? '登入中...' : '🔷 Facebook 登入'}
        </button>

        <button style={btnStyle('#000')} disabled={!!loading}
          onClick={() => handle('apple', () => loginWithApple(getNid()))}>
          {loading === 'apple' ? '登入中...' : '🍎 Apple 登入'}
        </button>

        <div style={{ borderTop: '1px solid #eee', margin: '0.8rem 0' }} />

        <button style={{ ...btnStyle('#828282'), marginBottom: 0 }} disabled={!!loading}
          onClick={() => handle('guest', () => loginAsGuest(getNid()))}>
          {loading === 'guest' ? '登入中...' : '👤 訪客登入（僅限群聊）'}
        </button>

        {error && <p style={{ color: '#e53e3e', fontSize: '0.82rem', marginTop: '0.75rem', textAlign: 'center' }}>{error}</p>}

        <p style={{ fontSize: '0.75rem', color: '#bbb', textAlign: 'center', marginTop: '0.75rem', marginBottom: 0 }}>
          第三方登入才能使用私聊功能
        </p>
      </div>
    </div>
  );
}
