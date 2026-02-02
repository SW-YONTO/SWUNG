/**
 * User Management Tools
 */

import db from '../config/database.js';

/**
 * Find user by GitHub ID
 */
export function findUserByGithubId(githubId) {
  try {
    return db.prepare('SELECT * FROM users WHERE github_id = ?').get(githubId);
  } catch (error) {
    console.error('Find user error:', error);
    return null;
  }
}

/**
 * Find user by ID
 */
export function findUserById(id) {
  try {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  } catch (error) {
    console.error('Find user error:', error);
    return null;
  }
}

/**
 * Create a new user
 */
export function createUser({ githubId, username, email, name, avatarUrl, accessToken }) {
  try {
    const stmt = db.prepare(`
      INSERT INTO users (github_id, username, email, name, avatar_url, access_token)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(githubId, username, email, name, avatarUrl, accessToken);
    
    return result.lastInsertRowid;
  } catch (error) {
    console.error('Create user error:', error);
    return null;
  }
}

/**
 * Update user token
 */
export function updateUserToken(userId, accessToken) {
  try {
    db.prepare(`
      UPDATE users SET access_token = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(accessToken, userId);
    
    return true;
  } catch (error) {
    console.error('Update user token error:', error);
    return false;
  }
}

/**
 * Update user profile
 */
export function updateUserProfile(userId, { name, email, avatarUrl }) {
  try {
    const updates = [];
    const params = [];
    
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (avatarUrl !== undefined) { updates.push('avatar_url = ?'); params.push(avatarUrl); }
    
    if (updates.length === 0) return true;
    
    updates.push('updated_at = datetime("now")');
    params.push(userId);
    
    db.prepare(`
      UPDATE users SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...params);
    
    return true;
  } catch (error) {
    console.error('Update user profile error:', error);
    return false;
  }
}

export default {
  findUserByGithubId,
  findUserById,
  createUser,
  updateUserToken,
  updateUserProfile
};
