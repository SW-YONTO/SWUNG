
import { listTasks } from './tools/index.js';
import './config/database.js'; // initialize DB

console.log("Starting test...");
try {
  // Mock userId - find a user first or assume 1
  const userId = 1; 
  console.log(`Testing listTasks for user ${userId}...`);
  const result = listTasks({ userId, showCompleted: false });
  console.log("Result success:", result.success);
  console.log("Tasks found:", result.tasks ? result.tasks.length : 'null');
} catch (err) {
  console.error("CRASHED:", err);
}
console.log("Done.");
