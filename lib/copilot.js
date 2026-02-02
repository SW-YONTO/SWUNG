/**
 * GitHub Copilot API Client
 * 
 * Handles communication with GitHub Copilot's proxy API
 * for chat completions using GPT-4o and other models.
 */

/**
 * Parse the Copilot token to extract configuration values
 */
export function parseToken(token) {
  if (!token) return null;
  
  const config = {};
  const parts = token.split(';');
  
  for (const part of parts) {
    const [key, ...valueParts] = part.split('=');
    if (key && valueParts.length > 0) {
      config[key.trim()] = valueParts.join('=').trim();
    }
  }
  
  return {
    tid: config.tid,
    exp: parseInt(config.exp, 10),
    sku: config.sku,
    proxyEndpoint: config['proxy-ep'] || 'proxy.individual.githubcopilot.com',
    capabilities: {
      chat: config.chat === '1',
      agentMode: config.agent_mode === '1',
      mcp: config.mcp === '1',
      realtime: config.rt === '1',
    },
    raw: token
  };
}

/**
 * Check if the token is expired
 */
export function isTokenExpired(parsedToken) {
  if (!parsedToken || !parsedToken.exp) return true;
  return Date.now() / 1000 > parsedToken.exp;
}

/**
 * Get expiration date as human readable string
 */
export function getExpirationDate(parsedToken) {
  if (!parsedToken || !parsedToken.exp) return 'Unknown';
  return new Date(parsedToken.exp * 1000).toLocaleString();
}

/**
 * Available models - GPT-4o is free and fastest
 */
export const AVAILABLE_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', tier: 'free' },
  { id: 'gpt-4o-mini', name: 'GPT-4o mini', tier: 'free' },
  { id: 'gpt-4.1', name: 'GPT-4.1', tier: 'free' },
];

/**
 * Fetch available models from Copilot API
 */
export async function fetchAvailableModels(copilotToken, proxyUrl) {
  try {
    const response = await fetch('https://api.githubcopilot.com/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${copilotToken}`,
        'Editor-Version': 'vscode/1.85.0',
        'Editor-Plugin-Version': 'copilot-chat/0.12.0',
        'User-Agent': 'GithubCopilot/1.0',
      },
    });
    
    if (!response.ok) {
      console.log('Models endpoint returned:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.data || data.models || data;
  } catch (error) {
    console.error('Failed to fetch models:', error.message);
    return null;
  }
}

/**
 * Create Copilot API client
 */
export function createCopilotClient(options) {
  const { copilotToken, ghuToken } = options;
  
  const parsedToken = parseToken(copilotToken);
  if (!parsedToken) {
    throw new Error('Invalid Copilot token');
  }
  
  const proxyUrl = `https://${parsedToken.proxyEndpoint}`;
  
  /**
   * Send a chat completion request
   */
  async function chatCompletion(params) {
    const {
      model = 'gpt-4o',
      messages,
      temperature = 0.7,
      max_tokens = 4096,
      stream = false,
      top_p = 1,
      tools = null,
      tool_choice = null,
    } = params;
    
    const endpoint = 'https://api.githubcopilot.com/chat/completions';
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${copilotToken}`,
      'Editor-Version': 'vscode/1.85.0',
      'Editor-Plugin-Version': 'copilot-chat/0.12.0',
      'Openai-Organization': 'github-copilot',
      'Copilot-Integration-Id': 'vscode-chat',
      'X-Request-Id': crypto.randomUUID(),
      'User-Agent': 'GithubCopilot/1.0',
    };
    
    const body = {
      model,
      messages,
      temperature,
      max_tokens,
      stream: true, // Copilot API only supports streaming
      top_p,
      n: 1,
    };
    
    // Add tools if provided
    if (tools && tools.length > 0) {
      body.tools = tools;
      if (tool_choice) {
        body.tool_choice = tool_choice;
      }
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Copilot API error: ${response.status} - ${errorText}`);
    }
    
    if (stream) {
      return response;
    }
    
    // Collect all chunks for non-streaming
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let lastChunk = null;
    let toolCalls = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            lastChunk = parsed;
            if (parsed.choices?.[0]?.delta?.content) {
              fullContent += parsed.choices[0].delta.content;
            }
            // Handle tool calls
            if (parsed.choices?.[0]?.delta?.tool_calls) {
              for (const tc of parsed.choices[0].delta.tool_calls) {
                if (!toolCalls[tc.index]) {
                  toolCalls[tc.index] = { id: tc.id, type: tc.type, function: { name: '', arguments: '' } };
                }
                if (tc.function?.name) {
                  toolCalls[tc.index].function.name += tc.function.name;
                }
                if (tc.function?.arguments) {
                  toolCalls[tc.index].function.arguments += tc.function.arguments;
                }
              }
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
    
    const result = {
      id: lastChunk?.id || `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: fullContent,
        },
        finish_reason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
      }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
    
    if (toolCalls.length > 0) {
      result.choices[0].message.tool_calls = toolCalls.filter(Boolean);
    }
    
    return result;
  }
  
  /**
   * Stream chat completion (returns async iterator)
   */
  async function* streamChatCompletion(params) {
    const response = await chatCompletion({ ...params, stream: true });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            return;
          }
          try {
            yield JSON.parse(data);
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }
  
  return {
    chatCompletion,
    streamChatCompletion,
    parsedToken,
    isExpired: () => isTokenExpired(parsedToken),
    getExpirationDate: () => getExpirationDate(parsedToken),
    proxyUrl,
  };
}

export default { createCopilotClient, parseToken, isTokenExpired, AVAILABLE_MODELS };
