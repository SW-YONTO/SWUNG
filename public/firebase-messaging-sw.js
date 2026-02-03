
// Give the service worker access to Firebase Messaging.
// Note: These must match the version used in the main app
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyB0qxU4DNfHsG3itjVCzutLmx0sJpWR4x0",
  authDomain: "sw-ung.firebaseapp.com",
  projectId: "sw-ung",
  storageBucket: "sw-ung.firebasestorage.app",
  messagingSenderId: "1096432312292",
  appId: "1:1096432312292:web:707628be06fb351a8231f1",
  measurementId: "G-CW0EXT43TZ"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'SWUNG Reminder';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a reminder!',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [200, 100, 200],
    tag: 'swung-notification',
    renotify: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
