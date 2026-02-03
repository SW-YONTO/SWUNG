/**
 * SWUNG Mobile - Socket.IO Client
 * Connects to the Render server for real-time notifications
 */

class SocketHandler {
  constructor() {
    this.socket = null;
    this.init();
  }
  
  init() {
    const socketUrl = window.SWUNG_CONFIG?.socketUrl || 'https://swung.onrender.com';
    
    // Connect to Socket.IO server
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });
    
    this.socket.on('connect', () => {
      console.log('🔌 Connected to SWUNG server');
    });
    
    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
    });
    
    // Handle reminder notifications
    this.socket.on('reminder', (data) => {
      console.log('🔔 Reminder received:', data);
      this.showReminder(data);
    });
    
    // Handle alarm notifications
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
  }
  
  playNotificationSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }
  
  speakReminder(message) {
    if (!message || !('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.9;
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
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 30000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.socketHandler = new SocketHandler();
});
