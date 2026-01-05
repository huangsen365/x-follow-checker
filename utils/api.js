// X.com API wrapper

// Public bearer token from X.com's JavaScript bundles
const BEARER_TOKEN = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

// GraphQL query IDs (these may change over time - update if 400 errors occur)
const QUERY_IDS = {
  Following: 'eWTmcJY3EMh-dxIR7CYTKw',
  Followers: '1cgQROvByT7VpDSj3Ps5SQ',
  UserByScreenName: 'BQ6xjFU6Mgm-WhEP3OiT9w',
  Viewer: 'W62NnYgkgziw9bwyoVht0g'
};

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
async function apiRequest(url, csrfToken) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(csrfToken),
      credentials: 'include'
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
export async function getUserByScreenName(screenName, csrfToken) {
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

  const queryId = QUERY_IDS.UserByScreenName;
  const url = `https://x.com/i/api/graphql/${queryId}/UserByScreenName?${params}`;

  const data = await apiRequest(url, csrfToken);

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
export async function fetchFollowingPage(userId, cursor, csrfToken) {
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

  const queryId = QUERY_IDS.Following;
  const url = `https://x.com/i/api/graphql/${queryId}/Following?${params}`;

  return await apiRequest(url, csrfToken);
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

// Fetch all following with pagination
export async function fetchAllFollowing(userId, csrfToken, onProgress, signal) {
  const allUsers = [];
  let cursor = null;
  let page = 0;

  while (true) {
    // Check if cancelled
    if (signal?.aborted) {
      throw new XApiError(ErrorTypes.API_ERROR, 'Check cancelled');
    }

    const response = await fetchFollowingPage(userId, cursor, csrfToken);
    const { users, nextCursor } = parseFollowingResponse(response);

    allUsers.push(...users);
    page++;

    if (onProgress) {
      onProgress({
        loaded: allUsers.length,
        page: page
      });
    }

    if (!nextCursor || users.length === 0) {
      break;
    }

    cursor = nextCursor;

    // Rate limit protection - wait between requests
    await delay(1000);
  }

  return allUsers;
}

// Utility function for delays
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get current logged-in user
export async function getCurrentUser(csrfToken) {
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

  const queryId = QUERY_IDS.Viewer;
  const url = `https://x.com/i/api/graphql/${queryId}/Viewer?${params}`;

  const data = await apiRequest(url, csrfToken);

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

// Export query IDs for potential updates
export { QUERY_IDS, BEARER_TOKEN };
