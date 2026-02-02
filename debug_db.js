
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'db', 'swungv2.db');

async function checkDb() {
  console.log('Checking DB at:', dbPath);
  if (!fs.existsSync(dbPath)) {
    console.error('DB file not found!');
    return;
  }
  
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);
  
  try {
    const tasks = db.prepare('SELECT * FROM tasks').step() 
      ? db.exec('SELECT * FROM tasks')[0] 
      : null;
      
    if (!tasks) {
        console.log('No tasks found in DB.');
    } else {
        console.log('Tasks found:', JSON.stringify(tasks, null, 2));
    }
    
    const users = db.exec('SELECT * FROM users')[0];
    console.log('Users found:', JSON.stringify(users, null, 2));
    
  } catch (e) {
    console.error('Error reading DB:', e);
  }
}

checkDb();
