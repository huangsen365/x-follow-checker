// X.com API wrapper

// Public bearer token from X.com's JavaScript bundles
const BEARER_TOKEN = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

// Default GraphQL query IDs (fallback if not fetched from server)
const DEFAULT_QUERY_IDS = {
  Following: 'eWTmcJY3EMh-dxIR7CYTKw',
  Followers: '1cgQROvByT7VpDSj3Ps5SQ',
  UserByScreenName: 'BQ6xjFU6Mgm-WhEP3OiT9w',
  Viewer: 'W62NnYgkgziw9bwyoVht0g'
};

// Storage key for dynamic query IDs
const QUERY_IDS_STORAGE_KEY = 'queryIds';

// Get query IDs from storage or use defaults
async function getQueryIds() {
  try {
    const result = await chrome.storage.local.get(QUERY_IDS_STORAGE_KEY);
    const stored = result[QUERY_IDS_STORAGE_KEY];
    if (stored && Object.keys(stored).length > 0) {
      // Merge with defaults (in case server doesn't provide all IDs)
      return { ...DEFAULT_QUERY_IDS, ...stored };
    }
  } catch (e) {
    console.warn('[API] Failed to get stored query IDs:', e);
  }
  return DEFAULT_QUERY_IDS;
}

// Save query IDs to storage
export async function saveQueryIds(queryIds) {
  if (queryIds && Object.keys(queryIds).length > 0) {
    try {
      await chrome.storage.local.set({ [QUERY_IDS_STORAGE_KEY]: queryIds });
      console.log('[API] Query IDs updated:', queryIds);
    } catch (e) {
      console.warn('[API] Failed to save query IDs:', e);
    }
  }
}

// For backward compatibility - expose QUERY_IDS as getter
const QUERY_IDS = new Proxy(DEFAULT_QUERY_IDS, {
  get(target, prop) {
    return target[prop];
  }
});

// Feature flags required by X.com API
const DEFAULT_FEATURES = {
  rweb_tipjar_consumption_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  articles_preview_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  creator_subscriptions_quote_tweet_preview_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  rweb_video_timestamps_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_enhance_cards_enabled: false,
  hidden_profile_subscriptions_enabled: true,
  subscriptions_verification_info_is_identity_verified_enabled: true,
  highlights_tweets_tab_ui_enabled: true
};

// Field toggles for user queries
const FIELD_TOGGLES = {
  withAuxiliaryUserLabels: false
};

// Error types
export const ErrorTypes = {
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  RATE_LIMITED: 'RATE_LIMITED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  PARSING_ERROR: 'PARSING_ERROR'
};

export class XApiError extends Error {
  constructor(type, message, details = {}) {
    super(message);
    this.type = type;
    this.details = details;
  }
}

// Get authentication tokens from cookies
export async function getAuthTokens() {
  const ct0Cookie = await chrome.cookies.get({
    url: 'https://x.com',
    name: 'ct0'
  });

  const authToken = await chrome.cookies.get({
    url: 'https://x.com',
    name: 'auth_token'
  });

  return {
    csrfToken: ct0Cookie?.value || null,
    authToken: authToken?.value || null
  };
}

// Build headers for X.com API requests
function buildHeaders(csrfToken) {
  return {
    'authorization': `Bearer ${BEARER_TOKEN}`,
    'x-csrf-token': csrfToken,
    'x-twitter-auth-type': 'OAuth2Session',
    'x-twitter-active-user': 'yes',
    'x-twitter-client-language': 'en',
    'content-type': 'application/json'
  };
}

// Make API request with error handling
async function apiRequest(url, csrfToken, signal) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(csrfToken),
      credentials: 'include',
      signal
    });

    if (response.status === 401 || response.status === 403) {
      throw new XApiError(
        ErrorTypes.NOT_AUTHENTICATED,
        'Please log in to X.com first'
      );
    }

    if (response.status === 429) {
      const resetTime = response.headers.get('x-rate-limit-reset');
      throw new XApiError(
        ErrorTypes.RATE_LIMITED,
        'Rate limit exceeded. Please wait a few minutes.',
        { retryAfter: resetTime ? parseInt(resetTime) * 1000 : null }
      );
    }

    if (!response.ok) {
      // Try to get more details from response body
      let errorDetail = response.statusText;
      try {
        const errorBody = await response.json();
        if (errorBody.errors && errorBody.errors[0]) {
          errorDetail = errorBody.errors[0].message || errorBody.errors[0].code;
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
      throw new XApiError(
        ErrorTypes.API_ERROR,
        `HTTP ${response.status}: ${errorDetail}`
      );
    }

    const data = await response.json();

    // Check for X.com specific errors
    if (data.errors && data.errors.length > 0) {
      const error = data.errors[0];
      if (error.code === 32 || error.code === 64) {
        throw new XApiError(
          ErrorTypes.NOT_AUTHENTICATED,
          'Please log in to X.com first'
        );
      }
      throw new XApiError(ErrorTypes.API_ERROR, error.message);
    }

    return data;
  } catch (error) {
    if (error instanceof XApiError) {
      throw error;
    }
    if (error?.name === 'AbortError') {
      throw new XApiError(ErrorTypes.API_ERROR, 'Check cancelled');
    }
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new XApiError(
        ErrorTypes.NETWORK_ERROR,
        'Unable to connect to X.com. Please check your internet connection.'
      );
    }
    throw new XApiError(
      ErrorTypes.API_ERROR,
      `Unexpected error: ${error.message}`
    );
  }
}

// Get current user info by screen name
export async function getUserByScreenName(screenName, csrfToken, signal) {
  const variables = {
    screen_name: screenName,
    withSafetyModeUserFields: true
  };

  const features = {
    hidden_profile_subscriptions_enabled: true,
    rweb_tipjar_consumption_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    subscriptions_verification_info_is_identity_verified_enabled: true,
    subscriptions_verification_info_verified_since_enabled: true,
    highlights_tweets_tab_ui_enabled: true,
    responsive_web_twitter_article_notes_tab_enabled: true,
    subscriptions_feature_can_gift_premium: true,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    responsive_web_graphql_timeline_navigation_enabled: true
  };

  const params = new URLSearchParams({
    variables: JSON.stringify(variables),
    features: JSON.stringify(features),
    fieldToggles: JSON.stringify(FIELD_TOGGLES)
  });

  // Get dynamic query ID from storage
  const queryIds = await getQueryIds();
  const queryId = queryIds.UserByScreenName;
  const url = `https://x.com/i/api/graphql/${queryId}/UserByScreenName?${params}`;

  const data = await apiRequest(url, csrfToken, signal);

  // Handle different response structures
  let userResult = data?.data?.user?.result;

  // Sometimes wrapped in a different structure
  if (userResult?.__typename === 'UserUnavailable') {
    throw new XApiError(ErrorTypes.API_ERROR, 'User not found or unavailable');
  }

  if (!userResult || !userResult.rest_id) {
    throw new XApiError(ErrorTypes.API_ERROR, 'Failed to get user info. Please check the username.');
  }

  return {
    id: userResult.rest_id,
    screenName: userResult.legacy?.screen_name || screenName,
    name: userResult.legacy?.name || screenName,
    profileImage: userResult.legacy?.profile_image_url_https,
    followingCount: userResult.legacy?.friends_count || 0,
    followersCount: userResult.legacy?.followers_count || 0
  };
}

// Fetch following list page
export async function fetchFollowingPage(userId, cursor, csrfToken, signal) {
  const variables = {
    userId: userId,
    count: 20,
    includePromotedContent: false
  };

  if (cursor) {
    variables.cursor = cursor;
  }

  const params = new URLSearchParams({
    variables: JSON.stringify(variables),
    features: JSON.stringify(DEFAULT_FEATURES),
    fieldToggles: JSON.stringify(FIELD_TOGGLES)
  });

  // Get dynamic query ID from storage
  const queryIds = await getQueryIds();
  const queryId = queryIds.Following;
  const url = `https://x.com/i/api/graphql/${queryId}/Following?${params}`;

  return await apiRequest(url, csrfToken, signal);
}

// Parse following response to extract users and cursor
export function parseFollowingResponse(response) {
  const instructions = response?.data?.user?.result?.timeline?.timeline?.instructions || [];
  const addEntriesInstruction = instructions.find(i =>
    i.type === 'TimelineAddEntries' || i.entries
  );

  if (!addEntriesInstruction) {
    return { users: [], nextCursor: null };
  }

  const entries = addEntriesInstruction.entries || [];
  const users = [];
  let nextCursor = null;

  for (const entry of entries) {
    // Handle user entries
    const itemContent = entry.content?.itemContent;
    if (itemContent?.itemType === 'TimelineUser' || itemContent?.user_results) {
      const userResult = itemContent.user_results?.result;
      if (userResult && userResult.legacy) {
        users.push({
          id: userResult.rest_id,
          screenName: userResult.legacy.screen_name,
          name: userResult.legacy.name,
          profileImage: userResult.legacy.profile_image_url_https?.replace('_normal', '_bigger'),
          description: userResult.legacy.description || '',
          followedBy: userResult.legacy.followed_by || false,
          verified: userResult.is_blue_verified || userResult.legacy.verified || false
        });
      }
    }

    // Handle cursor entries
    if (entry.content?.entryType === 'TimelineTimelineCursor' ||
        entry.content?.cursorType) {
      if (entry.content.cursorType === 'Bottom' ||
          entry.entryId?.includes('cursor-bottom')) {
        nextCursor = entry.content.value;
      }
    }
  }

  return { users, nextCursor };
}

// Maximum users to fetch per batch (to protect API token usage)
const MAX_USERS_PER_BATCH = 1000;

// Fetch following with pagination (supports continuation)
export async function fetchAllFollowing(userId, csrfToken, onProgress, signal, startCursor = null) {
  const allUsers = [];
  let cursor = startCursor;
  let page = 0;
  let hitLimit = false;
  let nextCursorForContinue = null;

  while (true) {
    // Check if cancelled
    if (signal?.aborted) {
      throw new XApiError(ErrorTypes.API_ERROR, 'Check cancelled');
    }

    // Check if we've hit the batch limit
    if (allUsers.length >= MAX_USERS_PER_BATCH) {
      hitLimit = true;
      break;
    }

    const response = await fetchFollowingPage(userId, cursor, csrfToken, signal);
    const { users, nextCursor } = parseFollowingResponse(response);

    allUsers.push(...users);
    page++;

    // Trim to max limit if exceeded
    if (allUsers.length > MAX_USERS_PER_BATCH) {
      allUsers.length = MAX_USERS_PER_BATCH;
      hitLimit = true;
      nextCursorForContinue = nextCursor;
      break;
    }

    if (onProgress) {
      onProgress({
        loaded: allUsers.length,
        page: page,
        hitLimit: hitLimit
      });
    }

    if (!nextCursor || users.length === 0) {
      // No more users to fetch
      break;
    }

    cursor = nextCursor;
    nextCursorForContinue = nextCursor;

    // Rate limit protection - wait between requests
    await delay(1000);
  }

  // Return with metadata
  return {
    users: allUsers,
    hitLimit: hitLimit,
    nextCursor: hitLimit ? nextCursorForContinue : null,
    hasMore: hitLimit && nextCursorForContinue !== null
  };
}

export { MAX_USERS_PER_BATCH };

// Utility function for delays
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch verified followers page (uses Followers endpoint)
export async function fetchVerifiedFollowersPage(userId, cursor, csrfToken, signal) {
  const variables = {
    userId: userId,
    count: 100, // Higher count to maximize efficiency since we'll filter
    includePromotedContent: false
  };

  if (cursor) {
    variables.cursor = cursor;
  }

  const params = new URLSearchParams({
    variables: JSON.stringify(variables),
    features: JSON.stringify(DEFAULT_FEATURES),
    fieldToggles: JSON.stringify(FIELD_TOGGLES)
  });

  // Get dynamic query ID from storage
  const queryIds = await getQueryIds();
  const queryId = queryIds.Followers;
  const url = `https://x.com/i/api/graphql/${queryId}/Followers?${params}`;

  return await apiRequest(url, csrfToken, signal);
}

// Parse verified followers response (filters for verified users only)
export function parseVerifiedFollowersResponse(response) {
  const instructions = response?.data?.user?.result?.timeline?.timeline?.instructions || [];
  const addEntriesInstruction = instructions.find(i =>
    i.type === 'TimelineAddEntries' || i.entries
  );

  if (!addEntriesInstruction) {
    return { users: [], nextCursor: null };
  }

  const entries = addEntriesInstruction.entries || [];
  const users = [];
  let nextCursor = null;

  for (const entry of entries) {
    // Handle user entries
    const itemContent = entry.content?.itemContent;
    if (itemContent?.itemType === 'TimelineUser' || itemContent?.user_results) {
      const userResult = itemContent.user_results?.result;
      if (userResult && userResult.legacy) {
        // Only include verified users
        const isVerified = userResult.is_blue_verified || userResult.legacy.verified || false;
        if (isVerified) {
          users.push({
            id: userResult.rest_id,
            screenName: userResult.legacy.screen_name,
            name: userResult.legacy.name,
            profileImage: userResult.legacy.profile_image_url_https?.replace('_normal', '_bigger'),
            description: userResult.legacy.description || '',
            followedBy: userResult.legacy.followed_by || false,
            verified: true
          });
        }
      }
    }

    // Handle cursor entries
    if (entry.content?.entryType === 'TimelineTimelineCursor' ||
        entry.content?.cursorType) {
      if (entry.content.cursorType === 'Bottom' ||
          entry.entryId?.includes('cursor-bottom')) {
        nextCursor = entry.content.value;
      }
    }
  }

  return { users, nextCursor };
}

// Fetch verified followers with pagination
export async function fetchVerifiedFollowers(userId, csrfToken, onProgress, signal, startCursor = null, maxResults = 50) {
  const allUsers = [];
  let cursor = startCursor;
  let page = 0;
  const seenCursors = new Set();
  const MAX_PAGES_PER_BATCH = 20;
  let hasMore = false;
  let nextCursorForContinue = null;

  while (allUsers.length < maxResults && page < MAX_PAGES_PER_BATCH) {
    // Check if cancelled
    if (signal?.aborted) {
      throw new XApiError(ErrorTypes.API_ERROR, 'Check cancelled');
    }

    // Prevent infinite loops if API returns a repeated cursor.
    if (cursor && seenCursors.has(cursor)) {
      hasMore = false;
      nextCursorForContinue = null;
      break;
    }
    if (cursor) {
      seenCursors.add(cursor);
    }

    let response;
    try {
      response = await fetchVerifiedFollowersPage(userId, cursor, csrfToken, signal);
    } catch (error) {
      // Followers endpoint/query ID can be stale. Fall back to the known-good
      // Following pipeline used by the main checker so side panel still works.
      if (isHttp404Error(error)) {
        console.warn('[API] Followers endpoint returned 404, falling back to Following endpoint');
        return await fetchVerifiedFollowersFromFollowing(
          userId,
          csrfToken,
          onProgress,
          signal,
          cursor,
          maxResults
        );
      }
      throw error;
    }

    const { users, nextCursor } = parseVerifiedFollowersResponse(response);

    allUsers.push(...users);
    page++;

    if (onProgress) {
      onProgress({
        loaded: allUsers.length,
        page: page
      });
    }

    // Stop if we have enough results.
    if (allUsers.length >= maxResults) {
      return {
        users: allUsers.slice(0, maxResults),
        hasMore: Boolean(nextCursor),
        nextCursor: nextCursor || null
      };
    }

    // Continue scanning follower timeline even when a page has zero verified users.
    if (!nextCursor) {
      hasMore = false;
      nextCursorForContinue = null;
      break;
    }

    hasMore = true;
    nextCursorForContinue = nextCursor;
    cursor = nextCursor;

    // Rate limit protection - wait between requests
    await delay(1000);
  }

  return {
    users: allUsers,
    hasMore: hasMore,
    nextCursor: nextCursorForContinue
  };
}

function isHttp404Error(error) {
  return (
    error?.type === ErrorTypes.API_ERROR &&
    typeof error?.message === 'string' &&
    error.message.includes('HTTP 404')
  );
}

// Fallback path that reuses the same request/parser flow as the main checker.
async function fetchVerifiedFollowersFromFollowing(
  userId,
  csrfToken,
  onProgress,
  signal,
  startCursor = null,
  maxResults = 50
) {
  const allUsers = [];
  let cursor = startCursor;
  let page = 0;
  const seenCursors = new Set();
  const MAX_PAGES_PER_BATCH = 20;

  while (allUsers.length < maxResults && page < MAX_PAGES_PER_BATCH) {
    if (signal?.aborted) {
      throw new XApiError(ErrorTypes.API_ERROR, 'Check cancelled');
    }

    if (cursor && seenCursors.has(cursor)) {
      break;
    }
    if (cursor) {
      seenCursors.add(cursor);
    }

    const response = await fetchFollowingPage(userId, cursor, csrfToken, signal);
    const { users, nextCursor } = parseFollowingResponse(response);
    const verifiedFollowers = users.filter((user) => user.verified && user.followedBy);

    allUsers.push(...verifiedFollowers);
    page++;

    if (onProgress) {
      onProgress({
        loaded: allUsers.length,
        page: page
      });
    }

    if (allUsers.length >= maxResults) {
      return {
        users: allUsers.slice(0, maxResults),
        hasMore: Boolean(nextCursor),
        nextCursor: nextCursor || null
      };
    }

    if (!nextCursor || users.length === 0) {
      break;
    }

    cursor = nextCursor;
    await delay(1000);
  }

  return {
    users: allUsers,
    hasMore: false,
    nextCursor: null
  };
}

// Get current logged-in user
export async function getCurrentUser(csrfToken, signal) {
  const variables = {
    withCommunitiesMemberships: false,
    withSubscribedTab: false,
    withCommunitiesCreation: false
  };

  const features = {
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    responsive_web_graphql_timeline_navigation_enabled: true
  };

  const params = new URLSearchParams({
    variables: JSON.stringify(variables),
    features: JSON.stringify(features)
  });

  // Get dynamic query ID from storage
  const queryIds = await getQueryIds();
  const queryId = queryIds.Viewer;
  const url = `https://x.com/i/api/graphql/${queryId}/Viewer?${params}`;

  const data = await apiRequest(url, csrfToken, signal);

  const viewer = data?.data?.viewer?.user_results?.result;

  if (!viewer || !viewer.legacy) {
    throw new XApiError(ErrorTypes.NOT_AUTHENTICATED, 'Could not detect logged-in user. Please log in to X.com first.');
  }

  return {
    id: viewer.rest_id,
    screenName: viewer.legacy.screen_name,
    name: viewer.legacy.name,
    profileImage: viewer.legacy.profile_image_url_https
  };
}

// Export query IDs and utilities
export { DEFAULT_QUERY_IDS as QUERY_IDS, BEARER_TOKEN, getQueryIds };
