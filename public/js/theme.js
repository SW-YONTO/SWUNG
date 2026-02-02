/**
 * SWUNG Theme Manager
 * Handles theme switching across all pages with server sync
 */

(function() {
  'use strict';
  
  const THEME_KEY = 'swung-theme';
  
  // Get saved theme or default to dark
  function getSavedTheme() {
    return localStorage.getItem(THEME_KEY) || 'dark';
  }
  
  // Apply theme to document
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }
  
  // Initialize theme on page load (before render to prevent flash)
  function initTheme() {
    const savedTheme = getSavedTheme();
    applyTheme(savedTheme);
    
    // Sync with server preferences
    fetch('/api/preferences')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.preferences && data.preferences.theme) {
          const serverTheme = data.preferences.theme;
          if (serverTheme !== savedTheme && serverTheme !== 'system') {
            applyTheme(serverTheme);
          }
        }
      })
      .catch(() => {}); // Silently fail if offline
  }
  
  // Toggle theme
  function toggleTheme() {
    const current = getSavedTheme();
    const newTheme = current === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    saveThemeToServer(newTheme);
    return newTheme;
  }
  
  // Set specific theme
  function setTheme(theme) {
    applyTheme(theme);
    saveThemeToServer(theme);
  }
  
  // Save theme to server
  function saveThemeToServer(theme) {
    fetch('/api/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme })
    }).catch(() => {}); // Silently fail
  }
  
  // Expose globally
  window.SwungTheme = {
    get: getSavedTheme,
    set: setTheme,
    toggle: toggleTheme,
    apply: applyTheme
  };
  
  // Apply theme immediately (before DOM ready)
  initTheme();
  
  // Also apply when DOM is ready (safety)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  }
})();
