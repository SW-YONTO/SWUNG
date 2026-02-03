/**
 * SWUNG Mobile - Native Push Notifications
 * Uses Capacitor Push Notifications plugin for Android
 */

import { PushNotifications } from '@capacitor/push-notifications';

class PushNotificationService {
  constructor() {
    this.apiBaseUrl = window.SWUNG_CONFIG?.apiBaseUrl || 'https://swung.onrender.com';
    this.init();
  }

  async init() {
    // Check if running in Capacitor
    if (!window.Capacitor?.isNativePlatform()) {
      console.log('📱 Not running on native platform, skipping native push');
      return;
    }

    console.log('📱 Initializing native push notifications...');

    // Request permission
    const permStatus = await PushNotifications.requestPermissions();
    
    if (permStatus.receive === 'granted') {
      console.log('✅ Push notification permission granted');
      await this.registerPush();
    } else {
      console.log('❌ Push notification permission denied');
    }
  }

  async registerPush() {
    // Register with FCM
    await PushNotifications.register();

    // Get FCM token when registration succeeds
    PushNotifications.addListener('registration', async (token) => {
      console.log('📱 FCM Token:', token.value);
      
      // Send token to server
      await this.sendTokenToServer(token.value);
    });

    // Handle registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('❌ Push registration error:', error);
    });

    // Handle incoming notifications when app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('🔔 Push received:', notification);
      this.showLocalNotification(notification);
    });

    // Handle notification tap
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('🔔 Push action:', action);
      // Navigate to relevant page if needed
    });
  }

  async sendTokenToServer(token) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/notifications/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, platform: 'android' })
      });
      
      const data = await response.json();
      console.log('✅ Token registered with server:', data);
    } catch (error) {
      console.error('❌ Failed to register token:', error);
    }
  }

  showLocalNotification(notification) {
    // Show in-app notification UI
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notifEl = document.createElement('div');
    notifEl.className = 'notification';
    notifEl.innerHTML = `
      <div class="notification-header">
        <span class="notification-icon">🔔</span>
        <span class="notification-title">${notification.title || 'SWUNG'}</span>
      </div>
      <p class="notification-message">${notification.body || ''}</p>
      <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(notifEl);
    
    setTimeout(() => notifEl.remove(), 10000);
  }
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.pushService = new PushNotificationService();
});

export default PushNotificationService;
