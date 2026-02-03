/**
 * AI Integration Layer for SWUNGv2
 * Uses GitHub Copilot API (GPT-4o) with tool calling
 */

import { createCopilotClient } from './copilot.js';
import { loadTokens, refreshCopilotToken, hasValidTokens } from './oauth.js';

// System prompt for SWUNG assistant
const SYSTEM_PROMPT = `You are SWUNG, a helpful voice scheduling assistant. You help users manage their events, to-dos, reminders, and alarms.

Current date/time: {{CURRENT_DATETIME}}
Timezone: India Standard Time (IST, UTC+5:30)

TERMINOLOGY RULES:
- "Events": Scheduled items with a specific date/time (e.g., "Meeting tomorrow", "Exam on Monday"). They go on the Calendar.
- "To-Dos": Checklist items things to be done (e.g., "Buy milk", "Clean room", "Make video"). They go on the Todo list. NEVER call them "tasks".
- "Alarms": Timed reminders.

When users say "Add to todo" or "I need to do X", create a TO-DO.
When users say "Schedule X" or "X at 5pm", create an EVENT.

Always confirm actions back to the user in a natural, conversational way.

CRITICAL DATE/TIME RULES:
- The current datetime provided above is in IST (India Standard Time, UTC+5:30).
- Events should be scheduled in the FUTURE. However, "future" means ANY time after the current moment - even 1 minute from now is valid.
- If the user says "in 5 minutes", "in 10 minutes", or any relative time, CALCULATE the exact datetime by adding to the current time.
- "Today" means the current date. "Tomorrow" means current date + 1 day.
- If no date is specified, use TOMORROW as the default (the next day from today).
- If no specific time is given, use reasonable defaults (9 AM for morning, 2 PM for afternoon, 7 PM for evening, 10 AM as general default).
- Always use ISO 8601 format for datetime: YYYY-MM-DDTHH:mm:ss (e.g., 2026-02-03T14:30:00).
- All datetimes you generate should be in IST (no timezone suffix needed, server handles it).

Be concise and friendly in your responses.`;

// Tool definitions for function calling
const TOOLS = [
  {
    type: "function",
    function: {
      name: "create_event",
      description: "Create a new calendar event",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Event title" },
          datetime: { type: "string", description: "Event date/time in ISO 8601 format (YYYY-MM-DDTHH:mm:ss)" },
          description: { type: "string", description: "Optional event description" },
          location: { type: "string", description: "Optional location" },
          reminder_minutes: { type: "number", description: "Reminder before event in minutes (default: 15)" }
        },
        required: ["title", "datetime"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_events",
      description: "List events for a specific date range or query",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Query like 'today', 'tomorrow', 'this week', or a specific date" },
          start_date: { type: "string", description: "Start date in ISO format" },
          end_date: { type: "string", description: "End date in ISO format" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_event",
      description: "Update an existing event",
      parameters: {
        type: "object",
        properties: {
          event_id: { type: "number", description: "ID of the event to update" },
          title: { type: "string", description: "New title (optional)" },
          datetime: { type: "string", description: "New datetime (optional)" },
          description: { type: "string", description: "New description (optional)" }
        },
        required: ["event_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_event",
      description: "Delete an event",
      parameters: {
        type: "object",
        properties: {
          event_id: { type: "number", description: "ID of the event to delete" }
        },
        required: ["event_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_todo",
      description: "Create a new to-do checklist item (NOT an event)",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "To-do title" },
          description: { type: "string", description: "To-do description" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Priority" },
          due_date: { type: "string", description: "Due date in ISO format (optional)" }
        },
        required: ["title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "complete_todo",
      description: "Mark a to-do as complete",
      parameters: {
        type: "object",
        properties: {
          todo_id: { type: "number", description: "ID of the to-do to complete" }
        },
        required: ["todo_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_todos",
      description: "List to-do items",
      parameters: {
        type: "object",
        properties: {
          show_completed: { type: "boolean", description: "Whether to include completed to-dos" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_todo",
      description: "Update an existing to-do",
      parameters: {
        type: "object",
        properties: {
          todo_id: { type: "number", description: "ID of the to-do to update" },
          title: { type: "string", description: "New title" },
          description: { type: "string", description: "New description" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "New priority" },
          due_date: { type: "string", description: "New due date" }
        },
        required: ["todo_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_alarm",
      description: "Create a reminder alarm",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Alarm title/reason" },
          trigger_at: { type: "string", description: "When to trigger the alarm (ISO 8601 format)" },
          message: { type: "string", description: "Optional message to show" },
          call_user: { type: "boolean", description: "Whether to call the user (default: false)" }
        },
        required: ["title", "trigger_at"]
      }
    }
  }
];

let copilotClient = null;

/**
 * Initialize or get Copilot client
 */
export async function getCopilotClient() {
  if (copilotClient && !copilotClient.isExpired()) {
    return copilotClient;
  }
  
  const tokens = loadTokens();
  
  if (!tokens || !tokens.copilotToken) {
    return null;
  }
  
  // Check if expired and refresh
  if (tokens.copilotExpiresAt && Date.now() > tokens.copilotExpiresAt - 60000) {
    try {
      const newTokens = await refreshCopilotToken();
      copilotClient = createCopilotClient({
        copilotToken: newTokens.copilotToken,
        ghuToken: newTokens.githubAccessToken,
      });
    } catch (error) {
      console.error('Failed to refresh token:', error.message);
      return null;
    }
  } else {
    copilotClient = createCopilotClient({
      copilotToken: tokens.copilotToken,
      ghuToken: tokens.githubAccessToken,
    });
  }
  
  return copilotClient;
}

/**
 * Process user input with AI
 */
export async function processWithAI(userMessage, context = {}) {
  const client = await getCopilotClient();
  
  if (!client) {
    return {
      success: false,
      error: 'not_authenticated',
      message: 'Please login with GitHub first.'
    };
  }
  
  // Build system prompt with current time in IST
  const now = new Date();
  const istDateTime = now.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'long'
  });
  const systemPrompt = SYSTEM_PROMPT.replace('{{CURRENT_DATETIME}}', istDateTime);
  
  // Build messages array
  const messages = [
    { role: 'system', content: systemPrompt }
  ];
  
  // Add context about recent events if available
  if (context.recentEvents && context.recentEvents.length > 0) {
    const eventsContext = `Current upcoming events:\n${context.recentEvents.map(e => 
      `- ID:${e.id} "${e.title}" at ${e.datetime}`
    ).join('\n')}`;
    messages.push({ role: 'system', content: eventsContext });
  }

  // Add context about recent tasks if available
  if (context.tasks && context.tasks.length > 0) {
    const tasksContext = `Current active tasks:\n${context.tasks.map(t => 
      `- ID:${t.id} "${t.title}" (Priority: ${t.priority || 'medium'})`
    ).join('\n')}`;
    messages.push({ role: 'system', content: tasksContext });
  }
  
  // Add user message
  messages.push({ role: 'user', content: userMessage });
  
  try {
    const response = await client.chatCompletion({
      model: 'gpt-4o',
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1024,
    });
    
    const choice = response.choices[0];
    const message = choice.message;
    
    // Check for tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      const functionName = toolCall.function.name;
      let args = {};
      
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error('Failed to parse tool arguments:', e);
      }
      
      // Generate a descriptive message if AI didn't provide one
      let responseMessage = message.content;
      if (!responseMessage || responseMessage.trim() === '') {
        const title = args.title || args.query || '';
        switch (functionName) {
          case 'create_event':
            responseMessage = `Got it! I'll create an event "${title}" for you.`;
            break;
          case 'create_alarm':
            responseMessage = `Setting a reminder "${title}" for you.`;
            break;
          case 'create_todo':
            responseMessage = `Added "${title}" to your To-Do list.`;
            break;
          case 'read_events':
            responseMessage = `Let me check your schedule${title ? ` for ${title}` : ''}.`;
            break;
          case 'list_todos':
            responseMessage = `Here are your to-dos.`;
            break;
          case 'delete_event':
            responseMessage = `I'll delete that event for you.`;
            break;
          case 'update_todo':
            responseMessage = `Updated to-do "${title}" for you.`;
            break;
          default:
            responseMessage = `I'll ${functionName.replace(/_/g, ' ')} for you.`;
        }
      }
      
      return {
        success: true,
        action: {
          type: functionName,
          ...args
        },
        message: responseMessage,
        toolCallId: toolCall.id
      };
    }
    
    // Regular response (no tool call)
    return {
      success: true,
      action: null,
      message: message.content
    };
    
  } catch (error) {
    console.error('AI processing error:', error);
    return {
      success: false,
      error: 'ai_error',
      message: 'Sorry, I had trouble understanding that. Could you try again?'
    };
  }
}

/**
 * Check if authenticated
 */
export function isAuthenticated() {
  return hasValidTokens();
}

export { TOOLS };
