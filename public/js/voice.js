/**
 * SWUNG - Voice Input Handler
 * Uses Web Speech API for voice recognition
 */

class VoiceInput {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.transcript = '';
    
    // DOM Elements
    this.voiceBtn = document.getElementById('voice-btn');
    this.voiceStatus = document.getElementById('voice-status');
    this.transcriptEl = document.getElementById('transcript');
    this.btnText = this.voiceBtn?.querySelector('.voice-btn-text');
    
    this.init();
  }
  
  init() {
    // Check for Web Speech API support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Web Speech API not supported');
      if (this.voiceStatus) {
        this.voiceStatus.textContent = 'Voice input not supported in this browser. Try Chrome or Edge.';
      }
      return;
    }
    
    // Initialize recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // Configure
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;
    
    // Set up event listeners
    this.setupEventListeners();
    
    console.log('🎤 Voice input initialized');
  }
  
  setupEventListeners() {
    if (!this.recognition || !this.voiceBtn) return;
    
    // Button click
    this.voiceBtn.addEventListener('click', () => {
      if (this.isListening) {
        this.stop();
      } else {
        this.start();
      }
    });
    
    // Recognition events
    this.recognition.onstart = () => {
      this.isListening = true;
      this.voiceBtn.classList.add('listening');
      if (this.btnText) this.btnText.textContent = 'Listening...';
      if (this.voiceStatus) {
        this.voiceStatus.textContent = '🎤 Listening...';
        this.voiceStatus.classList.add('listening');
      }
      if (this.transcriptEl) {
        this.transcriptEl.textContent = '';
        this.transcriptEl.classList.add('active');
      }
    };
    
    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Display transcript
      if (this.transcriptEl) {
        this.transcriptEl.textContent = finalTranscript || interimTranscript;
      }
      
      // If we have a final transcript, process it
      if (finalTranscript) {
        this.transcript = finalTranscript;
        this.processTranscript(finalTranscript);
      }
    };
    
    this.recognition.onend = () => {
      this.isListening = false;
      this.voiceBtn.classList.remove('listening');
      if (this.btnText) this.btnText.textContent = 'Tap to speak';
      if (this.voiceStatus) {
        this.voiceStatus.textContent = '';
        this.voiceStatus.classList.remove('listening');
      }
    };
    
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      this.voiceBtn.classList.remove('listening');
      if (this.btnText) this.btnText.textContent = 'Tap to speak';
      
      let errorMessage = 'An error occurred';
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone access.';
          break;
        case 'network':
          errorMessage = 'Network error occurred.';
          break;
      }
      
      if (this.voiceStatus) {
        this.voiceStatus.textContent = errorMessage;
        this.voiceStatus.classList.remove('listening');
      }
    };
  }
  
  start() {
    if (!this.recognition) {
      console.error('Speech recognition not initialized');
      return;
    }
    
    try {
      this.recognition.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
    }
  }
  
  stop() {
    if (!this.recognition) return;
    
    try {
      this.recognition.stop();
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
  }
  
  async processTranscript(text) {
    console.log('📝 Processing transcript:', text);
    
    if (this.voiceStatus) {
      this.voiceStatus.textContent = 'Processing...';
    }
    
    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });
      
      const data = await response.json();
      console.log('📬 Response:', data);
      
      // Display response
      this.displayResponse(data);
      
      // Speak response
      this.speakResponse(data.message);
      
      // Refresh page if event was created or deleted
      if (data.success && (data.action === 'create_event' || data.action === 'delete_event')) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error processing transcript:', error);
      this.displayResponse({
        success: false,
        message: 'Failed to process your request. Please try again.'
      });
    }
  }
  
  displayResponse(data) {
    const container = document.getElementById('response-container');
    const message = document.getElementById('response-message');
    
    if (!container || !message) return;
    
    container.classList.remove('hidden');
    message.textContent = data.message;
    message.className = 'response-message ' + (data.success ? 'success' : 'error');
    
    if (this.voiceStatus) {
      this.voiceStatus.textContent = '';
    }
  }
  
  speakResponse(text) {
    if (!text || !('speechSynthesis' in window)) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    
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
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.voiceInput = new VoiceInput();
});
