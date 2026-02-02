/**
 * GitHub OAuth Device Flow Authentication
 * 
 * Handles GitHub OAuth device flow to get GitHub Copilot tokens automatically.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// GitHub Copilot OAuth App Client ID (from VS Code Copilot extension)
const GITHUB_CLIENT_ID = 'Iv1.b507a08c87ecfe98';

// Token storage file
const TOKEN_FILE = join(__dirname, '..', '.copilot-token.json');

/**
 * Start the OAuth device flow
 */
export async function startDeviceFlow() {
  const response = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      scope: 'read:user',
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to start device flow: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * Poll for the access token
 */
export async function pollForToken(deviceCode, interval = 5) {
  while (true) {
    await new Promise(resolve => setTimeout(resolve, interval * 1000));
    
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });
    
    const data = await response.json();
    
    if (data.access_token) {
      return data;
    }
    
    if (data.error === 'authorization_pending') {
      continue;
    }
    
    if (data.error === 'slow_down') {
      interval += 5;
      continue;
    }
    
    if (data.error === 'expired_token') {
      throw new Error('Device code expired. Please try again.');
    }
    
    if (data.error === 'access_denied') {
      throw new Error('User denied authorization.');
    }
    
    if (data.error) {
      throw new Error(`OAuth error: ${data.error} - ${data.error_description}`);
    }
  }
}

/**
 * Exchange GitHub access token for Copilot token
 */
export async function getCopilotToken(accessToken) {
  const response = await fetch('https://api.github.com/copilot_internal/v2/token', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'User-Agent': 'SWUNGv2/1.0',
      'Editor-Version': 'vscode/1.85.0',
      'Editor-Plugin-Version': 'copilot-chat/0.12.0',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get Copilot token: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  return {
    token: data.token,
    expiresAt: data.expires_at,
    refreshIn: data.refresh_in,
  };
}

/**
 * Save tokens to file
 */
export function saveTokens(tokens) {
  writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

/**
 * Load tokens from file
 */
export function loadTokens() {
  try {
    if (existsSync(TOKEN_FILE)) {
      return JSON.parse(readFileSync(TOKEN_FILE, 'utf-8'));
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Check if saved tokens are still valid
 */
export function hasValidTokens() {
  const tokens = loadTokens();
  if (!tokens || !tokens.copilotToken || !tokens.copilotExpiresAt) {
    return false;
  }
  // Add 5 minute buffer
  return Date.now() < tokens.copilotExpiresAt - 5 * 60 * 1000;
}

/**
 * Parse the Copilot token to extract configuration
 */
export function parseCopilotToken(token) {
  const config = {};
  const parts = token.split(';');
  
  for (const part of parts) {
    const [key, ...valueParts] = part.split('=');
    if (key && valueParts.length > 0) {
      config[key.trim()] = valueParts.join('=').trim();
    }
  }
  
  return {
    proxyEndpoint: config['proxy-ep'] || 'proxy.individual.githubcopilot.com',
    expiresAt: parseInt(config.exp, 10) * 1000,
    capabilities: {
      chat: config.chat === '1',
      agentMode: config.agent_mode === '1',
    },
  };
}

/**
 * Full OAuth flow - start to finish
 */
export async function performFullOAuth(onUserCode) {
  console.log('Starting GitHub OAuth device flow...');
  const deviceResponse = await startDeviceFlow();
  
  if (onUserCode) {
    onUserCode({
      userCode: deviceResponse.user_code,
      verificationUri: deviceResponse.verification_uri,
      expiresIn: deviceResponse.expires_in,
    });
  }
  
  console.log('Waiting for user authorization...');
  const tokenResponse = await pollForToken(deviceResponse.device_code, deviceResponse.interval);
  
  console.log('Authorization successful! Getting Copilot token...');
  const copilotData = await getCopilotToken(tokenResponse.access_token);
  
  const parsed = parseCopilotToken(copilotData.token);
  
  const tokens = {
    githubAccessToken: tokenResponse.access_token,
    copilotToken: copilotData.token,
    copilotExpiresAt: parsed.expiresAt,
    proxyEndpoint: parsed.proxyEndpoint,
    updatedAt: Date.now(),
  };
  
  saveTokens(tokens);
  console.log('✓ Tokens saved successfully!');
  
  return tokens;
}

/**
 * Refresh Copilot token using saved GitHub access token
 */
export async function refreshCopilotToken() {
  const saved = loadTokens();
  if (!saved || !saved.githubAccessToken) {
    throw new Error('No saved tokens. Please run OAuth flow first.');
  }
  
  console.log('Refreshing Copilot token...');
  const copilotData = await getCopilotToken(saved.githubAccessToken);
  const parsed = parseCopilotToken(copilotData.token);
  
  const tokens = {
    ...saved,
    copilotToken: copilotData.token,
    copilotExpiresAt: parsed.expiresAt,
    proxyEndpoint: parsed.proxyEndpoint,
    updatedAt: Date.now(),
  };
  
  saveTokens(tokens);
  console.log('✓ Token refreshed successfully!');
  
  return tokens;
}

export default {
  startDeviceFlow,
  pollForToken,
  getCopilotToken,
  performFullOAuth,
  refreshCopilotToken,
  loadTokens,
  saveTokens,
  hasValidTokens,
};
