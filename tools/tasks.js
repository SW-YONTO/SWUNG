/**
 * Task/Todo Management Tools
 */

import db from '../config/database.js';

/**
 * Create a new task
 */
export function createTask({ userId, title, description, priority = 'medium', dueDate }) {
  try {
    const stmt = db.prepare(`
      INSERT INTO tasks (user_id, title, description, priority, due_date)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(userId, title, description || null, priority, dueDate || null);
    
    return {
      success: true,
      task: {
        id: result.lastInsertRowid,
        title,
        description,
        priority,
        due_date: dueDate
      },
      message: `Task "${title}" created!`
    };
  } catch (error) {
    console.error('Create task error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * List tasks for a user
 */
export function listTasks({ userId, showCompleted = false }) {
  try {
    let sql = 'SELECT * FROM tasks WHERE user_id = ?';
    if (!showCompleted) {
      sql += ' AND completed = 0';
    }
    sql += ' ORDER BY priority DESC, due_date ASC, created_at DESC';
    
    const tasks = db.prepare(sql).all(userId);
    console.log(`📋 [Tools] listTasks for User ${userId}: Found ${tasks.length} tasks`);
    
    return {
      success: true,
      tasks,
      message: tasks.length > 0 
        ? `Found ${tasks.length} task(s).`
        : 'No tasks found.'
    };
  } catch (error) {
    console.error('List tasks error:', error);
    return { success: false, error: error.message, tasks: [] };
  }
}

/**
 * Complete/Toggle a task
 */
export function completeTask({ userId, taskId }) {
  // Ensure taskId is an integer
  taskId = parseInt(taskId);
  console.log(`📋 [Tasks] completeTask called: userId=${userId}, taskId=${taskId}`);
  
  try {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(taskId, userId);
    if (!existing) {
      console.log(`📋 [Tasks] Task ${taskId} not found for user ${userId}`);
      return { success: false, error: 'Task not found' };
    }
    
    // Toggle the completed status
    const newStatus = existing.completed ? 0 : 1;
    console.log(`📋 [Tasks] Toggling task ${taskId} from ${existing.completed} to ${newStatus}`);
    
    if (newStatus === 1) {
      db.prepare(`
        UPDATE tasks SET completed = 1, completed_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ? AND user_id = ?
      `).run(taskId, userId);
    } else {
      db.prepare(`
        UPDATE tasks SET completed = 0, completed_at = NULL, updated_at = datetime('now')
        WHERE id = ? AND user_id = ?
      `).run(taskId, userId);
    }
    
    return {
      success: true,
      completed: newStatus === 1,
      message: newStatus === 1 ? `Task "${existing.title}" completed!` : `Task "${existing.title}" restored!`
    };
  } catch (error) {
    console.error('Complete task error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a task
 */
export function updateTask({ userId, taskId, title, description, priority, dueDate }) {
  try {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(taskId, userId);
    if (!existing) {
      return { success: false, error: 'Task not found' };
    }
    
    const updates = [];
    const params = [];
    
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
    if (dueDate !== undefined) { updates.push('due_date = ?'); params.push(dueDate); }
    
    if (updates.length === 0) {
      return { success: false, error: 'No updates provided' };
    }
    
    updates.push('updated_at = datetime("now")');
    params.push(taskId, userId);
    
    db.prepare(`
      UPDATE tasks SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `).run(...params);
    
    return {
      success: true,
      message: `Task updated successfully!`
    };
  } catch (error) {
    console.error('Update task error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a task
 */
export function deleteTask({ userId, taskId }) {
  try {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(taskId, userId);
    if (!existing) {
      return { success: false, error: 'Task not found' };
    }
    
    db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(taskId, userId);
    
    return {
      success: true,
      message: `Task "${existing.title}" deleted!`
    };
  } catch (error) {
    console.error('Delete task error:', error);
    return { success: false, error: error.message };
  }
}

export default {
  createTask,
  listTasks,
  completeTask,
  updateTask,
  deleteTask
};
