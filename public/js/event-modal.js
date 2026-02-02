/**
 * SWUNG - Shared Event Modal Component
 * Handles event details, editing, and context-aware chat
 */

class EventModal {
  constructor() {
    this.modal = null;
    this.onUpdate = null; // Callback for when event is updated/deleted
    this.recognition = null; // Voice recognition instance
  }

  open(eventData, onUpdateCallback) {
    const event = { ...eventData }; // Clone
    this.onUpdate = onUpdateCallback;
    
    // Clean up existing if any
    if (this.modal) this.modal.remove();

    const eventDate = new Date(event.datetime);
    const dateStr = eventDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
    const timeStr = eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const emoji = this.getEventEmoji(event.title);

    // Create modal
    this.modal = document.createElement('div');
    this.modal.className = 'event-modal';
    this.modal.id = 'event-edit-modal';
    this.modal.innerHTML = `
      <div class="event-modal-content">
        <!-- Expand Toggle (shown when collapsed) -->
        <button class="expand-toggle" id="expand-toggle-btn">
          <i class="ph ph-caret-down"></i> Show Event Details
        </button>
        
        <!-- Collapsible Upper Section -->
        <div class="modal-upper-section" id="modal-upper-section">
          <div class="modal-header-row">
            <div class="modal-title">${event.title}</div>
            <div class="modal-emoji">${emoji}</div>
          </div>
          
          <div class="modal-datetime">
            <span class="modal-day">${dateStr}</span>
            <span class="modal-time" id="modal-time-display">${timeStr}</span>
          </div>
          
          <div class="modal-option">
            <span class="option-icon"><i class="ph ph-phone-call"></i></span>
            <span class="option-label">Call me</span>
            <label class="toggle-switch">
              <input type="checkbox" class="modal-call-toggle">
              <span class="toggle-slider"></span>
            </label>
          </div>
          
          <div class="modal-option">
            <span class="option-icon"><i class="ph ph-bell"></i></span>
            <span class="option-label">Before 1 day</span>
            <select class="reminder-select">
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="60">1 hour</option>
              <option value="1440" selected>1 day</option>
            </select>
          </div>
          
          <div class="modal-desc">
            <span class="desc-icon"><i class="ph ph-note"></i></span>
            <span class="desc-text">${event.description || event.title + ' scheduled.'}</span>
          </div>
          
          <div class="modal-actions">
            <button class="action-btn delete-btn" data-event-id="${event.id}" title="Delete"><i class="ph ph-trash"></i></button>
            <button class="action-btn save-btn" title="Save"><i class="ph ph-floppy-disk"></i></button>
            <button class="action-btn close-modal-btn" title="Close"><i class="ph ph-caret-up"></i></button>
          </div>
          
          <div class="modal-quick-actions">
            <button class="quick-btn" data-action="postpone">Postpone by 1 hour</button>
            <button class="quick-btn" data-action="uncall">Uncall Me</button>
            <button class="quick-btn" data-action="notify">Notify 30m</button>
          </div>
        </div>
        
        <div class="modal-edit-input">
          <input type="text" placeholder="Edit this event..." class="event-edit-input" id="modal-edit-field">
          <div class="modal-voice-visualizer hidden" id="modal-visualizer">
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
          </div>
          <button class="send-edit-btn hidden" id="modal-send-btn"><i class="ph ph-paper-plane-tilt"></i></button>
          <button class="voice-edit-btn" id="modal-mic-btn"><i class="ph ph-microphone"></i></button>
        </div>
        
        <!-- Modal Chat Container (Scrollable) -->
        <div id="modal-chat-list" class="modal-chat-container"></div>

      </div>
      
      <!-- Delete Confirmation Dialog -->
      <div class="delete-confirm-dialog hidden" id="delete-confirm">
        <div class="confirm-content">
          <div class="confirm-icon"><i class="ph ph-trash"></i></div>
          <h3>Delete Event</h3>
          <p>Are you sure you want to delete "${event.title}"?</p>
          <div class="confirm-buttons">
            <button class="confirm-cancel">Cancel</button>
            <button class="confirm-delete">Delete</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.modal);
    
    // Setup Listeners
    this.setupListeners(event);
    
    // Setup Voice Input
    this.setupVoiceInput();
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

  setupVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }
    
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-IN';
    
    const micBtn = this.modal.querySelector('#modal-mic-btn');
    const editInput = this.modal.querySelector('#modal-edit-field');
    const visualizer = this.modal.querySelector('#modal-visualizer');
    const sendBtn = this.modal.querySelector('#modal-send-btn');
    
    let isRecording = false;
    
    micBtn.addEventListener('click', () => {
      if (isRecording) {
        this.recognition.stop();
        return;
      }
      
      try {
        this.recognition.start();
        isRecording = true;
        micBtn.classList.add('recording');
        visualizer.classList.remove('hidden');
        micBtn.classList.add('hidden');
      } catch (e) {
        console.error('Voice start error:', e);
      }
    });
    
    this.recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      editInput.value = transcript;
      
      // Show send button
      if (transcript.trim()) {
        sendBtn.classList.remove('hidden');
      }
    };
    
    this.recognition.onend = () => {
      isRecording = false;
      micBtn.classList.remove('recording');
      visualizer.classList.add('hidden');
      micBtn.classList.remove('hidden');
      
      // DON'T auto-send - just show send button if there's text
      // User can edit the text before sending
      if (editInput.value.trim()) {
        sendBtn.classList.remove('hidden');
        micBtn.classList.add('hidden');
        editInput.focus(); // Focus so user can edit
      }
    };
    
    this.recognition.onerror = (event) => {
      console.error('Voice error:', event.error);
      isRecording = false;
      micBtn.classList.remove('recording');
      visualizer.classList.add('hidden');
      micBtn.classList.remove('hidden');
    };
  }

  setupListeners(event) {
    const modal = this.modal;
    const editInput = modal.querySelector('#modal-edit-field');
    const sendBtn = modal.querySelector('#modal-send-btn');
    const micBtn = modal.querySelector('#modal-mic-btn');
    const deleteConfirm = modal.querySelector('#delete-confirm');
    const visualizer = modal.querySelector('#modal-visualizer');
    const upperSection = modal.querySelector('#modal-upper-section');
    const expandToggle = modal.querySelector('#expand-toggle-btn');
    
    // Close
    modal.querySelector('.close-modal-btn').addEventListener('click', () => this.close());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.close();
    });
    
    // Expand/Collapse Toggle
    expandToggle.addEventListener('click', () => {
      upperSection.classList.remove('collapsed');
      expandToggle.classList.remove('visible');
    });
    
    // Input Toggle
    editInput.addEventListener('input', () => {
      if (editInput.value.trim()) {
        sendBtn.classList.remove('hidden');
        micBtn.classList.add('hidden');
      } else {
        sendBtn.classList.add('hidden');
        micBtn.classList.remove('hidden');
      }
    });


    // Chat Logic
    const sendEditMessage = async () => {
      const text = editInput.value.trim();
      if (!text) return;
      
      // UI Update
      this.addChatMessage(text, 'user');
      editInput.value = '';
      sendBtn.classList.add('hidden');
      micBtn.classList.remove('hidden');
      
      // Show typing indicator
      this.showTypingIndicator();

      // Prepare context
      const contextMessage = `[Editing event ID:${event.id} titled "${event.title}" scheduled at ${event.datetime}] User says: ${text}`;
      
      try {
        const response = await fetch('/api/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: contextMessage,
            eventContext: { id: event.id, title: event.title, datetime: event.datetime }
          })
        });
        
        const data = await response.json();
        
        // Remove typing indicator
        this.hideTypingIndicator();
        
        // Bot Response
        this.addChatMessage(data.message.replace(/^SWUNG:\s*/i, ''), 'bot');
        
        // Handle Action Result
        if (data.actionResult && data.actionResult.success) {
          if (data.action.type === 'update_event' && data.actionResult.event) {
            this.updateEventDisplay(data.actionResult.event);
            event.datetime = data.actionResult.event.datetime;
            event.title = data.actionResult.event.title;
          }
          
          // Callback for parent refresh
          if (this.onUpdate) {
            this.onUpdate(data.action.type, data.action, data.actionResult);
          }
        }
      } catch (err) {
        console.error('Edit error:', err);
        this.hideTypingIndicator();
        this.addChatMessage('Failed to process edit.', 'error');
      }
    };

    sendBtn.addEventListener('click', sendEditMessage);
    editInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendEditMessage();
      }
    });

    // Quick Actions
    modal.querySelectorAll('.quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        let text = '';
        if (action === 'postpone') text = 'postpone by 1 hour';
        else if (action === 'uncall') text = 'Stop calling me for this event'; // Example natural language
        else if (action === 'notify') text = 'notify me 30 minutes before';
        
        if (text) {
            editInput.value = text;
            editInput.dispatchEvent(new Event('input')); // Trigger toggle
            sendEditMessage(); // Auto-send
        }
      });
    });

    // Delete
    modal.querySelector('.delete-btn').addEventListener('click', () => {
        deleteConfirm.classList.remove('hidden');
    });
    modal.querySelector('.confirm-cancel').addEventListener('click', () => {
        deleteConfirm.classList.add('hidden');
    });
    modal.querySelector('.confirm-delete').addEventListener('click', async () => {
        try {
            await fetch(`/api/events/${event.id}`, { method: 'DELETE' });
            this.close();
            if (this.onUpdate) this.onUpdate('delete', event.id);
        } catch(e) {
            console.error(e);
            alert('Failed to delete');
        }
    });
  }
  
  updateEventDisplay(updatedEvent) {
    if (!this.modal) return;
    const newDate = new Date(updatedEvent.datetime);
    this.modal.querySelector('.modal-day').textContent = newDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
    this.modal.querySelector('#modal-time-display').textContent = newDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    this.modal.querySelector('.modal-title').textContent = updatedEvent.title;
  }

  showTypingIndicator() {
    if (!this.modal) return;
    const container = this.modal.querySelector('.modal-chat-container');
    
    // Remove existing typing indicator if present
    const existing = container.querySelector('.modal-typing-indicator');
    if (existing) existing.remove();
    
    const indicator = document.createElement('div');
    indicator.className = 'modal-typing-indicator';
    indicator.innerHTML = `<div class="dot"></div><div class="dot"></div><div class="dot"></div>`;
    container.appendChild(indicator);
    container.scrollTop = container.scrollHeight;
  }
  
  hideTypingIndicator() {
    if (!this.modal) return;
    const container = this.modal.querySelector('.modal-chat-container');
    const indicator = container.querySelector('.modal-typing-indicator');
    if (indicator) indicator.remove();
  }

  addChatMessage(text, sender) {
    if (!this.modal) return;
    const container = this.modal.querySelector('.modal-chat-container');
    const upperSection = this.modal.querySelector('#modal-upper-section');
    const expandToggle = this.modal.querySelector('#expand-toggle-btn');
    
    // Collapse upper section to make room for chat
    if (container.children.length === 0) {
      // First message - collapse the upper section
      upperSection.classList.add('collapsed');
      expandToggle.classList.add('visible');
    }
    
    const div = document.createElement('div');
    div.className = `modal-chat-msg ${sender}`;
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  close() {
    // Stop any ongoing recognition
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }
}

// Global Singleton
window.eventModal = new EventModal();
