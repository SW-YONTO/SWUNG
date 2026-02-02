/**
 * Auth Routes - GitHub OAuth handling
 */

import express from 'express';
import { performFullOAuth, refreshCopilotToken, loadTokens, hasValidTokens } from '../lib/oauth.js';
import { findUserByGithubId, createUser, updateUserToken, findUserById } from '../tools/index.js';

const router = express.Router();

// Pending auth state
let pendingAuth = null;

/**
 * GET /login
 * Render login page
 */
router.get('/login', (req, res) => {
  if (req.session.userId && hasValidTokens()) {
    return res.redirect('/');
  }
  res.render('login', { title: 'Login - SWUNG' });
});

/**
 * GET /auth/github/start
 * Start GitHub OAuth device flow
 */
router.get('/auth/github/start', async (req, res) => {
  try {
    // Start OAuth flow
    const authPromise = performFullOAuth((codeInfo) => {
      pendingAuth = {
        ...codeInfo,
        status: 'waiting',
        startedAt: Date.now(),
      };
      console.log(`\n🔐 Authorization Required!`);
      console.log(`   1. Go to: ${codeInfo.verificationUri}`);
      console.log(`   2. Enter code: ${codeInfo.userCode}\n`);
    });
    
    // Handle completion in background
    authPromise.then(async (tokens) => {
      pendingAuth = { status: 'complete' };
      console.log('✓ GitHub OAuth complete!');
      
      // Create or update user
      // Note: We don't have user info from this flow, so we'll get it later
    }).catch((error) => {
      pendingAuth = { status: 'error', error: error.message };
      console.error('Auth failed:', error.message);
    });
    
    // Wait for device code to be generated
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (pendingAuth) {
      res.json({
        success: true,
        ...pendingAuth,
      });
    } else {
      res.status(500).json({ success: false, error: 'Failed to start auth' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /auth/github/status
 * Check OAuth flow status
 */
router.get('/auth/github/status', async (req, res) => {
  if (!pendingAuth) {
    res.json({ status: 'none' });
    return;
  }
  
  // If complete, try to set up session
  if (pendingAuth.status === 'complete' && !req.session.userId) {
    const tokens = loadTokens();
    if (tokens && tokens.githubAccessToken) {
      // Get GitHub user info
      try {
        const userResponse = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${tokens.githubAccessToken}`,
            'Accept': 'application/json',
            'User-Agent': 'SWUNGv2/1.0'
          }
        });
        
        if (userResponse.ok) {
          const githubUser = await userResponse.json();
          
          // Find or create user
          let user = findUserByGithubId(githubUser.id.toString());
          
          if (!user) {
            const userId = createUser({
              githubId: githubUser.id.toString(),
              username: githubUser.login,
              email: githubUser.email,
              name: githubUser.name || githubUser.login,
              avatarUrl: githubUser.avatar_url,
              accessToken: tokens.githubAccessToken
            });
            user = findUserById(userId);
          } else {
            updateUserToken(user.id, tokens.githubAccessToken);
          }
          
          if (user) {
            req.session.userId = user.id;
            req.session.user = {
              id: user.id,
              name: user.name,
              username: user.username,
              avatar: user.avatar_url
            };
            
            // Save user info to tokens file for auto-login on server restart
            const { saveTokens } = await import('../lib/oauth.js');
            saveTokens({
              ...tokens,
              githubUserId: user.id,
              githubUsername: user.username || user.name,
              githubAvatar: user.avatar_url
            });
          }
        }
      } catch (error) {
        console.error('Failed to get GitHub user info:', error);
      }
    }
  }

  
  res.json(pendingAuth);
});

/**
 * POST /auth/github/refresh
 * Refresh Copilot token
 */
router.post('/auth/github/refresh', async (req, res) => {
  try {
    const tokens = await refreshCopilotToken();
    res.json({ success: true, expiresAt: tokens.copilotExpiresAt });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /logout
 * Destroy session
 */
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

export default router;
