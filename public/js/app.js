/**
 * SWUNG - Main Application Script
 */

class App {
  constructor() {
    this.init();
  }
  
  init() {
    // Setup event delete buttons
    this.setupDeleteButtons();
    
    // Load voices for speech synthesis
    this.loadVoices();
    
    console.log('🚀 SWUNG App initialized');
  }
  
  setupDeleteButtons() {
    document.querySelectorAll('.event-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const eventId = btn.dataset.eventId;
        
        if (!eventId) return;
        
        if (confirm('Delete this event?')) {
          try {
            const response = await fetch(`/api/events/${eventId}`, {
              method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
              // Remove the event card
              const card = btn.closest('.event-card');
              if (card) {
                card.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => card.remove(), 300);
              }
            } else {
              alert('Failed to delete event');
            }
          } catch (error) {
            console.error('Error deleting event:', error);
            alert('Failed to delete event');
          }
        }
      });
    });
  }
  
  loadVoices() {
    // Load voices for speech synthesis
    if ('speechSynthesis' in window) {
      // Voices may not be immediately available
      if (speechSynthesis.getVoices().length === 0) {
        speechSynthesis.addEventListener('voiceschanged', () => {
          console.log('🗣️ Voices loaded:', speechSynthesis.getVoices().length);
        });
      }
    }
  }
}

// Add slideOut animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideOut {
    to {
      opacity: 0;
      transform: translateX(-20px);
    }
  }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
