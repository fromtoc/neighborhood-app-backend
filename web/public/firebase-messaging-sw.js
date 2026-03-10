importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyDz8YAOs-KE2-UKNOWBgDBT8xbtO4Tones',
  authDomain:        'golocal-4065a.firebaseapp.com',
  projectId:         'golocal-4065a',
  storageBucket:     'golocal-4065a.firebasestorage.app',
  messagingSenderId: '811824553721',
  appId:             '1:811824553721:web:4e10d485779f4ad8358c28',
});

const messaging = firebase.messaging();

// 背景訊息（App 未開啟時由 SW 顯示通知）
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  self.registration.showNotification(title ?? '巷口 GoLocal', {
    body: body ?? '',
    icon: '/icons/icon-192.png',
  });
});
