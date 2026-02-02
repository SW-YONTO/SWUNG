/**
 * Page Routes - Render views
 */

import express from 'express';
import { getAllEvents } from '../tools/index.js';

const router = express.Router();

/**
 * GET /
 * Main chat view
 */
router.get('/', (req, res) => {
  const todayEvents = getAllEvents(req.session.userId).filter(e => {
    const eventDate = new Date(e.datetime).toDateString();
    return eventDate === new Date().toDateString();
  });
  
  res.render('index', { 
    title: 'SWUNG - Voice Scheduler',
    todayEvents
  });
});

/**
 * GET /calendar
 * Calendar view
 */
router.get('/calendar', (req, res) => {
  const events = getAllEvents(req.session.userId);
  const view = req.query.view || 'month';
  
  res.render('calendar', { 
    title: 'Calendar - SWUNG',
    events,
    view
  });
});

/**
 * GET /todos
 * Todo/Tasks view
 */
router.get('/todos', async (req, res) => {
  const { listTasks } = await import('../tools/tasks.js');
  const tasks = listTasks({ userId: req.session.userId, showCompleted: true });
  
  res.render('todos', { 
    title: 'Todos - SWUNG',
    tasks: tasks.tasks || []
  });
});

/**
 * GET /settings
 * User settings view
 */
router.get('/settings', (req, res) => {
  res.render('settings', { 
    title: 'Settings - SWUNG',
    user: req.session.user
  });
});

export default router;

