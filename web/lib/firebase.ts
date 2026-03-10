'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            'AIzaSyDz8YAOs-KE2-UKNOWBgDBT8xbtO4Tones',
  authDomain:        'golocal-4065a.firebaseapp.com',
  projectId:         'golocal-4065a',
  storageBucket:     'golocal-4065a.firebasestorage.app',
  messagingSenderId: '811824553721',
  appId:             '1:811824553721:web:4e10d485779f4ad8358c28',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);

/** 取得 FCM token（需先取得通知權限）。失敗回傳 null。 */
export async function getFcmToken(): Promise<string | null> {
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) return null;
  try {
    const messaging: Messaging = getMessaging(app);
    return await getToken(messaging, { vapidKey });
  } catch {
    return null;
  }
}

/** 前景訊息監聽（App 已開啟時） */
export function onForegroundMessage(cb: (payload: { notification?: { title?: string; body?: string } }) => void) {
  try {
    const messaging: Messaging = getMessaging(app);
    return onMessage(messaging, cb);
  } catch {
    return () => {};
  }
}
