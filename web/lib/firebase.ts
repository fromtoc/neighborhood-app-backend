'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// 與 docs/firebase-test.html 使用相同的 Firebase 專案設定
const firebaseConfig = {
  apiKey:            'AIzaSyDz8YAOs-KE2-UKNOWBgDBT8xbtO4Tones',
  authDomain:        'golocal-4065a.firebaseapp.com',
  projectId:         'golocal-4065a',
  storageBucket:     'golocal-4065a.firebasestorage.app',
  messagingSenderId: '811824553721',
  appId:             '1:811824553721:web:4e10d485779f4ad8358c28',
};

const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
