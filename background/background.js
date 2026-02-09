// Background service worker for X Follow Checker

import {
  getAuthTokens,
  getUserByScreenName,
  getCurrentUser,
  fetchAllFollowing,
  fetchVerifiedFollowers,
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

    case 'CONTINUE_CHECK':
      return await continueCheck(request.username);

    case 'STOP_CHECK':
      return stopCheck();

    case 'GET_STATUS':
      return getStatus();

    case 'GET_CACHED_RESULTS':
      return await getCachedResults();

    case 'DETECT_USERNAME':
      return await detectUsername();

    case 'LOAD_VERIFIED_FOLLOWERS':
      return await loadVerifiedFollowers(request.username, request.cursor);

    case 'GET_VERIFIED_FOLLOWERS_CACHE':
      return await getVerifiedFollowersCache(request.username);

    case 'USER_LOGGED_IN':
      // Content script notifies when user is logged in - acknowledge silently
      return { success: true };

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
    screenName: screenName,
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
    const currentUser = await getUserByScreenName(screenName, tokens.csrfToken, abortController.signal);
    currentCheck.userId = currentUser.id;
    currentCheck.user = currentUser;

    // Fetch all following
    sendProgress({
      status: 'fetching_following',
      totalEstimate: currentUser.followingCount
    });

    const followingResult = await fetchAllFollowing(
      currentUser.id,
      tokens.csrfToken,
      (progress) => {
        currentCheck.progress = progress;
        sendProgress({
          status: 'fetching_following',
          loaded: progress.loaded,
          page: progress.page,
          totalEstimate: currentUser.followingCount,
          hitLimit: progress.hitLimit
        });
      },
      abortController.signal
    );

    // Extract users array and metadata from result
    const { users: following, hitLimit, nextCursor, hasMore } = followingResult;

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
      },
      hitLimit: hitLimit,
      nextCursor: nextCursor,
      hasMore: hasMore
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

async function continueCheck(username) {
  // Get cached results for specific username
  const cached = username
    ? await storage.getCachedResults(username)
    : await storage.getMostRecentCachedResults();

  console.log('[ContinueCheck] Username:', username);
  console.log('[ContinueCheck] Cached data found:', !!cached);
  console.log('[ContinueCheck] hasMore:', cached?.hasMore);
  console.log('[ContinueCheck] nextCursor:', cached?.nextCursor ? 'exists' : 'missing');

  if (!cached) {
    return {
      success: false,
      error: {
        type: ErrorTypes.API_ERROR,
        message: 'No cached results found. Please run a check first.'
      }
    };
  }

  if (!cached.hasMore || !cached.nextCursor) {
    return {
      success: false,
      error: {
        type: ErrorTypes.API_ERROR,
        message: 'All users have been loaded. No more data to fetch.'
      }
    };
  }

  // Cancel any existing check
  if (abortController) {
    abortController.abort();
  }

  abortController = new AbortController();
  currentCheck = {
    status: 'running',
    progress: { loaded: cached.following.length, page: 0 },
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

    // Continue fetching from cursor
    sendProgress({
      status: 'fetching_following',
      loaded: cached.following.length,
      totalEstimate: cached.user.followingCount
    });

    const followingResult = await fetchAllFollowing(
      cached.user.id,
      tokens.csrfToken,
      (progress) => {
        currentCheck.progress = {
          loaded: cached.following.length + progress.loaded,
          page: progress.page
        };
        sendProgress({
          status: 'fetching_following',
          loaded: cached.following.length + progress.loaded,
          page: progress.page,
          totalEstimate: cached.user.followingCount,
          hitLimit: progress.hitLimit
        });
      },
      abortController.signal,
      cached.nextCursor // Continue from where we left off
    );

    // Merge new users with existing
    const { users: newUsers, hitLimit, nextCursor, hasMore } = followingResult;
    const allFollowing = [...cached.following, ...newUsers];

    // Recalculate mutual/notFollowingBack with all users
    const mutual = allFollowing.filter(u => u.followedBy);
    const notFollowingBack = allFollowing.filter(u => !u.followedBy);

    const results = {
      user: cached.user,
      following: allFollowing,
      mutual: mutual,
      notFollowingBack: notFollowingBack,
      stats: {
        total: allFollowing.length,
        mutualCount: mutual.length,
        notFollowingBackCount: notFollowingBack.length
      },
      hitLimit: hitLimit,
      nextCursor: nextCursor,
      hasMore: hasMore
    };

    // Cache updated results
    await storage.setCachedResults(results);
    await storage.setLastCheck(Date.now());

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
  // Include totalEstimate from user info if available
  const data = currentCheck ? {
    ...currentCheck,
    totalEstimate: currentCheck.user?.followingCount || 0
  } : { status: 'idle' };

  return {
    success: true,
    data: data
  };
}

async function getCachedResults() {
  // Get the most recent cached result (for backward compatibility)
  const cached = await storage.getMostRecentCachedResults();
  const lastCheck = await storage.getLastCheck();

  return {
    success: true,
    data: {
      cached: cached,
      lastCheck: lastCheck
    }
  };
}

async function detectUsername() {
  try {
    // Check if we have auth tokens
    const tokens = await getAuthTokens();

    if (!tokens.csrfToken) {
      return {
        success: false,
        error: {
          type: ErrorTypes.NOT_AUTHENTICATED,
          message: 'Please log in to X.com first'
        }
      };
    }

    // Get current logged-in user
    const user = await getCurrentUser(tokens.csrfToken);

    return {
      success: true,
      data: {
        screenName: user.screenName,
        name: user.name
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: error.type || ErrorTypes.API_ERROR,
        message: error.message
      }
    };
  }
}

async function loadVerifiedFollowers(username, cursor = null) {
  console.log('[Background] loadVerifiedFollowers called for:', username, 'cursor:', cursor);
  try {
    // Get auth tokens
    console.log('[Background] Getting auth tokens...');
    const tokens = await getAuthTokens();
    console.log('[Background] CSRF token available:', !!tokens.csrfToken);

    if (!tokens.csrfToken) {
      throw new XApiError(
        ErrorTypes.NOT_AUTHENTICATED,
        'Please log in to X.com first'
      );
    }

    // Get user info first
    console.log('[Background] Fetching user info for:', username);
    const user = await getUserByScreenName(username, tokens.csrfToken);
    console.log('[Background] User found:', user.id, user.name);

    // Fetch verified followers
    console.log('[Background] Fetching verified followers for user ID:', user.id);
    const result = await fetchVerifiedFollowers(
      user.id,
      tokens.csrfToken,
      (progress) => {
        console.log('[Background] Progress:', progress);
        // Send progress updates to side panel
        chrome.runtime.sendMessage({
          type: 'VERIFIED_FOLLOWERS_PROGRESS',
          loaded: progress.loaded,
          page: progress.page
        }).catch(() => {
          // Side panel might be closed, ignore error
        });
      },
      null, // signal
      cursor,
      50 // max results per page
    );

    console.log('[Background] Verified followers fetched:', result.users.length, 'hasMore:', result.hasMore);

    // Cache only first page for fast reopen/load from cache.
    if (!cursor) {
      await storage.setVerifiedFollowersCache(username, {
        user: user,
        followers: result.users,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor
      });
    }

    return {
      success: true,
      data: {
        user: user,
        followers: result.users,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor
      }
    };
  } catch (error) {
    console.error('[Background] Error loading verified followers:', error);
    return {
      success: false,
      error: {
        type: error.type || ErrorTypes.API_ERROR,
        message: error.message
      }
    };
  }
}

async function getVerifiedFollowersCache(username) {
  try {
    const cached = await storage.getVerifiedFollowersCache(username);
    return {
      success: true,
      data: cached
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: ErrorTypes.API_ERROR,
        message: error.message
      }
    };
  }
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
