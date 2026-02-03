/**
 * SWUNGv2 - Voice Scheduling Assistant
 * Powered by GitHub Copilot API (GPT-4o)
 */

import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import session from 'express-session';
import FileStoreFactory from 'session-file-store';

const FileStore = FileStoreFactory(session);

// Initialize database
import './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';
import pageRoutes from './routes/pages.js';
import notificationRoutes from './routes/notifications.js';
import { sendPushNotification } from './tools/notifications.js';

// Import scheduler
import { getPendingAlarms, markAlarmTriggered } from './tools/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// ===========================================
// Middleware
// ===========================================

// CORS for mobile app
app.use((req, res, next) => {
  // Allow Capacitor app (null origin) and localhost for development
  const origin = req.headers.origin;
  const allowedOrigins = ['http://localhost:3000', 'https://swung.onrender.com', 'capacitor://localhost', 'http://localhost'];
  
  if (!origin || allowedOrigins.includes(origin) || origin === 'null') {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  }
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Session configuration
app.use(session({
  store: new FileStore({
    path: join(__dirname, 'sessions'),
    ttl: 30 * 24 * 60 * 60, // 30 days
    logFn: function(){}, // Suppress logging
  }),
  secret: process.env.SESSION_SECRET || 'swungv2_secret_key_123',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));



// Auto-login middleware - restores session from saved tokens
import { hasValidTokens, loadTokens } from './lib/oauth.js';

app.use(async (req, res, next) => {
  // If already logged in, continue
  if (req.session.userId) {
    return next();
  }
  
  // Check for saved tokens and auto-login if valid
  if (hasValidTokens()) {
    const tokens = loadTokens();
    if (tokens) {
      // Create session for auto-login
      req.session.userId = tokens.githubUserId || 1; // Default user ID
      req.session.user = {
        id: tokens.githubUserId || 1,
        name: tokens.githubUsername || 'GitHub User',
        github_id: tokens.githubUserId,
        avatar: tokens.githubAvatar || null
      };
      req.session.authenticated = true;
      console.log('✓ Auto-login from saved tokens');
    }
  }
  
  next();
});

// Make user available to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});


// Parse JSON
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Auth middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    if (req.xhr || req.path.startsWith('/api')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.redirect('/login');
  }
  next();
};

// ===========================================
// Routes
// ===========================================

// Auth routes (public)
app.use('/', authRoutes);

// Protected API routes
app.use('/api', requireAuth, apiRoutes);
app.use('/api/notifications', requireAuth, notificationRoutes);

// Protected Page routes
app.use('/', requireAuth, pageRoutes);

// ===========================================
// Socket.IO
// ===========================================

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Test notification endpoint - triggers an immediate Socket.IO notification
app.get('/api/test-notification', (req, res) => {
  console.log('🧪 TEST: Sending test notification via Socket.IO');
  
  io.emit('alarm', {
    id: 9999,
    title: 'Test Notification',
    message: 'This is a test notification from SWUNG!'
  });
  
  res.json({ 
    success: true,
    message: 'Test notification sent! Check your browser.',
    timestamp: new Date().toISOString()
  });
});

// ===========================================
// Alarm Scheduler
// ===========================================



function checkAlarms() {
  const pendingAlarms = getPendingAlarms();
  const now = new Date();
  
  console.log(`⏰ Alarm check at ${now.toISOString()} - Found ${pendingAlarms.length} pending alarm(s)`);
  
  for (const alarm of pendingAlarms) {
    console.log(`🔔 Alarm triggered: ${alarm.title} (trigger_at: ${alarm.trigger_at})`);
    
    // Emit to all connected clients
    io.emit('alarm', {
      id: alarm.id,
      title: alarm.title,
      message: alarm.message,
      callUser: alarm.call_user === 1
    });
    
    // Send Push Notification
    sendPushNotification(alarm.user_id, alarm.title, alarm.message || 'Time for your event!');

    // Mark as triggered
    markAlarmTriggered(alarm.id);
  }
}

// Check alarms every 30 seconds (more responsive for near-future events)
setInterval(checkAlarms, 30000);

// Run immediate check on startup
checkAlarms();

// ===========================================
// Error Handling
// ===========================================

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 - Not Found',
    message: 'Page not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).render('error', {
    title: '500 - Server Error',
    message: 'Something went wrong'
  });
});

// ===========================================
// Start Server
// ===========================================

server.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 SWUNGv2 - AI Voice Scheduling Assistant');
  console.log('   Powered by GitHub Copilot (GPT-4o)');
  console.log('='.repeat(50));
  console.log(`📡 Server running at http://localhost:${PORT}`);
  console.log(`📅 Calendar view at http://localhost:${PORT}/calendar`);
  console.log('='.repeat(50) + '\n');
});
