/**
 * SWUNG Mobile - Chat Interface Logic
 * Uses API endpoints from Render server
 */

class ChatApp {
  constructor() {
    this.apiBaseUrl = window.SWUNG_CONFIG?.apiBaseUrl || 'https://swung.onrender.com';
    
    this.chatContainer = document.getElementById('chat-container');
    this.chatInput = document.getElementById('chat-input');
    this.voiceVisualizer = document.getElementById('voice-visualizer');
    this.processingState = document.getElementById('processing-state');
    this.sendBtn = document.getElementById('send-btn');
    this.micBtn = document.getElementById('mic-btn');
    this.defaultLeftActions = document.getElementById('default-left-actions');
    this.recordDeleteBtn = document.getElementById('record-delete-btn');
    
    this.isRecording = false;
    this.recognition = null;
    this.tempTranscript = '';
    this.authToken = localStorage.getItem('swung_auth_token');
    
    this.init();
  }
  
  init() {
    console.log('📱 ChatApp Mobile initialized, API:', this.apiBaseUrl);
    
    // Check if logged in
    if (!this.authToken) {
      this.checkAuthStatus();
    }
    
    this.setupEventListeners();
    this.setupVoiceRecognition();
    this.setupImageHandling();
    this.loadHistory();
  }
  
  async checkAuthStatus() {
    try {
      const res = await fetch(`${this.apiBaseUrl}/api/user`, {
        credentials: 'include'
      });
      if (!res.ok) {
        window.location.href = 'login.html';
      }
    } catch (err) {
      console.log('Not authenticated, redirecting to login');
      window.location.href = 'login.html';
    }
  }

  async loadHistory() {
    try {
      const res = await fetch(`${this.apiBaseUrl}/api/history`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success && data.history) {
        data.history.forEach(msg => {
          const sender = msg.role === 'user' ? 'user' : 'bot';
          this.appendMessage(sender, msg.content);
          
          if (msg.action_data && msg.action_data.data) {
            this.showEventCard(msg.action_data.data, msg.action_data.result);
          }
        });
        
        // Scroll to bottom
        this.scrollToBottom();
        setTimeout(() => this.scrollToBottom(), 100);
        setTimeout(() => this.scrollToBottom(), 300);
      }
    } catch (err) {
      console.error('Failed to load history', err);
    }
  }
  
  setupEventListeners() {
    // Send message on button click
    this.sendBtn?.addEventListener('click', () => this.sendMessage());
    
    // Send message on Enter
    this.chatInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    // Toggle send/mic button based on input
    this.chatInput?.addEventListener('input', () => this.toggleSendMic());
    
    // Mic button
    this.micBtn?.addEventListener('click', () => this.toggleRecording());
    
    // Delete recording
    this.recordDeleteBtn?.addEventListener('click', () => this.cancelRecording());
  }
  
  toggleSendMic() {
    const hasText = this.chatInput.value.trim().length > 0;
    
    if (hasText) {
      this.sendBtn?.classList.remove('hidden');
      this.micBtn?.classList.add('hidden');
    } else {
      this.sendBtn?.classList.add('hidden');
      this.micBtn?.classList.remove('hidden');
    }
  }
  
  async sendMessage() {
    const text = this.chatInput.value.trim();
    if (!text) return;
    
    this.chatInput.value = '';
    this.toggleSendMic();
    
    // Add user message to chat
    this.appendMessage('user', text);
    this.scrollToBottom();
    
    // Show processing
    this.showProcessing(true);
    
    try {
      const res = await fetch(`${this.apiBaseUrl}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text, images: [] })
      });
      
      const data = await res.json();
      this.showProcessing(false);
      
      if (data.response) {
        this.appendMessage('bot', data.response);
      }
      
      if (data.action && data.actionResult) {
        this.showEventCard(data.action, data.actionResult);
      }
      
      this.scrollToBottom();
      
    } catch (err) {
      console.error('Send error:', err);
      this.showProcessing(false);
      this.appendMessage('bot', 'Sorry, there was an error. Please try again.');
    }
  }
  
  appendMessage(sender, text, options = {}) {
    const msgId = options.id || Date.now();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.id = `msg-${msgId}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = `<p>${this.formatText(text)}</p>`;
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeDiv);
    
    this.chatContainer.appendChild(messageDiv);
    this.scrollToBottom();
    
    return msgId;
  }
  
  showEventCard(action, result) {
    if (!result?.success) return;
    
    const cardHtml = `
      <div class="event-card" data-event-id="${result.event?.id || result.alarm?.id || ''}">
        <div class="event-card-header">
          <span class="event-emoji">📅</span>
          <span class="event-title">${result.event?.title || result.alarm?.title || result.task?.title || 'Event'}</span>
        </div>
        <div class="event-card-body">
          <p>${result.message || 'Action completed'}</p>
        </div>
      </div>
    `;
    
    const cardContainer = document.createElement('div');
    cardContainer.className = 'message bot';
    cardContainer.innerHTML = `<div class="message-content">${cardHtml}</div>`;
    
    this.chatContainer.appendChild(cardContainer);
  }
  
  formatText(text) {
    if (!text) return '';
    return text.replace(/\n/g, '<br>');
  }
  
  scrollToBottom() {
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    requestAnimationFrame(() => {
      this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    });
  }
  
  showProcessing(show) {
    if (show) {
      this.processingState?.classList.remove('hidden');
      this.chatInput.disabled = true;
    } else {
      this.processingState?.classList.add('hidden');
      this.chatInput.disabled = false;
    }
  }
  
  setupVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.log('Speech recognition not supported');
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    
    this.recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      this.chatInput.value = transcript;
      this.tempTranscript = transcript;
    };
    
    this.recognition.onend = () => {
      if (this.isRecording) {
        this.stopRecording();
        if (this.tempTranscript.trim()) {
          this.sendMessage();
        }
      }
    };
  }
  
  toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }
  
  startRecording() {
    if (!this.recognition) return;
    
    this.isRecording = true;
    this.tempTranscript = '';
    this.chatInput.value = '';
    
    this.micBtn?.classList.add('recording');
    this.voiceVisualizer?.classList.remove('hidden');
    this.chatInput?.classList.add('hidden');
    this.defaultLeftActions?.classList.add('hidden');
    this.recordDeleteBtn?.classList.remove('hidden');
    
    try {
      this.recognition.start();
    } catch (e) {
      console.error('Recognition start error:', e);
    }
  }
  
  stopRecording() {
    this.isRecording = false;
    
    this.micBtn?.classList.remove('recording');
    this.voiceVisualizer?.classList.add('hidden');
    this.chatInput?.classList.remove('hidden');
    this.defaultLeftActions?.classList.remove('hidden');
    this.recordDeleteBtn?.classList.add('hidden');
    
    try {
      this.recognition?.stop();
    } catch (e) {
      console.error('Recognition stop error:', e);
    }
  }
  
  cancelRecording() {
    this.tempTranscript = '';
    this.chatInput.value = '';
    this.stopRecording();
  }
  
  setupImageHandling() {
    const cameraBtn = document.getElementById('camera-btn');
    const imageBtn = document.getElementById('image-btn');
    const cameraInput = document.getElementById('file-input-camera');
    const galleryInput = document.getElementById('file-input-gallery');
    
    cameraBtn?.addEventListener('click', () => cameraInput?.click());
    imageBtn?.addEventListener('click', () => galleryInput?.click());
    
    cameraInput?.addEventListener('change', (e) => this.handleImageSelect(e));
    galleryInput?.addEventListener('change', (e) => this.handleImageSelect(e));
  }
  
  handleImageSelect(e) {
    const files = e.target.files;
    if (!files.length) return;
    
    // For now, just show a message that images are selected
    this.appendMessage('user', `📷 Image selected: ${files[0].name}`);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.chatApp = new ChatApp();
});
