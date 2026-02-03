/**
 * Chat History Tools
 */

import db from '../config/database.js';

/**
 * Save a chat message
 */
export function saveChatMessage(userId, role, content, actionData = null) {
  try {
    const stmt = db.prepare(`
      INSERT INTO chats (user_id, role, content, action_type, action_data)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const actionType = actionData?.type || null;
    const actionDataStr = actionData ? JSON.stringify(actionData) : null;
    
    const result = stmt.run(userId, role, content, actionType, actionDataStr);
    
    return {
      success: true,
      id: result.lastInsertRowid
    };
  } catch (error) {
    console.error('Save chat error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get chat history for a user
 */
export function getChatHistory(userId, limit = 50, offset = 0) {
  try {
    // Fetch latest N messages (descending), then reorder them ascending for chat
    const messages = db.prepare(`
      SELECT * FROM (
        SELECT * FROM chats 
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      ) ORDER BY created_at ASC
    `).all(userId, limit, offset);
    
    // Parse action_data JSON
    return messages.map(msg => ({
      ...msg,
      action_data: msg.action_data ? JSON.parse(msg.action_data) : null
    }));
  } catch (error) {
    console.error('Get chat history error:', error);
    return [];
  }
}

/**
 * Clear chat history for a user
 */
export function clearChatHistory(userId) {
  try {
    db.prepare('DELETE FROM chats WHERE user_id = ?').run(userId);
    return { success: true };
  } catch (error) {
    console.error('Clear chat history error:', error);
    return { success: false, error: error.message };
  }
}

export default {
  saveChatMessage,
  getChatHistory,
  clearChatHistory
};
