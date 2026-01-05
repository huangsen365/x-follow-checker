// Background service worker for X Follow Checker

import {
  getAuthTokens,
  getUserByScreenName,
  fetchAllFollowing,
  XApiError,
  ErrorTypes
} from '../utils/api.js';
import * as storage from '../utils/storage.js';

// Track current check operation
let currentCheck = null;
let abortController = null;

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender)
    .then(sendResponse)
    .catch(error => {
      console.error('Message handler error:', error);
      sendResponse({
        success: false,
        error: {
          type: error.type || ErrorTypes.API_ERROR,
          message: error.message
        }
      });
    });
  return true; // Keep channel open for async response
});

async function handleMessage(request, sender) {
  switch (request.type) {
    case 'START_CHECK':
      return await startCheck(request.screenName);

    case 'STOP_CHECK':
      return stopCheck();

    case 'GET_STATUS':
      return getStatus();

    case 'GET_CACHED_RESULTS':
      return await getCachedResults();

    default:
      throw new Error(`Unknown message type: ${request.type}`);
  }
}

async function startCheck(screenName) {
  // Cancel any existing check
  if (abortController) {
    abortController.abort();
  }

  abortController = new AbortController();
  currentCheck = {
    status: 'running',
    progress: { loaded: 0, page: 0 },
    startTime: Date.now()
  };

  try {
    // Get auth tokens
    const tokens = await getAuthTokens();
    if (!tokens.csrfToken) {
      throw new XApiError(
        ErrorTypes.NOT_AUTHENTICATED,
        'Please log in to X.com first'
      );
    }

    // Get current user info
    sendProgress({ status: 'getting_user_info' });
    const currentUser = await getUserByScreenName(screenName, tokens.csrfToken);
    currentCheck.userId = currentUser.id;
    currentCheck.user = currentUser;

    // Fetch all following
    sendProgress({
      status: 'fetching_following',
      totalEstimate: currentUser.followingCount
    });

    const following = await fetchAllFollowing(
      currentUser.id,
      tokens.csrfToken,
      (progress) => {
        currentCheck.progress = progress;
        sendProgress({
          status: 'fetching_following',
          loaded: progress.loaded,
          page: progress.page,
          totalEstimate: currentUser.followingCount
        });
      },
      abortController.signal
    );

    // Separate results
    const mutual = following.filter(u => u.followedBy);
    const notFollowingBack = following.filter(u => !u.followedBy);

    const results = {
      user: currentUser,
      following: following,
      mutual: mutual,
      notFollowingBack: notFollowingBack,
      stats: {
        total: following.length,
        mutualCount: mutual.length,
        notFollowingBackCount: notFollowingBack.length
      }
    };

    // Cache results
    await storage.setCachedResults(results);
    await storage.setLastCheck(Date.now());
    await storage.clearCheckpoint();

    currentCheck = {
      status: 'completed',
      results: results
    };

    sendProgress({ status: 'completed', results: results });

    return {
      success: true,
      data: results
    };

  } catch (error) {
    currentCheck = {
      status: 'error',
      error: {
        type: error.type || ErrorTypes.API_ERROR,
        message: error.message,
        details: error.details
      }
    };

    if (error.message !== 'Check cancelled') {
      sendProgress({
        status: 'error',
        error: currentCheck.error
      });
    }

    return {
      success: false,
      error: currentCheck.error
    };

  } finally {
    abortController = null;
  }
}

function stopCheck() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }

  currentCheck = {
    status: 'stopped',
    message: 'Check cancelled by user'
  };

  return { success: true };
}

function getStatus() {
  return {
    success: true,
    data: currentCheck || { status: 'idle' }
  };
}

async function getCachedResults() {
  const cached = await storage.getCachedResults();
  const lastCheck = await storage.getLastCheck();

  return {
    success: true,
    data: {
      cached: cached,
      lastCheck: lastCheck
    }
  };
}

// Send progress updates to popup
function sendProgress(progress) {
  chrome.runtime.sendMessage({
    type: 'PROGRESS_UPDATE',
    ...progress
  }).catch(() => {
    // Popup might be closed, ignore error
  });
}

// Log when service worker starts
console.log('X Follow Checker background service worker started');
