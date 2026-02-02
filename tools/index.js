/**
 * Tools Index - Central registry for all tool functions
 */

import { createEvent, readEvents, getAllEvents, getEventById, updateEvent, deleteEvent } from './events.js';
import { createTask, listTasks, completeTask, updateTask, deleteTask } from './tasks.js';
import { createAlarm, getPendingAlarms, getActiveAlarms, markAlarmTriggered, deleteAlarm } from './alarms.js';
import { findUserByGithubId, findUserById, createUser, updateUserToken } from './users.js';
import { saveChatMessage, getChatHistory, clearChatHistory } from './chat.js';

/**
 * Execute a tool action based on AI response
 */
export function executeAction(actionType, params, userId) {
  console.log('🔧 Executing action:', actionType, params);
  
  switch (actionType) {
    case 'create_event':
      return createEvent({
        userId,
        title: params.title,
        datetime: params.datetime,
        description: params.description,
        location: params.location,
        reminder_minutes: params.reminder_minutes || 15
      });
      
    case 'read_events':
      return readEvents({
        userId,
        query: params.query,
        startDate: params.start_date,
        endDate: params.end_date
      });
      
    case 'update_event':
      return updateEvent({
        userId,
        eventId: params.event_id,
        title: params.title,
        datetime: params.datetime,
        description: params.description
      });
      
    case 'delete_event':
      return deleteEvent({
        userId,
        eventId: params.event_id
      });
      
    case 'create_task':
      return createTask({
        userId,
        title: params.title,
        description: params.description,
        priority: params.priority,
        dueDate: params.due_date
      });
      
    case 'complete_task':
      return completeTask({
        userId,
        taskId: params.task_id
      });
      
    case 'list_tasks':
      return listTasks({
        userId,
        showCompleted: params.show_completed
      });

    case 'update_task':
      return updateTask({
        userId,
        taskId: params.task_id,
        title: params.title,
        description: params.description,
        priority: params.priority,
        dueDate: params.due_date
      });
      
    case 'create_alarm':
      return createAlarm({
        userId,
        title: params.title,
        triggerAt: params.trigger_at,
        message: params.message,
        callUser: params.call_user
      });
      
    default:
      console.warn('Unknown action type:', actionType);
      return { success: false, error: 'Unknown action' };
  }
}

// Re-export all tools
export {
  // Events
  createEvent,
  readEvents,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  // Tasks
  createTask,
  listTasks,
  completeTask,
  updateTask,
  deleteTask,
  // Alarms
  createAlarm,
  getPendingAlarms,
  getActiveAlarms,
  markAlarmTriggered,
  deleteAlarm,
  // Users
  findUserByGithubId,
  findUserById,
  createUser,
  updateUserToken,
  // Chat
  saveChatMessage,
  getChatHistory,
  clearChatHistory
};
