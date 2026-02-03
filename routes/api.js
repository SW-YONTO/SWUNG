/**
 * API Routes - Main processing endpoints
 */

import express from 'express';
import { processWithAI } from '../lib/ai.js';
import { 
  executeAction, 
  getAllEvents, 
  getEventById, 
  deleteEvent,
  listTasks,
  getChatHistory, 
  saveChatMessage,
  clearChatHistory
} from '../tools/index.js';

const router = express.Router();

/**
 * GET /api/history
 * Get chat history for current user
 */
router.get('/history', (req, res) => {
  try {
    const history = getChatHistory(req.session.userId);
    res.json({ success: true, history });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ success: false, error: 'Failed to load history' });
  }
});

/**
 * POST /api/process
 * Main voice/text processing endpoint
 */
router.post('/process', async (req, res) => {
  const { text, images } = req.body;
  const userId = req.session.userId;
  
  if ((!text || text.trim() === '') && (!images || images.length === 0)) {
    return res.status(400).json({ success: false, error: 'No text or images provided' });
  }
  
  try {
    // Save user message
    saveChatMessage(userId, 'user', text);
    
    // Get recent events for context
    let recentEvents = [];
    try {
      recentEvents = getAllEvents(userId);
      const now = new Date();
      recentEvents = recentEvents
        .filter(e => new Date(e.datetime) > new Date(now.getTime() - 24 * 60 * 60 * 1000))
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
        .slice(0, 20);
    } catch (err) {
      console.warn('Failed to fetch context events:', err);
      console.warn('Failed to fetch context events:', err);
    }

    // Get active tasks for context
    let activeTasks = [];
    try {
      if (userId) {
        const taskResult = listTasks({ userId, showCompleted: false });
        if (taskResult && taskResult.success && Array.isArray(taskResult.tasks)) {
          activeTasks = taskResult.tasks;
        }
      }
    } catch (err) {
      console.error('Failed to fetch context tasks (safely caught):', err.message);
    }
    
    console.log(`🔍 [API] User: ${userId}, Active Tasks: ${activeTasks.length}`);
    
    // Process with AI
    const aiResult = await processWithAI(text, { recentEvents, tasks: activeTasks });
    
    if (!aiResult.success) {
      saveChatMessage(userId, 'assistant', aiResult.message);
      return res.json({
        success: false,
        message: aiResult.message,
        error: aiResult.error
      });
    }
    
    // Execute action if present
    let actionResult = null;
    
    if (aiResult.action) {
      actionResult = executeAction(aiResult.action.type, aiResult.action, userId);
      
      // Generate response message based on action
      let responseMessage = aiResult.message;
      if (actionResult && actionResult.message) {
        responseMessage = actionResult.message;
      }
      
      // Save AI response with action data
      saveChatMessage(userId, 'assistant', responseMessage, {
        type: aiResult.action.type,
        data: aiResult.action,
        result: actionResult
      });
      
      return res.json({
        success: true,
        message: responseMessage,
        action: aiResult.action,
        actionResult: actionResult
      });
    }
    
    // Regular response (no action)
    saveChatMessage(userId, 'assistant', aiResult.message);
    
    return res.json({
      success: true,
      message: aiResult.message,
      action: null,
      actionResult: null
    });
    
  } catch (error) {
    console.error('Processing error:', error);
    const errorMessage = "Sorry, I encountered an error processing your request.";
    saveChatMessage(userId, 'assistant', errorMessage);
    return res.status(500).json({ success: false, message: errorMessage });
  }
});

/**
 * GET /api/events
 * Get all events for current user
 */
router.get('/events', (req, res) => {
  try {
    const events = getAllEvents(req.session.userId);
    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch events' });
  }
});

/**
 * GET /api/events/:id
 * Get a specific event
 */
router.get('/events/:id', (req, res) => {
  try {
    const event = getEventById(parseInt(req.params.id));
    if (!event || event.user_id !== req.session.userId) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

/**
 * DELETE /api/events/:id
 * Delete an event
 */
router.delete('/events/:id', (req, res) => {
  try {
    const result = deleteEvent({ 
      userId: req.session.userId, 
      eventId: parseInt(req.params.id) 
    });
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

/**
 * DELETE /api/alarms/:id
 * Delete an alarm
 */
router.delete('/alarms/:id', async (req, res) => {
  try {
    const { deleteAlarm } = await import('../tools/alarms.js');
    const result = deleteAlarm({ 
      userId: req.session.userId, 
      alarmId: parseInt(req.params.id) 
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete alarm' });
  }
});


/**
 * DELETE /api/tasks/:id
 * Delete a task
 */
router.delete('/tasks/:id', async (req, res) => {
  try {
    const { deleteTask } = await import('../tools/tasks.js');
    const result = deleteTask({ 
      userId: req.session.userId, 
      taskId: parseInt(req.params.id) 
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
});

/**
 * PATCH /api/tasks/:id/complete
 * Mark task as complete
 */
router.patch('/tasks/:id/complete', async (req, res) => {
  try {
    const { completeTask } = await import('../tools/tasks.js');
    const result = completeTask({ 
      userId: req.session.userId, 
      taskId: parseInt(req.params.id) 
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to complete task' });
  }
});

/**
 * GET /api/status
 * Get server/auth status
 */
router.get('/status', (req, res) => {
  const user = req.session.user;
  res.json({
    success: true,
    authenticated: !!user,
    user: user || null
  });
});

/**
 * GET /api/debug/firebase
 * Check if Firebase is initialized correctly
 */
router.get('/debug/firebase', async (req, res) => {
  try {
    const hasEnvVar = !!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    
    // Try to import and check Firebase status
    let firebaseStatus = 'unknown';
    try {
      const admin = await import('firebase-admin');
      const apps = admin.default.apps;
      firebaseStatus = apps && apps.length > 0 ? 'initialized' : 'not_initialized';
    } catch (e) {
      firebaseStatus = 'error: ' + e.message;
    }
    
    res.json({
      success: true,
      hasEnvVar: hasEnvVar,
      envVarLength: hasEnvVar ? process.env.FIREBASE_SERVICE_ACCOUNT_BASE64.length : 0,
      firebaseStatus: firebaseStatus,
      message: hasEnvVar ? '✅ FIREBASE_SERVICE_ACCOUNT_BASE64 is set' : '❌ FIREBASE_SERVICE_ACCOUNT_BASE64 is NOT set'
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * POST /api/clear-chat
 * Clear chat history for current user
 */
router.post('/clear-chat', (req, res) => {
  try {
    const userId = req.session.userId;
    console.log('📋 [API] Clearing chat history for user:', userId);
    clearChatHistory(userId);
    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    console.error('Clear chat error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/export-data
 * Export user's events and tasks as JSON
 */
router.get('/export-data', (req, res) => {
  try {
    const userId = req.session.userId;
    const events = getAllEvents(userId);
    const taskResult = listTasks({ userId, showCompleted: true });
    const tasks = taskResult.success ? taskResult.tasks : [];
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      userId: userId,
      events: events,
      tasks: tasks
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=swung-export.json');
    res.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, error: 'Failed to export data' });
  }
});

/**
 * GET /api/preferences
 * Get user preferences (theme, etc.)
 */
router.get('/preferences', (req, res) => {
  try {
    const prefs = req.session.preferences || { theme: 'dark' };
    res.json({ success: true, preferences: prefs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get preferences' });
  }
});

/**
 * POST /api/preferences
 * Save user preferences (theme, etc.)
 */
router.post('/preferences', (req, res) => {
  try {
    const { theme, notifications, callReminders, voiceInput, language } = req.body;
    
    // Store in session (persists for this session)
    req.session.preferences = {
      theme: theme || 'dark',
      notifications: notifications !== false,
      callReminders: !!callReminders,
      voiceInput: voiceInput !== false,
      language: language || 'en-IN'
    };
    
    res.json({ success: true, preferences: req.session.preferences });
  } catch (error) {
    console.error('Save preferences error:', error);
    res.status(500).json({ success: false, error: 'Failed to save preferences' });
  }
});

export default router;


