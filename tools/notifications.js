
import admin from 'firebase-admin';
import db from '../config/database.js';

// Initialize Firebase Admin
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Initialize Firebase Admin
let isInitialized = false;

/**
 * Get Firebase service account credentials
 * Priority: 1) Environment variable (base64) 2) JSON file
 */
function getServiceAccount() {
  // Option 1: Read from environment variable (for production/Render)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(decoded);
      console.log('✅ Firebase credentials loaded from environment variable');
      return serviceAccount;
    } catch (err) {
      console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64:', err.message);
    }
  }
  
  // Option 2: Read from file (for local development)
  try {
    const serviceAccount = require('../serviceAccountKey.json');
    if (serviceAccount.private_key_id === "PASTE_YOUR_PRIVATE_KEY_ID_HERE") {
      console.log('⚠️ Firebase Service Account is still a placeholder');
      return null;
    }
    console.log('✅ Firebase credentials loaded from serviceAccountKey.json');
    return serviceAccount;
  } catch (err) {
    console.log('⚠️ serviceAccountKey.json not found');
    return null;
  }
}

try {
  const serviceAccount = getServiceAccount();
  
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    isInitialized = true;
    console.log('✅ Firebase Admin initialized successfully');
  } else {
    console.log('⚠️ Firebase Admin not initialized - push notifications will not work');
  }
} catch (error) {
  console.log('⚠️ Failed to initialize Firebase Admin:', error.message);
}

/**
 * Send a push notification to a user
 * @param {number} userId - The ID of the user to notify
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 */
export async function sendPushNotification(userId, title, body) {
  console.log(`📨 [Notification] To User ${userId}: ${title} - ${body}`);

  // Get tokens for user
  const tokens = getTokens(userId);
  if (tokens.length === 0) {
    console.log(`   No FCM tokens found for user ${userId}`);
    return;
  }

  if (!isInitialized) {
    console.log('   (Firebase not initialized, skipping actual send)');
    return;
  }

  const message = {
    notification: {
      title,
      body,
    },
    tokens: tokens.map(t => t.token),
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx].token);
        }
      });
      console.log('   List of tokens that caused failures: ' + failedTokens);
      // Optional: Cleanup invalid tokens here
      removeInvalidTokens(userId, failedTokens);
    }
  } catch (error) {
    console.error('   Error sending message:', error);
  }
}

function getTokens(userId) {
  return db.prepare('SELECT token FROM fcm_tokens WHERE user_id = ?').all(userId);
}

function removeInvalidTokens(userId, tokens) {
  // Implementation to remove invalid tokens from DB
  const stmt = db.prepare('DELETE FROM fcm_tokens WHERE user_id = ? AND token = ?');
  tokens.forEach(token => {
    stmt.run(userId, token);
  });
}
