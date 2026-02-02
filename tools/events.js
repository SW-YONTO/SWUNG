/**
 * Event Management Tools
 */

import db from '../config/database.js';

/**
 * Create a new event
 */
export function createEvent({ userId, title, datetime, description, location, reminder_minutes = 15 }) {
  try {
    const stmt = db.prepare(`
      INSERT INTO events (user_id, title, datetime, description, location)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(userId, title, datetime, description || null, location || null);
    
    // Create alarm if reminder requested
    if (reminder_minutes > 0) {
      const triggerAt = new Date(new Date(datetime).getTime() - reminder_minutes * 60000).toISOString();
      db.prepare(`
        INSERT INTO alarms (user_id, event_id, title, trigger_at, message)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, result.lastInsertRowid, `Reminder: ${title}`, triggerAt, `${title} starts in ${reminder_minutes} minutes`);
    }
    
    return {
      success: true,
      event: {
        id: result.lastInsertRowid,
        title,
        datetime,
        description,
        location
      },
      message: `Event "${title}" created successfully!`
    };
  } catch (error) {
    console.error('Create event error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Read events for a user
 */
export function readEvents({ userId, query, startDate, endDate }) {
  try {
    let sql = 'SELECT * FROM events WHERE user_id = ?';
    const params = [userId];
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    if (query) {
      switch (query.toLowerCase()) {
        case 'today':
          sql += ` AND date(datetime) = date(?)`;
          params.push(today);
          break;
        case 'tomorrow':
          const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
          sql += ` AND date(datetime) = date(?)`;
          params.push(tomorrow);
          break;
        case 'this week':
          const endOfWeek = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
          sql += ` AND date(datetime) >= date(?) AND date(datetime) <= date(?)`;
          params.push(today, endOfWeek);
          break;
        default:
          // Try to parse as a date
          if (startDate && endDate) {
            sql += ` AND date(datetime) >= date(?) AND date(datetime) <= date(?)`;
            params.push(startDate, endDate);
          }
      }
    }
    
    sql += ' ORDER BY datetime ASC';
    
    const events = db.prepare(sql).all(...params);
    
    return {
      success: true,
      events,
      message: events.length > 0 
        ? `Found ${events.length} event(s).`
        : 'No events found.'
    };
  } catch (error) {
    console.error('Read events error:', error);
    return { success: false, error: error.message, events: [] };
  }
}

/**
 * Get all events for a user
 */
export function getAllEvents(userId) {
  try {
    const events = db.prepare(
      'SELECT * FROM events WHERE user_id = ? ORDER BY datetime ASC'
    ).all(userId);
    return events;
  } catch (error) {
    console.error('Get all events error:', error);
    return [];
  }
}

/**
 * Get event by ID
 */
export function getEventById(eventId) {
  try {
    return db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  } catch (error) {
    console.error('Get event error:', error);
    return null;
  }
}

/**
 * Update an event
 */
export function updateEvent({ userId, eventId, title, datetime, description, location }) {
  try {
    // Verify ownership
    const existing = db.prepare('SELECT * FROM events WHERE id = ? AND user_id = ?').get(eventId, userId);
    if (!existing) {
      return { success: false, error: 'Event not found' };
    }
    
    const updates = [];
    const params = [];
    
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (datetime !== undefined) { updates.push('datetime = ?'); params.push(datetime); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (location !== undefined) { updates.push('location = ?'); params.push(location); }
    
    if (updates.length === 0) {
      return { success: false, error: 'No updates provided' };
    }
    
    updates.push('updated_at = datetime("now")');
    params.push(eventId, userId);
    
    db.prepare(`
      UPDATE events SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `).run(...params);
    
    const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    
    return {
      success: true,
      event: updated,
      message: `Event updated successfully!`
    };
  } catch (error) {
    console.error('Update event error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete an event
 */
export function deleteEvent({ userId, eventId }) {
  try {
    // Verify ownership
    const existing = db.prepare('SELECT * FROM events WHERE id = ? AND user_id = ?').get(eventId, userId);
    if (!existing) {
      return { success: false, error: 'Event not found' };
    }
    
    db.prepare('DELETE FROM events WHERE id = ? AND user_id = ?').run(eventId, userId);
    
    return {
      success: true,
      message: `Event "${existing.title}" deleted successfully!`
    };
  } catch (error) {
    console.error('Delete event error:', error);
    return { success: false, error: error.message };
  }
}

export default {
  createEvent,
  readEvents,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent
};
