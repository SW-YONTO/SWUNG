/**
 * API Configuration for SWUNG Mobile App
 * This file configures the base URL for all API calls
 */

// Production API URL (your deployed Render server)
const API_BASE_URL = 'https://swung.onrender.com';

// Export for use in other modules
window.SWUNG_CONFIG = {
  apiBaseUrl: API_BASE_URL,
  socketUrl: API_BASE_URL
};

console.log('📱 SWUNG Mobile App - API:', API_BASE_URL);
