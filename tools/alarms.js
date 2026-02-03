/**
 * Alarm/Reminder Management Tools
 */

import db from '../config/database.js';

/**
 * Create a new alarm
 */
export function createAlarm({ userId, eventId = null, title, triggerAt, message, callUser = false }) {
  try {
    const stmt = db.prepare(`
      INSERT INTO alarms (user_id, event_id, title, trigger_at, message, call_user)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(userId, eventId, title, triggerAt, message || null, callUser ? 1 : 0);
    
    return {
      success: true,
      alarm: {
        id: result.lastInsertRowid,
        title,
        trigger_at: triggerAt,
        message,
        call_user: callUser
      },
      message: `Alarm "${title}" set for ${new Date(triggerAt).toLocaleString()}!`
    };
  } catch (error) {
    console.error('Create alarm error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get pending alarms
 */
export function getPendingAlarms() {
  try {
    // Get current time in IST (India Standard Time, UTC+5:30)
    const now = new Date();
    
    // Format current time as local datetime string (matches stored format)
    // Stored format: "2026-02-03T14:36:46" (no timezone suffix, IST assumed)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const localNow = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    
    console.log(`🕐 Checking alarms: now=${localNow} (local time)`);
    
    const alarms = db.prepare(`
      SELECT a.*, u.name as user_name, e.title as event_title
      FROM alarms a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN events e ON a.event_id = e.id
      WHERE a.is_triggered = 0 AND a.is_active = 1 AND a.trigger_at <= ?
      ORDER BY a.trigger_at ASC
    `).all(localNow);
    
    return alarms;
  } catch (error) {
    console.error('Get pending alarms error:', error);
    return [];
  }
}

/**
 * Get all active alarms for a user
 */
export function getActiveAlarms(userId) {
  try {
    const alarms = db.prepare(`
      SELECT * FROM alarms 
      WHERE user_id = ? AND is_active = 1
      ORDER BY trigger_at ASC
    `).all(userId);
    
    return {
      success: true,
      alarms,
      message: alarms.length > 0 
        ? `Found ${alarms.length} active alarm(s).`
        : 'No active alarms.'
    };
  } catch (error) {
    console.error('Get active alarms error:', error);
    return { success: false, error: error.message, alarms: [] };
  }
}

/**
 * Mark alarm as triggered
 */
export function markAlarmTriggered(alarmId) {
  try {
    db.prepare(`
      UPDATE alarms SET is_triggered = 1, is_active = 0
      WHERE id = ?
    `).run(alarmId);
    
    return { success: true };
  } catch (error) {
    console.error('Mark alarm triggered error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete an alarm
 */
export function deleteAlarm({ userId, alarmId }) {
  try {
    const existing = db.prepare('SELECT * FROM alarms WHERE id = ? AND user_id = ?').get(alarmId, userId);
    if (!existing) {
      return { success: false, error: 'Alarm not found' };
    }
    
    db.prepare('DELETE FROM alarms WHERE id = ? AND user_id = ?').run(alarmId, userId);
    
    return {
      success: true,
      message: `Alarm deleted!`
    };
  } catch (error) {
    console.error('Delete alarm error:', error);
    return { success: false, error: error.message };
  }
}

export default {
  createAlarm,
  getPendingAlarms,
  getActiveAlarms,
  markAlarmTriggered,
  deleteAlarm
};
