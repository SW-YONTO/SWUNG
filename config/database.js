/**
 * SWUNGv2 Database Configuration
 * SQLite database with sql.js
 */

import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbDir = join(__dirname, '..', 'db');
const dbPath = join(dbDir, 'swungv2.db');

// Ensure db directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = null;
let SQL = null;

/**
 * Initialize the database
 */
async function initDatabase() {
  if (db) return db;
  
  SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
    console.log('✅ Database loaded from file');
  } else {
    db = new SQL.Database();
    console.log('✅ New database created');
  }
  
  // Initialize tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      github_id TEXT UNIQUE,
      username TEXT,
      email TEXT,
      name TEXT,
      avatar_url TEXT,
      access_token TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      datetime TEXT NOT NULL,
      end_datetime TEXT,
      location TEXT,
      category TEXT DEFAULT 'general',
      color TEXT DEFAULT '#3b82f6',
      is_all_day INTEGER DEFAULT 0,
      recurrence TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS alarms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      event_id INTEGER,
      title TEXT NOT NULL,
      message TEXT,
      trigger_at TEXT NOT NULL,
      repeat_type TEXT DEFAULT 'once',
      is_triggered INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      call_user INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'medium',
      due_date TEXT,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      category TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      action_type TEXT,
      action_data TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      alarm_id INTEGER,
      status TEXT DEFAULT 'pending',
      scheduled_at TEXT NOT NULL,
      completed_at TEXT,
      notes TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (alarm_id) REFERENCES alarms(id) ON DELETE SET NULL
    )
  `);

  // Create indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_events_datetime ON events(datetime)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_alarms_trigger_at ON alarms(trigger_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id)`);

  db.run(`
    CREATE TABLE IF NOT EXISTS fcm_tokens (
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      platform TEXT DEFAULT 'web',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, token),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  
  db.run(`CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id)`);
  
  saveDatabase();
  console.log('✅ Database initialized with all tables');
  
  return db;
}

/**
 * Save database to file
 */
function saveDatabase() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (error) {
    console.error('❌ Failed to save database:', error);
  }
}

/**
 * Database interface (mimics better-sqlite3 API)
 */
const dbInterface = {
  prepare(sql) {
    return {
      run(...params) {
        const stmt = db.prepare(sql);
        stmt.run(params);
        saveDatabase();
        
        const result = db.exec('SELECT last_insert_rowid() as id');
        const lastId = result[0]?.values[0]?.[0] || 0;
        stmt.free();
        
        return {
          lastInsertRowid: lastId,
          changes: db.getRowsModified ? db.getRowsModified() : 1
        };
      },
      get(...params) {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
      }
    };
  },
  
  exec(sql) {
    db.run(sql);
    saveDatabase();
  },
  
  pragma(sql) {
    db.run(`PRAGMA ${sql}`);
  }
};

// Initialize and export
await initDatabase();

export default dbInterface;
