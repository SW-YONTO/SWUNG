/**
 * SWUNG - Calendar Page Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // State
    const events = window.calendarEvents || [];
    let currentDate = new Date();
    let currentView = 'list'; // 'list' or 'grid'
    let monthPickerOpen = false;
  
    // Elements
    const monthTitleBtn = document.getElementById('calendar-title-trigger');
    const currentMonthDisplay = document.getElementById('current-month-display');
    const listViewContainer = document.getElementById('list-view-container');
    const gridViewContainer = document.getElementById('grid-view-container');
    const eventListContent = document.getElementById('event-list-content');
    const calendarGridDays = document.getElementById('calendar-grid-days');
    const viewTogglePill = document.querySelector('.view-toggle-pill');
    const todayDateBadge = document.getElementById('today-date-badge');
    
    // Toggles
    const btnViewGrid = document.getElementById('btn-view-grid');
    const btnViewList = document.getElementById('btn-view-list');
  
    // ==========================================
    // Initialization
    // ==========================================
    
    init();
  
    function init() {
      // MOCK DATA for demo
      if (events.length === 0) {
         const today = new Date();
         const y = today.getFullYear();
         const m = today.getMonth();
         
         const mockEvents = [
             {
                 id: 'm1',
                 title: 'Rahul Office (Udemy)',
                 datetime: new Date(y, m, 23, 19, 50).toISOString(),
                 description: 'Mock event'
             },
             {
                 id: 'm2',
                 title: 'Weekly Planning',
                 datetime: new Date(y, m, 26, 9, 30).toISOString(),
                 description: 'Mock event',
                 emoji: '📅'
             },
             {
                 id: 'm3',
                 title: 'Physical Activity Trainer Exam',
                 datetime: new Date(y, m, 27, 9, 0).toISOString(),
                 description: 'Mock event',
                 emoji: '🏋️'
             },
             {
                 id: 'm4',
                 title: 'Physics Practical',
                 datetime: new Date(y, m, 28, 9, 0).toISOString(),
                 description: ''
             },
             {
                 id: 'm5',
                 title: 'Weekly Planning',
                 datetime: new Date(y, m, 12, 9, 30).toISOString(),
                 description: 'Mock event',
                 emoji: '📅'
             },
             {
                 id: 'm6',
                 title: 'Weekly Planning',
                 datetime: new Date(y, m, 19, 9, 30).toISOString(),
                 description: 'Mock event',
                 emoji: '📅'
             }
         ];
         
         events.length = 0;
         events.push(...mockEvents);
      }

      renderMonthTitle();
      renderListView();
      renderGridView();
      
      setupEventListeners();
    }
  
    function setupEventListeners() {
      // Toggle Views - Grid icon shows list, List/Calendar icon shows grid
      btnViewGrid.addEventListener('click', () => switchView('list'));
      btnViewList.addEventListener('click', () => switchView('grid'));
      
      // Month title click - open month picker
      monthTitleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMonthPicker();
      });

      // Today date badge click - scroll to today
      todayDateBadge?.addEventListener('click', () => {
        scrollToToday();
      });

      // Close month picker when clicking outside
      document.addEventListener('click', (e) => {
        if (monthPickerOpen && !e.target.closest('.month-picker') && !e.target.closest('#calendar-title-trigger')) {
          closeMonthPicker();
        }
      });
    }
  
    function switchView(view) {
      currentView = view;
      
      if (view === 'grid') {
        listViewContainer.classList.add('hidden');
        gridViewContainer.classList.remove('hidden');
        btnViewList.classList.add('active');
        btnViewGrid.classList.remove('active');
        viewTogglePill.classList.add('grid-active');
      } else {
        // list view
        gridViewContainer.classList.add('hidden');
        listViewContainer.classList.remove('hidden');
        btnViewGrid.classList.add('active');
        btnViewList.classList.remove('active');
        viewTogglePill.classList.remove('grid-active');
      }
    }
  
    function renderMonthTitle() {
      const options = { month: 'long' };
      currentMonthDisplay.textContent = currentDate.toLocaleDateString('en-US', options);
    }

    // ==========================================
    // Month Picker
    // ==========================================

    function toggleMonthPicker() {
      if (monthPickerOpen) {
        closeMonthPicker();
      } else {
        openMonthPicker();
      }
    }

    function openMonthPicker() {
      // Remove existing picker
      closeMonthPicker();
      
      const picker = document.createElement('div');
      picker.className = 'month-picker';
      picker.innerHTML = createMonthPickerHTML();
      
      // Insert after header
      const header = document.querySelector('.calendar-top-bar');
      header.insertAdjacentElement('afterend', picker);
      
      monthPickerOpen = true;
      
      // Add animation class
      requestAnimationFrame(() => {
        picker.classList.add('open');
      });
      
      // Setup picker events
      setupMonthPickerEvents(picker);
    }

    function closeMonthPicker() {
      const picker = document.querySelector('.month-picker');
      if (picker) {
        picker.classList.remove('open');
        setTimeout(() => picker.remove(), 200);
      }
      monthPickerOpen = false;
    }

    function createMonthPickerHTML() {
      const year = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      let monthsHTML = '';
      months.forEach((m, i) => {
        const isActive = i === currentMonth;
        monthsHTML += `<button class="month-btn${isActive ? ' active' : ''}" data-month="${i}">${m}</button>`;
      });
      
      return `
        <div class="month-picker-header">
          <button class="year-nav-btn prev-year"><i class="ph ph-caret-left"></i></button>
          <span class="year-display">${year}</span>
          <button class="year-nav-btn next-year"><i class="ph ph-caret-right"></i></button>
        </div>
        <div class="month-grid">
          ${monthsHTML}
        </div>
      `;
    }

    function setupMonthPickerEvents(picker) {
      // Year navigation
      picker.querySelector('.prev-year').addEventListener('click', (e) => {
        e.stopPropagation();
        currentDate.setFullYear(currentDate.getFullYear() - 1);
        updateMonthPicker(picker);
      });
      
      picker.querySelector('.next-year').addEventListener('click', (e) => {
        e.stopPropagation();
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        updateMonthPicker(picker);
      });
      
      // Month buttons
      picker.querySelectorAll('.month-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const month = parseInt(btn.dataset.month);
          currentDate.setMonth(month);
          closeMonthPicker();
          renderMonthTitle();
          renderListView();
          renderGridView();
        });
      });
    }

    function updateMonthPicker(picker) {
      picker.innerHTML = createMonthPickerHTML();
      setupMonthPickerEvents(picker);
    }

    // ==========================================
    // Scroll to Today
    // ==========================================

    function scrollToToday() {
      // Ensure we're in the current month
      const today = new Date();
      if (currentDate.getMonth() !== today.getMonth() || currentDate.getFullYear() !== today.getFullYear()) {
        currentDate = new Date();
        renderMonthTitle();
        renderListView();
        renderGridView();
      }
      
      // Scroll to today in list view
      setTimeout(() => {
        const todayEl = eventListContent.querySelector('.day-header.today');
        if (todayEl) {
          todayEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      
      // Switch to list view if in grid
      if (currentView === 'grid') {
        switchView('list');
      }
    }
  
    // ==========================================
    // Rendering: List View
    // ==========================================
  
    function renderListView() {
      eventListContent.innerHTML = '';
  
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      // Group events by Date String
      const grouped = groupEventsByDate(events);
      const today = new Date();
      const todayStr = today.toDateString();
  
      // Iterate through ALL days of the month
      for (let day = 1; day <= daysInMonth; day++) {
          const dateObj = new Date(year, month, day);
          const dateKey = dateObj.toDateString();
          const dayEvents = grouped[dateKey] || [];
          
          // Day Container
          const dayContainer = document.createElement('div');
          dayContainer.className = 'day-group';
          dayContainer.id = `day-${day}`;
          
          // Header with date and day name
          const isToday = todayStr === dateObj.toDateString();
          const hasEvents = dayEvents.length > 0;
          
          // Build class names
          let headerClass = 'day-header';
          if (isToday) headerClass += ' today';
          if (hasEvents) headerClass += ' has-events';
          
          // Format: "23 Fri"
          const dayNum = dateObj.getDate();
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          
          const headerEl = document.createElement('div');
          headerEl.className = headerClass;
          headerEl.innerHTML = `<span class="day-date">${dayNum}</span> <span class="day-name">${dayName}</span>`;
          
          // Append Header
          dayContainer.appendChild(headerEl);
          
          // Append Events (if any)
          if (dayEvents.length > 0) {
              dayEvents.forEach(event => {
                  const eventCard = createEventCard(event);
                  dayContainer.appendChild(eventCard);
              });
          }
          
          eventListContent.appendChild(dayContainer);
      }
      
      // Scroll to today on initial load
      setTimeout(() => {
          const todayEl = eventListContent.querySelector('.day-header.today');
          if (todayEl) {
               todayEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
      }, 100);
    }
  
    function groupEventsByDate(eventsList) {
      const groups = {};
      eventsList.forEach(event => {
        const dateKey = new Date(event.datetime).toDateString();
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(event);
      });
      return groups;
    }
  
    function createEventCard(event) {
      const card = document.createElement('div');
      card.className = 'cal-event-card';
      card.dataset.eventId = event.id;
      
      const eventDate = new Date(event.datetime);
      const timeStr = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const dayNum = eventDate.getDate();
      const monthShort = eventDate.toLocaleDateString('en-US', { month: 'short' });
      
      // Determine dot color based on event type
      let dotColor = '#60a5fa'; // blue default
      if (event.title.toLowerCase().includes('plan')) dotColor = '#fb923c'; // orange
      else if (event.title.toLowerCase().includes('gym') || event.title.toLowerCase().includes('fitness') || event.title.toLowerCase().includes('physical')) dotColor = '#4ade80'; // green
      else if (event.title.toLowerCase().includes('exam') || event.title.toLowerCase().includes('study')) dotColor = '#60a5fa'; // blue
      else if (event.title.toLowerCase().includes('call') || event.title.toLowerCase().includes('meet')) dotColor = '#f472b6'; // pink
  
      // Build card HTML
      let rightContent = '';
      if (event.emoji) {
        rightContent = `<span class="cal-event-emoji">${event.emoji}</span>`;
      } else {
        rightContent = `
          <div class="cal-sheet-icon">
              <div class="cal-sheet-header">${monthShort.toUpperCase()}</div>
              <div class="cal-sheet-body">${dayNum}</div>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="cal-event-title">${event.title}</div>
        <div class="cal-event-detail-row">
            <div class="cal-event-time">
                <span class="time-dot" style="background:${dotColor};"></span>
                ${timeStr}
            </div>
            ${rightContent}
        </div>
      `;
      
      // Add click handler to use shared modal
      card.addEventListener('click', () => {
        window.eventModal.open(event, (action, id) => {
           if (action === 'delete') {
             const idx = events.findIndex(e => e.id === id);
             if (idx > -1) events.splice(idx, 1);
             renderListView();
             renderGridView();
           }
        });
      });
      
      return card;
    }


  
    // ==========================================
    // Rendering: Grid View
    // ==========================================
  
    function renderGridView() {
      calendarGridDays.innerHTML = '';
      
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      // Previous Month Padding
      const prevMonthDays = new Date(year, month, 0).getDate();
      
      // Adjust for Monday start (M T W T F S S)
      let startDayIndex = firstDay === 0 ? 6 : firstDay - 1; 
      
      // Render previous month padding
      for (let i = startDayIndex; i > 0; i--) {
        const dayNum = prevMonthDays - i + 1;
        const cell = document.createElement('div');
        cell.className = 'calendar-day-cell other-month';
        cell.innerHTML = `<span>${dayNum}</span>`;
        calendarGridDays.appendChild(cell);
      }
      
      // Render current month
      for (let i = 1; i <= daysInMonth; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day-cell';
        
        // Check if today
        const checkDate = new Date(year, month, i);
        if (checkDate.toDateString() === new Date().toDateString()) {
            cell.classList.add('today');
        }
        
        // Date Number
        let cellContent = `<span>${i}</span>`;
        
        // Check for events
        const dateKey = checkDate.toDateString();
        const dayEvents = events.filter(e => new Date(e.datetime).toDateString() === dateKey);
  
        if (dayEvents.length > 0) {
            cellContent += `<div class="event-pill-container">`;
            
            dayEvents.slice(0, 3).forEach((e, index) => {
                 let pillClass = 'event-pill gray';
                 if (e.title.toLowerCase().includes('plan')) pillClass = 'event-pill orange';
                 else if (e.title.toLowerCase().includes('gym') || e.title.toLowerCase().includes('fitness')) pillClass = 'event-pill green';
                 else if (e.title.toLowerCase().includes('exam') || e.title.toLowerCase().includes('study')) pillClass = 'event-pill blue';
                 else if (e.title.toLowerCase().includes('rahul')) pillClass = 'event-pill blue';
                 
                 cellContent += `<div class="${pillClass}" data-event-index="${index}">${e.title}</div>`;
            });
            
            // Overflow indicator
            if (dayEvents.length > 3) {
                 cellContent += `<div class="event-pill gray" style="text-align:center">+${dayEvents.length - 3}</div>`;
            }
            
            cellContent += `</div>`;
        }
        
        cell.innerHTML = cellContent;
        
        // Add click handlers for event pills
        if (dayEvents.length > 0) {
          cell.querySelectorAll('.event-pill[data-event-index]').forEach((pill, index) => {
            pill.addEventListener('click', (e) => {
              e.stopPropagation(); // Prevent cell click
              const event = dayEvents[index];
              if (event) {
                window.eventModal.open(event, (action, id) => {
                  if (action === 'delete') {
                    const idx = events.findIndex(ev => ev.id === id);
                    if (idx > -1) events.splice(idx, 1);
                    renderListView();
                    renderGridView();
                  } else if (action === 'update_event') {
                    renderListView();
                    renderGridView();
                  }
                });
              }
            });
          });
        }
        
        calendarGridDays.appendChild(cell);
      }
      
      // Next month padding
      const totalCells = startDayIndex + daysInMonth;
      const nextMonthPadding = 7 - (totalCells % 7);
      if (nextMonthPadding < 7) {
        for (let i = 1; i <= nextMonthPadding; i++) {
           const cell = document.createElement('div');
           cell.className = 'calendar-day-cell other-month';
           cell.innerHTML = `<span>${i}</span>`;
           calendarGridDays.appendChild(cell);
        }
      }
    }
  });
