
/**
 * Notification Handler for SWUNGv2
 * Handles Web Push and Capacitor Native Notifications
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

// Configuration will be injected or loaded
// const firebaseConfig = { ... }; 

let messaging = null;

// Export messaging so we can use it elsewhere if needed
export { messaging };

export async function initNotifications(firebaseConfig) {
  if (!firebaseConfig) {
    console.warn("Notifications: No Firebase Config provided.");
    return;
  }

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);

  // Check current permission level
  if (Notification.permission === 'granted') {
    await retrieveToken();
  } else if (Notification.permission === 'denied') {
    console.log('Notifications are blocked by the user.');
  } else {
    console.log('Notifications need permission. User must click "Enable".');
  }

  // Handle incoming messages (foreground)
  onMessage(messaging, (payload) => {
    console.log('Message received. ', payload);
    showInAppNotification(payload.notification);
  });
}

// Function to be called on button click
export async function requestNotificationPermission() {
  console.log('Requesting permission on user gesture...');
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      await retrieveToken();
      return true;
    } else {
      console.log('Unable to get permission to notify.');
      return false;
    }
  } catch (err) {
    console.log('An error occurred while retrieving token. ', err);
    return false;
  }
}

async function retrieveToken() {
  try {
    // Register Service Worker explicitly
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('Service Worker registered:', registration);

    // Wait for it to be ready
    await navigator.serviceWorker.ready;

    const token = await getToken(messaging, { 
      vapidKey: 'BPh82t-lCfM3Yl4rUzaUSJl6zyhnWGGwm6v8eHl4s_PawBq4noTojK1ylrSgtB_SkJvBj6lxXUsIM7-ynSx8p9s',
      serviceWorkerRegistration: registration 
    });
    
    if (token) {
      console.log('FCM Token:', token);
      await registerToken(token);
    } else {
      console.log('No registration token available.');
    }
  } catch (err) {
    console.log('Error retrieving token:', err);
  }
}

async function registerToken(token) {
  try {
    const response = await fetch('/api/notifications/register-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, platform: 'web' }),
    });
    
    if (response.ok) {
      console.log('Token registered on server.');
    }
  } catch (error) {
    console.error('Error registering token:', error);
  }
}

function showInAppNotification(notification) {
  // Simple toast implementation
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-fade-in-up';
  toast.innerHTML = `
    <div class="font-bold mb-1">${notification.title}</div>
    <div class="text-sm">${notification.body}</div>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 5000);
}
