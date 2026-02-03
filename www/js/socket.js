/**
 * SWUNG - Socket.IO Client
 * Handles real-time reminder notifications
 */

class SocketHandler {
  constructor() {
    this.socket = null;
    this.init();
  }
  
  init() {
    // Connect to Socket.IO server
    this.socket = io();
    
    this.socket.on('connect', () => {
      console.log('🔌 Connected to server');
    });
    
    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
    });
    
    // Handle reminder notifications
    this.socket.on('reminder', (data) => {
      console.log('🔔 Reminder received:', data);
      this.showReminder(data);
    });
    
    // Handle alarm notifications (from server checkAlarms)
    this.socket.on('alarm', (data) => {
      console.log('🔔 Alarm received:', data);
      this.showReminder({
        id: data.id,
        event_title: data.title,
        message: data.message || data.title
      });
    });
  }
  
  showReminder(data) {
    console.log('🔔🔔🔔 SHOWING REMINDER:', data);
    
    // Play notification sound
    this.playNotificationSound();
    
    // Speak the reminder
    this.speakReminder(data.message);
    
    // Show visual notification
    this.showNotification(data);
    
    // Request browser notification permission and show
    this.showBrowserNotification(data);
  }
  
  playNotificationSound() {
    // Create an audio context and play a notification tone
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create oscillator for notification sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Pleasant notification tone
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      // Second beep
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        
        osc2.frequency.setValueAtTime(1047, audioContext.currentTime); // C6
        osc2.type = 'sine';
        
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.5);
      }, 200);
      
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }
  
  speakReminder(message) {
    if (!message || !('speechSynthesis' in window)) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Use a good voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes('Google') || 
      v.name.includes('Samantha') ||
      v.name.includes('Microsoft')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  }
  
  showNotification(data) {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
      <div class="notification-header">
        <span class="notification-icon">🔔</span>
        <span class="notification-title">${data.event_title || 'Reminder'}</span>
      </div>
      <p class="notification-message">${data.message}</p>
      <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(notification);
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 30000);
  }
  
  async showBrowserNotification(data) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      new Notification('SWUNG Reminder', {
        body: data.message,
        icon: '/images/icon.png',
        tag: `reminder-${data.id}`
      });
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('SWUNG Reminder', {
          body: data.message,
          icon: '/images/icon.png',
          tag: `reminder-${data.id}`
        });
      }
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.socketHandler = new SocketHandler();
  
  // Request notification permission early
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
});
