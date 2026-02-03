/**
 * SWUNG - Chat Interface Logic
 */

class ChatApp {
  constructor() {
    this.chatContainer = document.getElementById('chat-container');
    this.chatInput = document.getElementById('chat-input');
    
    this.voiceVisualizer = document.getElementById('voice-visualizer');
    this.processingState = document.getElementById('processing-state');
    
    // Right Actions
    this.sendBtn = document.getElementById('send-btn');
    this.micBtn = document.getElementById('mic-btn');
    
    // Left Actions
    this.defaultLeftActions = document.getElementById('default-left-actions');
    this.recordDeleteBtn = document.getElementById('record-delete-btn');
    this.quickEventsBtn = document.getElementById('quick-events-btn');
    this.eventsModal = document.getElementById('events-modal');
    this.closeModalBtn = document.getElementById('close-modal-btn');
    
    // Settings Elements
    this.settingsBtn = document.getElementById('settings-btn');
    this.settingsModal = document.getElementById('settings-modal');
    this.closeSettingsBtn = document.getElementById('close-settings-btn');
    
    this.isRecording = false;
    this.recognition = null;
    this.tempTranscript = '';
    
    // Pagination State
    this.historyOffset = 0;
    this.historyLimit = 20;
    this.isLoadingHistory = false;
    this.hasMoreHistory = true;
    
    this.init();
  }
  
  init() {
    console.log('ChatApp initialized');
    
    this.setupEventListeners();
    this.setupVoiceRecognition();
    this.setupImageHandling();
    this.setupVoiceRecognition();
    this.setupImageHandling();
    this.loadHistory(); 
    this.checkUrlParams();
    this.setupScrollListener();
  }

  checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action'); // 'chat'
    const message = urlParams.get('message'); // Content
    
    // Legacy support for calendar.js redirect
    const edit = urlParams.get('edit'); 
    const msg = urlParams.get('msg');

    let textToSend = '';

    if (action === 'chat' && message) {
      textToSend = message;
    } else if (edit && msg) {
       // Support legacy format: ?edit=Title&msg=Context
       textToSend = `Update event "${edit}": ${msg}`;
    }

    if (textToSend) {
      // Small delay to ensure everything loaded
      setTimeout(() => {
        this.chatInput.value = textToSend;
        this.sendMessage();
        // Clean URL
        window.history.replaceState({}, document.title, "/");
      }, 500);
    }
  }

  setupScrollListener() {
    this.chatContainer.addEventListener('scroll', () => {
      if (this.chatContainer.scrollTop === 0 && this.hasMoreHistory && !this.isLoadingHistory) {
        this.loadHistory(true);
      }
    });
  }

  async loadHistory(isLoadMore = false) {
    if (this.isLoadingHistory) return;
    this.isLoadingHistory = true;
    
    // Show loading spinner if loading more
    let loader = null;
    if (isLoadMore) {
        loader = document.createElement('div');
        loader.className = 'history-loader';
        loader.innerHTML = '<div class="spinner-small"></div>';
        this.chatContainer.insertBefore(loader, this.chatContainer.firstChild);
    }
    
    try {
      const res = await fetch(`${window.SWUNG_CONFIG.apiBaseUrl}/api/history?limit=${this.historyLimit}&offset=${this.historyOffset}`);
      const data = await res.json();
      
      if (loader) loader.remove();
      
      if (data.success && data.history && data.history.length > 0) {
        const oldScrollHeight = this.chatContainer.scrollHeight;
        const fragment = document.createDocumentFragment();
        
        data.history.forEach(msg => {
          const sender = msg.role === 'user' ? 'user' : 'bot';
          // 1. Create Message
          const msgEl = this.createMessageElement(sender, msg.content, msg);
          fragment.appendChild(msgEl);
          
          // 2. Create Card (if exists)
          if (msg.action_data && msg.action_data.data) {
             const cardEl = this.createEventCardElement(msg.action_data.data, msg.action_data.result);
             if (cardEl) fragment.appendChild(cardEl);
          }
        });
        
        if (isLoadMore) {
           this.chatContainer.insertBefore(fragment, this.chatContainer.firstChild);
           const newScrollHeight = this.chatContainer.scrollHeight;
           this.chatContainer.scrollTop = newScrollHeight - oldScrollHeight;
        } else {
           this.chatContainer.appendChild(fragment);
           this.scrollToBottom();
        }

        this.historyOffset += data.history.length;
        this.hasMoreHistory = data.hasMore;
      } else {
        this.hasMoreHistory = false;
      }
    } catch (err) {
      console.error('Failed to load history', err);
      if (loader) loader.remove();
    } finally {
      this.isLoadingHistory = false;
    }
  }

  createMessageElement(sender, text, msgData = {}) {
      const msgId = msgData.id || Date.now();
      
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${sender}`; // Not sender-message, just sender (based on CSS usually)
      messageDiv.id = `msg-${msgId}`;
      if (sender === 'user') messageDiv.classList.add('user');
      if (sender === 'bot') messageDiv.classList.add('bot');
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'message-content';
      
      // Add images if provided
      if (msgData.images && msgData.images.length > 0) {
        const imageGrid = document.createElement('div');
        imageGrid.className = 'message-image-grid';
        msgData.images.forEach(imgSrc => {
          const img = document.createElement('img');
          img.src = imgSrc;
          img.className = 'message-image';
          imageGrid.appendChild(img);
        });
        contentDiv.appendChild(imageGrid);
      }
      
      // Add text if not empty
      if (text) {
          const p = document.createElement('p');
          p.innerHTML = this.formatText(text);
          if (msgData.images && msgData.images.length > 0) p.style.marginTop = '8px';
          contentDiv.appendChild(p);
      }
      
      const timeDiv = document.createElement('div');
      timeDiv.className = 'message-time';
      const date = msgData.created_at ? new Date(msgData.created_at) : new Date();
      timeDiv.textContent = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      
      messageDiv.appendChild(contentDiv);
      messageDiv.appendChild(timeDiv);
      
      // Add status for user messages
      if (sender === 'user' && msgData.status) {
        const statusDiv = document.createElement('div');
        statusDiv.className = `message-status ${msgData.status}`;
        statusDiv.id = `msg-status-${msgId}`;
        
        if (msgData.status === 'sending') {
          statusDiv.innerHTML = '<i class="ph ph-circle-notch"></i> Sending...';
        } else if (msgData.status === 'uploading') {
          statusDiv.innerHTML = '<i class="ph ph-cloud-arrow-up"></i> Uploading...';
        }
        messageDiv.appendChild(statusDiv);
      }
      
      return messageDiv;
  }

  
  setupEventListeners() {
    // Send message on button click
    this.sendBtn?.addEventListener('click', () => {
        this.handleSendClick();
    });
    
    // Mic click
    this.micBtn?.addEventListener('click', () => {
        this.startRecording();
    });
    
    // Record Delete click
    this.recordDeleteBtn?.addEventListener('click', () => {
        this.cancelRecording();
    });
    
    // Send message on Enter key
    this.chatInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleSendClick();
      }
    });
    
    // Toggle Mic/Send button (Only if not recording)
    this.chatInput?.addEventListener('input', () => {
      if (this.isRecording) return;
      this.updateButtonState();
    });
    
    // Modal events
    this.setupModalEvents();
  }
  
  setupModalEvents() {
    this.quickEventsBtn?.addEventListener('click', () => {
      this.eventsModal.classList.remove('hidden');
    });
    
    this.closeModalBtn?.addEventListener('click', () => {
      this.eventsModal.classList.add('hidden');
    });
    
    this.eventsModal?.addEventListener('click', (e) => {
      if (e.target === this.eventsModal) {
        this.eventsModal.classList.add('hidden');
      }
    });

    // Settings Modal Listeners
    this.settingsBtn?.addEventListener('click', () => {
      this.settingsModal.classList.remove('hidden');
    });

    this.closeSettingsBtn?.addEventListener('click', () => {
      this.settingsModal.classList.add('hidden');
    });

    this.settingsModal?.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) {
         // Optional close on backdrop click
      }
    });
  }
  
  updateButtonState() {
    const hasText = this.chatInput.value.trim().length > 0;
    const hasImages = this.attachedImages && this.attachedImages.length > 0;
    
    if (hasText || hasImages) {
      this.micBtn.classList.add('hidden');
      this.sendBtn.classList.remove('hidden');
      this.sendBtn.classList.add('visible');
    } else {
      this.micBtn.classList.remove('hidden');
      this.sendBtn.classList.add('hidden');
      this.sendBtn.classList.remove('visible');
    }
  }

  setupVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.log('Voice not supported');
      this.micBtn.style.display = 'none';
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true; 
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    
    this.recognition.onstart = () => {
      console.log('Voice started');
    };
    
    this.recognition.onend = () => {
      console.log('Voice ended');
      // Logic handled in handleSendClick mostly
    };
    
    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      this.tempTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          this.tempTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      this.currentVoiceText = this.tempTranscript || interimTranscript;
    };
    
    this.recognition.onerror = (event) => {
      console.error('Speech error', event.error);
      this.cancelRecording();
    };
  }

  setupImageHandling() {
    this.attachedImages = [];
    
    // Image Elements
    this.fileInputCamera = document.getElementById('file-input-camera');
    this.fileInputGallery = document.getElementById('file-input-gallery');
    this.imagePreviewContainer = document.getElementById('image-preview-container');
    this.cameraBtn = document.getElementById('camera-btn');
    this.imageBtn = document.getElementById('image-btn');
    
    // Bind Image Events
    this.cameraBtn?.addEventListener('click', () => this.fileInputCamera.click());
    this.imageBtn?.addEventListener('click', () => this.fileInputGallery.click());
    
    this.fileInputCamera?.addEventListener('change', (e) => this.handleFileSelect(e));
    this.fileInputGallery?.addEventListener('change', (e) => this.handleFileSelect(e));
  }
  
  handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    
    const remainingSlots = 3 - this.attachedImages.length;
    
    if (remainingSlots <= 0) {
      alert("Maximum 3 images allowed");
      return;
    }
    
    const filesToProcess = files.slice(0, remainingSlots);
    
    filesToProcess.forEach(file => {
      // Add placeholder
      const placeholderId = 'loading-' + Date.now() + Math.random();
      this.renderLoadingPlaceholder(placeholderId);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        // Remove placeholder and add real image
        this.removeLoadingPlaceholder(placeholderId);
        this.attachedImages.push({
          file: file,
          dataUrl: e.target.result
        });
        this.renderImagePreviews();
        this.updateButtonState(); 
      };
      reader.readAsDataURL(file);
    });
    
    event.target.value = '';
  }
  
  renderLoadingPlaceholder(id) {
    this.imagePreviewContainer.classList.remove('hidden');
    const el = document.createElement('div');
    el.className = 'image-preview-item loading';
    el.id = id;
    el.innerHTML = '<div class="spinner-small"></div>';
    this.imagePreviewContainer.appendChild(el);
  }
  
  removeLoadingPlaceholder(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }
  
  renderImagePreviews() {
    this.imagePreviewContainer.innerHTML = '';
    
    if (this.attachedImages.length === 0) {
      this.imagePreviewContainer.classList.add('hidden');
      return;
    }
    
    this.imagePreviewContainer.classList.remove('hidden');
    
    this.attachedImages.forEach((img, index) => {
      const el = document.createElement('div');
      el.className = 'image-preview-item';
      
      const imgEl = document.createElement('img');
      imgEl.src = img.dataUrl;
      
      const removeBtn = document.createElement('div');
      removeBtn.className = 'remove-image-btn';
      removeBtn.innerHTML = '<i class="ph ph-x"></i>';
      removeBtn.onclick = () => this.removeImage(index);
      
      el.appendChild(imgEl);
      el.appendChild(removeBtn);
      this.imagePreviewContainer.appendChild(el);
    });
  }
  
  removeImage(index) {
    this.attachedImages.splice(index, 1);
    this.renderImagePreviews();
    this.updateButtonState();
  }
  
  startRecording() {
    this.isRecording = true;
    this.currentVoiceText = '';
    
    try {
      this.recognition.start();
      
      // UI Update
      this.micBtn.classList.add('hidden');
      this.sendBtn.classList.remove('hidden'); 
      this.sendBtn.classList.add('visible');
      
      this.defaultLeftActions.classList.add('hidden');
      this.recordDeleteBtn.classList.remove('hidden');
      
      // Show Visualizer, Hide Input
      this.chatInput.classList.add('hidden');
      this.voiceVisualizer.classList.remove('hidden');
      
    } catch (e) {
      console.error(e);
      this.isRecording = false;
    }
  }
  
  cancelRecording() {
    this.isRecording = false;
    this.recognition.stop();
    this.chatInput.value = '';
    this.currentVoiceText = '';
    
    // UI Reset
    this.resetUI();
  }
  
  handleSendClick() {
    if (this.isRecording) {
      // Logic: Commit Recording
      this.isRecording = false;
      this.recognition.stop();
      
      // Show Processing
      this.voiceVisualizer.classList.add('hidden');
      this.processingState.classList.remove('hidden');
      
      setTimeout(() => {
        this.processingState.classList.add('hidden');
        this.chatInput.classList.remove('hidden');
        
        if (this.currentVoiceText) {
          this.chatInput.value = this.currentVoiceText;
        }
        
        this.chatInput.focus();
        
        this.defaultLeftActions.classList.remove('hidden');
        this.recordDeleteBtn.classList.add('hidden');
        
        this.updateButtonState();
        
      }, 1000);
      
    } else {
      this.sendMessage();
    }
  }
  
  resetUI() {
    this.defaultLeftActions.classList.remove('hidden');
    this.recordDeleteBtn.classList.add('hidden');
    this.voiceVisualizer.classList.add('hidden');
    this.processingState.classList.add('hidden');
    this.chatInput.classList.remove('hidden');
    this.updateButtonState();
  }
  
  async sendMessage() {
    const text = this.chatInput.value.trim();
    const hasImages = this.attachedImages && this.attachedImages.length > 0;
    
    // Check if there's text OR images
    if (!text && !hasImages) return;
    
    // Clear input
    this.chatInput.value = '';
    this.updateButtonState();
    
    // Determine display text and status
    const displayText = text; // Just text, images handled separately
    const statusType = hasImages ? 'uploading' : 'sending';
    const imagesToDisplay = hasImages ? this.attachedImages.map(img => img.dataUrl) : [];
    
    // Append user message with status and images
    const userMsgId = Date.now();
    this.appendMessage('user', displayText, { 
      status: statusType,
      images: imagesToDisplay,
      id: userMsgId
    });
    
    // Show typing indicator
    this.showTypingIndicator();
    
    try {
      const payload = { 
        text: text || 'What is in this image?', // Default prompt for images
        images: hasImages ? this.attachedImages.map(img => img.dataUrl) : []
      };

      const response = await fetch(`${window.SWUNG_CONFIG.apiBaseUrl}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      // Clear images after sending
      this.attachedImages = [];
      this.renderImagePreviews();
      
      // Update user message status to sent
      this.updateMessageStatus(userMsgId, 'sent');
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Server returned non-JSON response:', response.status);
        this.hideTypingIndicator();
        this.appendMessage('bot', 'Sorry, server returned an unexpected response. Please try again.');
        return;
      }
      
      const data = await response.json();
      
      // Hide typing indicator
      this.hideTypingIndicator();
      
      // Show AI message
      this.appendMessage('bot', data.message);
      this.speak(data.message);
      
      // If action was executed, show event card
      if (data.actionResult && data.action && data.action !== 'none') {
        this.showEventCard(data.action, data.actionResult);
      }
      
    } catch (error) {
      console.error('Error:', error);
      this.hideTypingIndicator();
      this.updateMessageStatus(userMsgId, 'error');
      this.appendMessage('bot', 'Sorry, I encountered an error. Please try again.');
    }
  }
  
  // Show typing indicator (bouncing dots)
  showTypingIndicator() {
    // Remove any existing indicator
    this.hideTypingIndicator();
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typing-indicator';
    indicator.innerHTML = `
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    `;
    this.chatContainer.appendChild(indicator);
    this.scrollToBottom();
  }
  
  // Hide typing indicator
  hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
  }
  
  // Update message status
  updateMessageStatus(msgId, status) {
    const statusEl = document.getElementById(`msg-status-${msgId}`);
    if (!statusEl) return;
    
    statusEl.className = `message-status ${status}`;
    
    if (status === 'sending') {
      statusEl.innerHTML = '<i class="ph ph-circle-notch"></i> Sending...';
    } else if (status === 'uploading') {
      statusEl.innerHTML = '<i class="ph ph-cloud-arrow-up"></i> Uploading...';
    } else if (status === 'sent') {
      statusEl.innerHTML = '<i class="ph ph-check"></i> Sent';
      // Fade out after 2 seconds
      setTimeout(() => {
        statusEl.style.opacity = '0';
      }, 2000);
    } else if (status === 'error') {
      statusEl.innerHTML = '<i class="ph ph-warning"></i> Failed';
      statusEl.style.color = 'var(--accent-red)';
    }
  }
  
    const cardEl = this.createEventCardElement(action, result);
    if (cardEl) {
        this.chatContainer.appendChild(cardEl);
        this.scrollToBottom();
    }
  }

  createEventCardElement(action, result) {
    if (!action || !action.type) return null;
    
    const cardDiv = document.createElement('div');
    cardDiv.className = 'event-card';
    
    if (action.type === 'create_event') {
      const eventDate = new Date(action.datetime);
      const isToday = eventDate.toDateString() === new Date().toDateString();
      const dayStr = isToday ? 'Today' : eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const timeStr = eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const emoji = this.getEventEmoji(action.title);
      const eventId = result?.event?.id || Date.now();
      
      cardDiv.innerHTML = `
        <div class="event-card-inline" data-event-id="${eventId}" data-event='${JSON.stringify(action)}'>
          <div class="event-card-left">
            <div class="event-emoji">${emoji}</div>
          </div>
          <div class="event-card-center">
            <div class="event-title-row">
              <span class="event-title">${action.title}</span>
            </div>
            <div class="event-datetime-row">
              <span class="event-day">${dayStr}</span>
              <span class="event-time">${timeStr}</span>
            </div>
            <div class="event-options-row">
              <div class="event-option">
                <span class="option-icon"><i class="ph ph-phone-call"></i></span>
                <span class="option-label">Call me</span>
                <label class="toggle-switch">
                  <input type="checkbox" class="call-toggle">
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
            <div class="event-reminder-row">
              <span class="reminder-icon"><i class="ph ph-bell"></i></span>
              <span class="reminder-text">Before 15 minutes</span>
            </div>
            <div class="event-desc-row">
              <span class="desc-icon"><i class="ph ph-note"></i></span>
              <span class="desc-text">${action.description || action.title + ' scheduled.'}</span>
            </div>
          </div>
          <div class="event-card-right">
            <button class="edit-event-btn"><i class="ph ph-pencil-simple"></i></button>
          </div>
        </div>
      `;
      
      // Add click handler to open modal
      cardDiv.querySelector('.event-card-inline').addEventListener('click', (e) => {
        if (!e.target.closest('.toggle-switch') && !e.target.closest('.edit-event-btn')) {
           window.eventModal.open({ ...action, id: eventId }, (type, act, res) => {
              // Optional: Render update card in chat flow if needed
              // this.showEventCard(act, res); 
           });
        }
      });
      
      cardDiv.querySelector('.edit-event-btn').addEventListener('click', () => {
         window.eventModal.open({ ...action, id: eventId }, (type, act, res) => {
             // Optional callback
         });
      });
      
    } else if (action.type === 'update_event') {
      // Show simple update confirmation card
      const title = result?.event?.title || 'Event';
      const datetime = result?.event?.datetime || action.datetime;
      const eventDate = new Date(datetime);
      const dayStr = eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const timeStr = eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      
      cardDiv.innerHTML = `
        <div class="event-card-inline update-card">
          <div class="event-card-left">
            <div class="event-emoji">✏️</div>
          </div>
          <div class="event-card-center">
            <div class="event-title-row">
              <span class="event-title">${title} Updated</span>
            </div>
            <div class="event-datetime-row">
              <span class="event-day">${dayStr}</span>
              <span class="event-time">${timeStr}</span>
            </div>
          </div>
        </div>
      `;
      
    } else if (action.type === 'create_alarm') {

      // Show alarm card
      const alarmDate = new Date(action.trigger_at);
      const isToday = alarmDate.toDateString() === new Date().toDateString();
      const dayStr = isToday ? 'Today' : alarmDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const timeStr = alarmDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const alarmId = result?.alarm?.id || Date.now();
      
      cardDiv.innerHTML = `
        <div class="event-card-inline alarm-card" data-alarm-id="${alarmId}">
          <div class="event-card-left">
            <div class="event-emoji">⏰</div>
          </div>
          <div class="event-card-center">
            <div class="event-title-row">
              <span class="event-title">${action.title}</span>
            </div>
            <div class="event-datetime-row">
              <span class="event-day">${dayStr}</span>
              <span class="event-time">${timeStr}</span>
            </div>
            ${action.message ? `<div class="event-desc-row">
              <span class="desc-icon"><i class="ph ph-bell-ringing"></i></span>
              <span class="desc-text">${action.message}</span>
            </div>` : ''}
          </div>
          <div class="event-card-right">
            <button class="edit-alarm-btn"><i class="ph ph-pencil-simple"></i></button>
          </div>
        </div>
      `;
      
      // Add click to edit alarm
      cardDiv.querySelector('.edit-alarm-btn')?.addEventListener('click', () => {
        this.openAlarmModal({ ...action, id: alarmId }, alarmId);
      });
      cardDiv.querySelector('.alarm-card')?.addEventListener('click', (e) => {
        if (!e.target.closest('.edit-alarm-btn')) {
          this.openAlarmModal({ ...action, id: alarmId }, alarmId);
        }
      });
      

    } else if (action.type === 'read_events' && result?.events) {
      const eventsHtml = result.events.slice(0, 5).map(e => {
        const d = new Date(e.datetime);
        const emoji = this.getEventEmoji(e.title);
        return `<div class="event-list-item" data-event-id="${e.id}">
          <div class="event-emoji-small">${emoji}</div>
          <div class="event-info">
            <span class="event-title">${e.title}</span>
            <span class="event-time">${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>`;
      }).join('');
      
      cardDiv.innerHTML = `
        <div class="event-card-header"><span class="event-card-label">Your Schedule</span></div>
        <div class="event-list">${eventsHtml || '<div class="no-events">No events found</div>'}</div>
      `;
    } else if (action.type === 'delete_event') {
      cardDiv.innerHTML = `
        <div class="event-card-inline delete-card">
          <div class="event-emoji"><i class="ph ph-trash"></i></div>
          <div class="event-card-center">
            <div class="event-title">Event Removed</div>
            <div class="event-desc-row">Successfully deleted</div>
          </div>
        </div>
      `;
    } else {
      // Unknown action, don't render card
      return null;
    }
    
    return cardDiv;
  }
  
  getEventEmoji(title) {
    if (!title) return '📅';
    const lower = title.toLowerCase();

    if (lower.includes('meeting') || lower.includes('call')) return '📞';
    if (lower.includes('exam') || lower.includes('test')) return '📚';
    if (lower.includes('gym') || lower.includes('workout')) return '💪';
    if (lower.includes('lunch') || lower.includes('dinner') || lower.includes('food')) return '🍽️';
    if (lower.includes('doctor') || lower.includes('health')) return '🏥';
    if (lower.includes('birthday') || lower.includes('party')) return '🎉';
    if (lower.includes('flight') || lower.includes('travel')) return '✈️';
    if (lower.includes('work') || lower.includes('office')) return '💼';
    if (lower.includes('shop') || lower.includes('buy')) return '🛒';
    return '📅';
  }
  

  
  // Open Alarm Edit Modal
  openAlarmModal(alarm, alarmId) {
    const alarmDate = new Date(alarm.trigger_at);
    const dateStr = alarmDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
    const timeStr = alarmDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    const modal = document.createElement('div');
    modal.className = 'event-modal';
    modal.innerHTML = `
      <div class="event-modal-content">
        <div class="modal-header-row">
          <div class="modal-title">${alarm.title}</div>
          <div class="modal-emoji">⏰</div>
        </div>
        
        <div class="modal-datetime">
          <span class="modal-day">${dateStr}</span>
          <span class="modal-time" id="modal-time-display">${timeStr}</span>
        </div>
        
        ${alarm.message ? `<div class="modal-desc">
          <span class="desc-icon"><i class="ph ph-bell-ringing"></i></span>
          <span class="desc-text">${alarm.message}</span>
        </div>` : ''}
        
        <div class="modal-actions">
          <button class="action-btn delete-btn" data-alarm-id="${alarmId}"><i class="ph ph-trash"></i></button>
          <button class="action-btn close-modal-btn"><i class="ph ph-caret-up"></i></button>
        </div>
        
        <div class="modal-edit-input">
          <input type="text" placeholder="Edit this alarm" class="event-edit-input" id="alarm-modal-edit-field">
          <button class="send-edit-btn hidden" id="alarm-modal-send-btn"><i class="ph ph-paper-plane-tilt"></i></button>
          <button class="voice-edit-btn" id="alarm-modal-mic-btn"><i class="ph ph-microphone"></i></button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const editInput = modal.querySelector('#alarm-modal-edit-field');
    const sendBtn = modal.querySelector('#alarm-modal-send-btn');
    const micBtn = modal.querySelector('#alarm-modal-mic-btn');
    
    // Close modal
    modal.querySelector('.close-modal-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    
    // Toggle send/mic
    editInput.addEventListener('input', () => {
      if (editInput.value.trim()) {
        sendBtn.classList.remove('hidden');
        micBtn.classList.add('hidden');
      } else {
        sendBtn.classList.add('hidden');
        micBtn.classList.remove('hidden');
      }
    });
    
    // Modal chat container
    let modalChatContainer = null;
    const showModalResponse = (message, isError = false) => {
      if (!modalChatContainer) {
        modalChatContainer = document.createElement('div');
        modalChatContainer.className = 'modal-chat-container';
        modalChatContainer.style.cssText = 'max-height: 150px; overflow-y: auto; margin: 12px 0; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 12px;';
        const editInputRow = modal.querySelector('.modal-edit-input');
        editInputRow.parentNode.insertBefore(modalChatContainer, editInputRow);
      }
      const msgDiv = document.createElement('div');
      msgDiv.style.cssText = `padding: 8px 12px; margin: 4px 0; background: ${isError ? 'rgba(255,71,87,0.2)' : 'rgba(96,165,250,0.2)'}; border-radius: 8px; font-size: 14px;`;
      msgDiv.textContent = message;
      modalChatContainer.appendChild(msgDiv);
      modalChatContainer.scrollTop = modalChatContainer.scrollHeight;
    };
    
    // Send edit
    const sendEditMessage = async () => {
      const text = editInput.value.trim();
      if (!text) return;
      
      showModalResponse(`You: ${text}`);
      editInput.value = '';
      sendBtn.classList.add('hidden');
      micBtn.classList.remove('hidden');
      
      const contextMessage = `[Editing alarm ID:${alarmId} titled "${alarm.title}" set for ${alarm.trigger_at}] User says: ${text}`;
      
      try {
        const response = await fetch('/api/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: contextMessage })
        });
        const data = await response.json();
        showModalResponse(`SWUNG: ${data.message}`);
      } catch (error) {
        showModalResponse('Error: Failed to process edit.', true);
      }
    };
    
    sendBtn.addEventListener('click', sendEditMessage);
    editInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendEditMessage();
      }
    });
    
    // Delete alarm  
    modal.querySelector('.delete-btn').addEventListener('click', async () => {
      if (confirm('Delete this alarm?')) {
        await fetch('/api/alarms/' + alarmId, { method: 'DELETE' });
        modal.remove();
        this.appendMessage('bot', 'Alarm deleted!');
      }
    });
  }
  
    const msgEl = this.createMessageElement(sender, text, options);
    this.chatContainer.appendChild(msgEl);
    this.scrollToBottom();
    
    return options.id || msgEl.id.replace('msg-', '');
  }
  
  formatText(text) {
    if (!text) return '';
    return text.replace(/\n/g, '<br>');
  }
  
  scrollToBottom() {
    // Method 1: Direct scroll
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    
    // Method 2: Scroll after DOM update (more reliable)
    requestAnimationFrame(() => {
      this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    });
    
    // Method 3: Scroll the last child into view as fallback
    const lastChild = this.chatContainer.lastElementChild;
    if (lastChild) {
      lastChild.scrollIntoView({ behavior: 'instant', block: 'end' });
    }
  }
  
  speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha'));
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.chatApp = new ChatApp();
});