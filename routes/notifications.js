
import express from 'express';
import db from '../config/database.js';

const router = express.Router();

/**
 * POST /api/notifications/register-token
 * Register an FCM token for a user
 */
router.post('/register-token', (req, res) => {
  const { token, platform } = req.body;
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO fcm_tokens (user_id, token, platform, updated_at)
      VALUES (?, ?, ?, datetime('now'))
    `);
    
    stmt.run(userId, token, platform || 'web');
    
    console.log(`📱 Token registered for user ${userId} (${platform || 'web'})`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error registering token:', error);
    res.status(500).json({ error: 'Failed to register token' });
  }
});

import { sendPushNotification } from '../tools/notifications.js';

/**
 * POST /api/notifications/test
 * Trigger a test notification
 */
router.post('/test', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await sendPushNotification(userId, 'Test Notification', 'If you see this, it works! 🚀');
    res.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

export default router;
