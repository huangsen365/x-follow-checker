#!/usr/bin/env node

/**
 * Build script to generate web version of X Follow Checker
 *
 * Usage: node build-web.js
 * Output: dist/ folder with static files
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, 'dist');
const GITHUB_URL = 'https://github.com/huangsen365/x-follow-checker';

// Ensure dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Read source files
const popupHtml = fs.readFileSync(path.join(__dirname, 'popup/popup.html'), 'utf8');
const popupCss = fs.readFileSync(path.join(__dirname, 'popup/popup.css'), 'utf8');
const popupJs = fs.readFileSync(path.join(__dirname, 'popup/popup.js'), 'utf8');
const i18nJs = fs.readFileSync(path.join(__dirname, 'utils/i18n.js'), 'utf8');
const storageJs = fs.readFileSync(path.join(__dirname, 'utils/storage.js'), 'utf8');
const apiJs = fs.readFileSync(path.join(__dirname, 'utils/api.js'), 'utf8');

// Convert ES modules to browser-compatible code
function convertToWeb(code) {
  // Remove import statements
  code = code.replace(/^import .+ from .+;?\n?/gm, '');
  // Remove export statements but keep the content
  code = code.replace(/^export /gm, '');
  return code;
}

// Create web-compatible storage module (uses localStorage)
const webStorageJs = `
// Web Storage (localStorage-based)
const STORAGE_KEYS = {
  LANGUAGE: 'xfc_language',
  LAST_CHECK: 'xfc_lastCheck',
  CACHED_RESULTS: 'xfc_cachedResults',
  USERNAME_HISTORY: 'xfc_usernameHistory',
  AUTH_TOKENS: 'xfc_authTokens'
};

const storage = {
  async get(key) {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  },

  async set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  async remove(key) {
    localStorage.removeItem(key);
  },

  async getLanguage() {
    return (await this.get(STORAGE_KEYS.LANGUAGE)) || 'en';
  },

  async setLanguage(lang) {
    await this.set(STORAGE_KEYS.LANGUAGE, lang);
  },

  async getRecentUsernames() {
    return (await this.get(STORAGE_KEYS.USERNAME_HISTORY)) || [];
  },

  async addRecentUsername(username) {
    if (!username) return;
    const history = await this.getRecentUsernames();
    const filtered = history.filter(u => u.toLowerCase() !== username.toLowerCase());
    filtered.unshift(username);
    await this.set(STORAGE_KEYS.USERNAME_HISTORY, filtered.slice(0, 10));
  },

  async clearUsernameHistory() {
    await this.remove(STORAGE_KEYS.USERNAME_HISTORY);
  },

  async getCachedResults() {
    return await this.get(STORAGE_KEYS.CACHED_RESULTS);
  },

  async setCachedResults(results) {
    await this.set(STORAGE_KEYS.CACHED_RESULTS, { ...results, timestamp: Date.now() });
  },

  async getAuthTokens() {
    return await this.get(STORAGE_KEYS.AUTH_TOKENS);
  },

  async setAuthTokens(tokens) {
    await this.set(STORAGE_KEYS.AUTH_TOKENS, tokens);
  }
};
`;

// Create web-compatible API module
const webApiJs = `
// Web API Module
const BEARER_TOKEN = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

const QUERY_IDS = {
  Following: 'eWTmcJY3EMh-dxIR7CYTKw',
  Followers: '1cgQROvByT7VpDSj3Ps5SQ',
  UserByScreenName: 'BQ6xjFU6Mgm-WhEP3OiT9w'
};

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

const FIELD_TOGGLES = { withAuxiliaryUserLabels: false };

const ErrorTypes = {
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  RATE_LIMITED: 'RATE_LIMITED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR'
};

class XApiError extends Error {
  constructor(type, message, details = {}) {
    super(message);
    this.type = type;
    this.details = details;
  }
}

function buildHeaders(csrfToken) {
  return {
    'authorization': \`Bearer \${BEARER_TOKEN}\`,
    'x-csrf-token': csrfToken,
    'x-twitter-auth-type': 'OAuth2Session',
    'x-twitter-active-user': 'yes',
    'x-twitter-client-language': 'en',
    'content-type': 'application/json'
  };
}

async function apiRequest(url, csrfToken) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(csrfToken),
      credentials: 'include'
    });

    if (response.status === 401 || response.status === 403) {
      throw new XApiError(ErrorTypes.NOT_AUTHENTICATED, 'Please log in to X.com first');
    }

    if (response.status === 429) {
      throw new XApiError(ErrorTypes.RATE_LIMITED, 'Rate limit exceeded. Please wait.');
    }

    if (!response.ok) {
      let errorDetail = response.statusText;
      try {
        const errorBody = await response.json();
        if (errorBody.errors && errorBody.errors[0]) {
          errorDetail = errorBody.errors[0].message || errorBody.errors[0].code;
        }
      } catch (e) {}
      throw new XApiError(ErrorTypes.API_ERROR, \`HTTP \${response.status}: \${errorDetail}\`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof XApiError) throw error;
    throw new XApiError(ErrorTypes.NETWORK_ERROR, error.message);
  }
}

async function getUserByScreenName(screenName, csrfToken) {
  const variables = { screen_name: screenName, withSafetyModeUserFields: true };
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

  const url = \`https://x.com/i/api/graphql/\${QUERY_IDS.UserByScreenName}/UserByScreenName?\${params}\`;
  const data = await apiRequest(url, csrfToken);
  const userResult = data?.data?.user?.result;

  if (!userResult || !userResult.rest_id) {
    throw new XApiError(ErrorTypes.API_ERROR, 'User not found');
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

async function fetchFollowingPage(userId, cursor, csrfToken) {
  const variables = { userId, count: 20, includePromotedContent: false };
  if (cursor) variables.cursor = cursor;

  const params = new URLSearchParams({
    variables: JSON.stringify(variables),
    features: JSON.stringify(DEFAULT_FEATURES),
    fieldToggles: JSON.stringify(FIELD_TOGGLES)
  });

  const url = \`https://x.com/i/api/graphql/\${QUERY_IDS.Following}/Following?\${params}\`;
  return await apiRequest(url, csrfToken);
}

function parseFollowingResponse(response) {
  const instructions = response?.data?.user?.result?.timeline?.timeline?.instructions || [];
  const addEntriesInstruction = instructions.find(i => i.type === 'TimelineAddEntries' || i.entries);
  if (!addEntriesInstruction) return { users: [], nextCursor: null };

  const entries = addEntriesInstruction.entries || [];
  const users = [];
  let nextCursor = null;

  for (const entry of entries) {
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
    if (entry.content?.cursorType === 'Bottom' || entry.entryId?.includes('cursor-bottom')) {
      nextCursor = entry.content?.value;
    }
  }

  return { users, nextCursor };
}

async function fetchAllFollowing(userId, csrfToken, onProgress) {
  const allUsers = [];
  let cursor = null;
  let page = 0;

  while (true) {
    const response = await fetchFollowingPage(userId, cursor, csrfToken);
    const { users, nextCursor } = parseFollowingResponse(response);
    allUsers.push(...users);
    page++;
    if (onProgress) onProgress({ loaded: allUsers.length, page });
    if (!nextCursor || users.length === 0) break;
    cursor = nextCursor;
    await new Promise(r => setTimeout(r, 1000));
  }

  return allUsers;
}
`;

// Create i18n module (browser version)
const webI18nJs = convertToWeb(i18nJs);

// Build the main HTML file
const mainHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>X Follow Checker - Web Version</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✓</text></svg>">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 40px 20px;
    }

    .web-container {
      width: 100%;
      max-width: 400px;
    }

    .web-header {
      text-align: center;
      color: white;
      margin-bottom: 24px;
    }

    .web-header h1 {
      font-size: 28px;
      margin-bottom: 8px;
    }

    .web-header p {
      opacity: 0.9;
      font-size: 14px;
    }

    .extension-frame {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }

    .notice-banner {
      background: #fff3cd;
      border-bottom: 1px solid #ffc107;
      padding: 12px 16px;
      font-size: 12px;
      color: #856404;
    }

    .notice-banner a {
      color: #0d6efd;
    }

    .token-section {
      padding: 16px;
      background: #f8f9fa;
      border-bottom: 1px solid #eff3f4;
    }

    .token-section label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #536471;
      margin-bottom: 6px;
    }

    .token-section input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #cfd9de;
      border-radius: 6px;
      font-size: 13px;
      margin-bottom: 12px;
    }

    .token-section input:focus {
      outline: none;
      border-color: #1d9bf0;
    }

    .token-help {
      font-size: 11px;
      color: #536471;
      line-height: 1.4;
    }

    .token-help details {
      margin-top: 8px;
    }

    .token-help summary {
      cursor: pointer;
      color: #1d9bf0;
    }

    .token-help ol {
      margin: 8px 0 0 20px;
    }

    ${popupCss}

    /* Override popup styles for web */
    body > .container { display: none; }

    .extension-frame .container {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-height: 500px;
    }

    .web-footer {
      text-align: center;
      margin-top: 24px;
      color: white;
      font-size: 13px;
    }

    .web-footer a {
      color: white;
      opacity: 0.9;
    }

    .web-footer a:hover {
      opacity: 1;
    }
  </style>
</head>
<body>
  <div class="web-container">
    <div class="web-header">
      <h1>X Follow Checker</h1>
      <p>Check who doesn't follow you back on X.com</p>
    </div>

    <div class="extension-frame">
      <div class="notice-banner">
        ⚠️ <strong>Web version requires manual token input.</strong><br>
        For easier use, install the <a href="${GITHUB_URL}" target="_blank">Chrome Extension</a>.
      </div>

      <div class="token-section">
        <label>CSRF Token (ct0 cookie)</label>
        <input type="text" id="csrfTokenInput" placeholder="Paste your ct0 cookie value here">

        <div class="token-help">
          <details>
            <summary>How to get your token?</summary>
            <ol>
              <li>Log in to <a href="https://x.com" target="_blank">x.com</a></li>
              <li>Open Developer Tools (F12)</li>
              <li>Go to Application → Cookies → x.com</li>
              <li>Find "ct0" and copy its value</li>
              <li>Paste it above</li>
            </ol>
          </details>
        </div>
      </div>

      <div class="container">
        <!-- Header -->
        <header class="header">
          <h1 class="title" data-i18n="appTitle">X Follow Checker</h1>
          <select id="langSelect" class="lang-select">
            <option value="en">EN</option>
            <option value="zh">中文</option>
          </select>
        </header>

        <!-- Input Section -->
        <section class="input-section">
          <div class="input-wrapper">
            <div class="input-group">
              <span class="input-prefix">@</span>
              <input type="text" id="screenNameInput" class="screen-name-input" placeholder="your_username" autocomplete="off">
            </div>
            <div id="recentDropdown" class="recent-dropdown hidden">
              <div class="recent-header" data-i18n="recentUsernames">Recent</div>
              <div id="recentList" class="recent-list"></div>
              <button id="clearHistoryBtn" class="btn-clear" data-i18n="clearHistory">Clear History</button>
            </div>
          </div>
          <button id="startBtn" class="btn btn-primary">
            <span class="btn-text" data-i18n="startCheck">Start Check</span>
            <span class="btn-loading hidden">
              <span class="spinner"></span>
              <span data-i18n="checking">Checking...</span>
            </span>
          </button>
        </section>

        <!-- Progress Section -->
        <section id="progressSection" class="progress-section hidden">
          <div class="progress-bar">
            <div id="progressFill" class="progress-fill"></div>
          </div>
          <p id="progressText" class="progress-text">Loading...</p>
        </section>

        <!-- Error Section -->
        <section id="errorSection" class="error-section hidden">
          <div class="error-icon">⚠️</div>
          <h3 id="errorTitle" class="error-title">Error</h3>
          <p id="errorMessage" class="error-message"></p>
          <div class="error-buttons">
            <button id="errorActionBtn" class="btn btn-secondary hidden"></button>
            <button id="reportIssueBtn" class="btn btn-link hidden" data-i18n="reportIssue">Report Issue</button>
          </div>
        </section>

        <!-- Results Section -->
        <section id="resultsSection" class="results-section hidden">
          <div class="stats">
            <div class="stat-item">
              <span class="stat-value" id="totalCount">0</span>
              <span class="stat-label" data-i18n="following">Following</span>
            </div>
            <div class="stat-item stat-mutual">
              <span class="stat-value" id="mutualCount">0</span>
              <span class="stat-label" data-i18n="mutual">Mutual</span>
            </div>
            <div class="stat-item stat-not-following">
              <span class="stat-value" id="notFollowingCount">0</span>
              <span class="stat-label" data-i18n="notFollowingBack">Not Following Back</span>
            </div>
          </div>

          <div class="export-buttons">
            <button id="exportCsvBtn" class="btn btn-small" data-i18n="exportCSV">Export CSV</button>
            <button id="exportJsonBtn" class="btn btn-small" data-i18n="exportJSON">Export JSON</button>
          </div>

          <div class="filter-tabs">
            <button class="filter-tab active" data-filter="all" data-i18n="all">All</button>
            <button class="filter-tab" data-filter="mutual" data-i18n="mutual">Mutual</button>
            <button class="filter-tab" data-filter="notFollowing" data-i18n="notFollowingBack">Not Following Back</button>
          </div>

          <div id="userList" class="user-list"></div>
          <p id="lastCheckInfo" class="last-check-info"></p>
        </section>

        <!-- Empty State -->
        <section id="emptyState" class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3 data-i18n="noResults">No results yet</h3>
          <p data-i18n="noResultsDesc">Enter your token and username to start.</p>
        </section>

        <!-- Footer -->
        <footer class="footer">
          <a href="${GITHUB_URL}" target="_blank" class="github-link">
            <svg class="github-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <span data-i18n="viewOnGitHub">Star on GitHub</span>
          </a>
        </footer>
      </div>
    </div>

    <div class="web-footer">
      <p>
        <a href="${GITHUB_URL}" target="_blank">GitHub</a> ·
        <a href="${GITHUB_URL}/issues" target="_blank">Report Issues</a>
      </p>
    </div>
  </div>

  <script>
${webI18nJs}

${webStorageJs}

${webApiJs}

// Web version popup logic
(function() {
  const elements = {
    csrfTokenInput: null,
    langSelect: null,
    screenNameInput: null,
    startBtn: null,
    recentDropdown: null,
    recentList: null,
    clearHistoryBtn: null,
    progressSection: null,
    progressFill: null,
    progressText: null,
    errorSection: null,
    errorTitle: null,
    errorMessage: null,
    errorActionBtn: null,
    reportIssueBtn: null,
    resultsSection: null,
    totalCount: null,
    mutualCount: null,
    notFollowingCount: null,
    exportCsvBtn: null,
    exportJsonBtn: null,
    filterTabs: null,
    userList: null,
    lastCheckInfo: null,
    emptyState: null
  };

  let currentResults = null;
  let currentFilter = 'all';
  let isChecking = false;
  let recentUsernames = [];
  let selectedIndex = -1;

  document.addEventListener('DOMContentLoaded', async () => {
    initElements();
    await initLanguage();
    await loadRecentUsernames();
    setupEventListeners();
    updateUI();
  });

  function initElements() {
    elements.csrfTokenInput = document.getElementById('csrfTokenInput');
    elements.langSelect = document.getElementById('langSelect');
    elements.screenNameInput = document.getElementById('screenNameInput');
    elements.startBtn = document.getElementById('startBtn');
    elements.recentDropdown = document.getElementById('recentDropdown');
    elements.recentList = document.getElementById('recentList');
    elements.clearHistoryBtn = document.getElementById('clearHistoryBtn');
    elements.progressSection = document.getElementById('progressSection');
    elements.progressFill = document.getElementById('progressFill');
    elements.progressText = document.getElementById('progressText');
    elements.errorSection = document.getElementById('errorSection');
    elements.errorTitle = document.getElementById('errorTitle');
    elements.errorMessage = document.getElementById('errorMessage');
    elements.errorActionBtn = document.getElementById('errorActionBtn');
    elements.reportIssueBtn = document.getElementById('reportIssueBtn');
    elements.resultsSection = document.getElementById('resultsSection');
    elements.totalCount = document.getElementById('totalCount');
    elements.mutualCount = document.getElementById('mutualCount');
    elements.notFollowingCount = document.getElementById('notFollowingCount');
    elements.exportCsvBtn = document.getElementById('exportCsvBtn');
    elements.exportJsonBtn = document.getElementById('exportJsonBtn');
    elements.filterTabs = document.querySelectorAll('.filter-tab');
    elements.userList = document.getElementById('userList');
    elements.lastCheckInfo = document.getElementById('lastCheckInfo');
    elements.emptyState = document.getElementById('emptyState');
  }

  async function initLanguage() {
    const savedLang = await storage.getLanguage();
    setLanguage(savedLang);
    elements.langSelect.value = savedLang;
    updateTranslations();
  }

  async function loadRecentUsernames() {
    recentUsernames = await storage.getRecentUsernames();
    if (recentUsernames.length > 0 && !elements.screenNameInput.value) {
      elements.screenNameInput.value = recentUsernames[0];
    }
  }

  function setupEventListeners() {
    elements.langSelect.addEventListener('change', async (e) => {
      setLanguage(e.target.value);
      await storage.setLanguage(e.target.value);
      updateTranslations();
    });

    elements.startBtn.addEventListener('click', handleStartCheck);

    elements.screenNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !isChecking) {
        hideRecentDropdown();
        handleStartCheck();
      }
    });

    elements.screenNameInput.addEventListener('focus', () => showRecentDropdown(elements.screenNameInput.value));
    elements.screenNameInput.addEventListener('input', (e) => showRecentDropdown(e.target.value));

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.input-wrapper')) hideRecentDropdown();
    });

    elements.clearHistoryBtn.addEventListener('click', handleClearHistory);
    elements.exportCsvBtn.addEventListener('click', () => exportData('csv'));
    elements.exportJsonBtn.addEventListener('click', () => exportData('json'));

    elements.filterTabs.forEach(tab => {
      tab.addEventListener('click', () => setFilter(tab.dataset.filter));
    });
  }

  function showRecentDropdown(filterText = '') {
    if (recentUsernames.length === 0) return;
    const filtered = filterText ? recentUsernames.filter(u => u.toLowerCase().startsWith(filterText.toLowerCase().replace('@', ''))) : recentUsernames;
    if (filtered.length === 0) { hideRecentDropdown(); return; }
    selectedIndex = -1;
    elements.recentList.innerHTML = filtered.map(username => \`<div class="recent-item" data-username="\${username}"><span class="recent-item-text">\${username}</span></div>\`).join('');
    elements.recentList.querySelectorAll('.recent-item').forEach(item => {
      item.addEventListener('click', () => { elements.screenNameInput.value = item.dataset.username; hideRecentDropdown(); });
    });
    elements.recentDropdown.classList.remove('hidden');
  }

  function hideRecentDropdown() {
    elements.recentDropdown.classList.add('hidden');
    selectedIndex = -1;
  }

  async function handleClearHistory() {
    if (confirm(t('clearHistoryConfirm'))) {
      await storage.clearUsernameHistory();
      recentUsernames = [];
      hideRecentDropdown();
    }
  }

  async function handleStartCheck() {
    const csrfToken = elements.csrfTokenInput.value.trim();
    const screenName = elements.screenNameInput.value.trim().replace('@', '');

    if (!csrfToken) {
      showError('NOT_AUTHENTICATED', t('error'), 'Please enter your CSRF token (ct0 cookie)');
      return;
    }

    if (!screenName) {
      showError('API_ERROR', t('error'), 'Please enter a username');
      return;
    }

    hideRecentDropdown();
    setCheckingState(true);
    hideAllSections();
    showSection(elements.progressSection);
    updateProgress(0, t('loading'));

    try {
      updateProgress(5, t('loading'));
      const currentUser = await getUserByScreenName(screenName, csrfToken);

      const following = await fetchAllFollowing(currentUser.id, csrfToken, (progress) => {
        const percent = currentUser.followingCount ? Math.min(95, (progress.loaded / currentUser.followingCount) * 100) : 50;
        updateProgress(percent, t('loadingProgress', { count: progress.loaded }));
      });

      const mutual = following.filter(u => u.followedBy);
      const notFollowingBack = following.filter(u => !u.followedBy);

      currentResults = {
        user: currentUser,
        following,
        mutual,
        notFollowingBack,
        stats: { total: following.length, mutualCount: mutual.length, notFollowingBackCount: notFollowingBack.length }
      };

      await storage.addRecentUsername(screenName);
      recentUsernames = await storage.getRecentUsernames();
      await storage.setCachedResults(currentResults);
      showResults();

    } catch (error) {
      showError(error.type || 'API_ERROR', getErrorTitle(error.type), error.message);
    } finally {
      setCheckingState(false);
    }
  }

  function setCheckingState(checking) {
    isChecking = checking;
    const btnText = elements.startBtn.querySelector('.btn-text');
    const btnLoading = elements.startBtn.querySelector('.btn-loading');
    if (checking) {
      btnText.classList.add('hidden');
      btnLoading.classList.remove('hidden');
      elements.screenNameInput.disabled = true;
      elements.csrfTokenInput.disabled = true;
    } else {
      btnText.classList.remove('hidden');
      btnLoading.classList.add('hidden');
      elements.screenNameInput.disabled = false;
      elements.csrfTokenInput.disabled = false;
    }
  }

  function updateProgress(percent, text) {
    elements.progressFill.style.width = percent + '%';
    elements.progressText.textContent = text;
  }

  function showError(type, title, message) {
    hideAllSections();
    showSection(elements.errorSection);
    elements.errorTitle.textContent = title;
    elements.errorMessage.textContent = message;
    elements.errorActionBtn.classList.add('hidden');
    elements.reportIssueBtn.classList.add('hidden');

    elements.errorActionBtn.textContent = t('retry');
    elements.errorActionBtn.classList.remove('hidden');
    elements.errorActionBtn.onclick = handleStartCheck;

    if (type !== 'NOT_AUTHENTICATED') {
      elements.reportIssueBtn.classList.remove('hidden');
      elements.reportIssueBtn.onclick = () => {
        window.open('${GITHUB_URL}/issues/new?title=' + encodeURIComponent('Error: ' + message));
      };
    }
  }

  function getErrorTitle(errorType) {
    const titles = { NOT_AUTHENTICATED: t('notLoggedIn'), RATE_LIMITED: t('rateLimited'), NETWORK_ERROR: t('networkError') };
    return titles[errorType] || t('error');
  }

  function showResults() {
    hideAllSections();
    showSection(elements.resultsSection);
    if (!currentResults) return;
    elements.totalCount.textContent = currentResults.stats.total;
    elements.mutualCount.textContent = currentResults.stats.mutualCount;
    elements.notFollowingCount.textContent = currentResults.stats.notFollowingBackCount;
    elements.lastCheckInfo.textContent = t('lastChecked', { time: new Date().toLocaleString() });
    renderUserList();
  }

  function setFilter(filter) {
    currentFilter = filter;
    elements.filterTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.filter === filter));
    renderUserList();
  }

  function renderUserList() {
    if (!currentResults) return;
    let users = currentFilter === 'mutual' ? currentResults.mutual : currentFilter === 'notFollowing' ? currentResults.notFollowingBack : currentResults.following;

    elements.userList.innerHTML = users.map(user => \`
      <div class="user-item" data-screen-name="\${user.screenName}">
        <img class="user-avatar" src="\${user.profileImage || ''}" alt="\${user.name}" onerror="this.style.display='none'">
        <div class="user-info">
          <div class="user-name">
            <span class="user-display-name">\${user.name}</span>
            \${user.verified ? '<span class="user-verified">✓</span>' : ''}
          </div>
          <div class="user-screen-name">@\${user.screenName}</div>
        </div>
        <span class="user-status \${user.followedBy ? 'status-mutual' : 'status-not-following'}">\${user.followedBy ? '🟢' : '🔴'}</span>
        <span class="user-arrow">›</span>
      </div>
    \`).join('');

    elements.userList.querySelectorAll('.user-item').forEach(item => {
      item.addEventListener('click', () => window.open('https://x.com/' + item.dataset.screenName));
    });
  }

  function exportData(format) {
    if (!currentResults) return;
    const users = currentFilter === 'all' ? currentResults.following : currentFilter === 'mutual' ? currentResults.mutual : currentResults.notFollowingBack;
    let content, filename, mimeType;

    if (format === 'csv') {
      const headers = ['Screen Name', 'Display Name', 'Follows Back', 'Verified'];
      const rows = users.map(u => [u.screenName, u.name.replace(/,/g, ' '), u.followedBy ? 'Yes' : 'No', u.verified ? 'Yes' : 'No']);
      content = [headers, ...rows].map(row => row.join(',')).join('\\n');
      filename = 'x-follow-check-' + currentFilter + '-' + Date.now() + '.csv';
      mimeType = 'text/csv';
    } else {
      content = JSON.stringify({ exportDate: new Date().toISOString(), filter: currentFilter, count: users.length, users }, null, 2);
      filename = 'x-follow-check-' + currentFilter + '-' + Date.now() + '.json';
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  function hideAllSections() {
    elements.progressSection.classList.add('hidden');
    elements.errorSection.classList.add('hidden');
    elements.resultsSection.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
  }

  function showSection(section) { section.classList.remove('hidden'); }

  function updateUI() {
    hideAllSections();
    if (currentResults) showResults();
    else showSection(elements.emptyState);
  }

  function updateTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
  }
})();
  </script>
</body>
</html>`;

// Write main file
fs.writeFileSync(path.join(DIST_DIR, 'index.html'), mainHtml);

console.log('✅ Build complete!');
console.log('');
console.log('Output files:');
console.log('  dist/index.html - Standalone web version');
console.log('');
console.log('Note: The web version requires users to manually input their');
console.log('CSRF token (ct0 cookie) from X.com due to browser security.');
console.log('');
console.log('For the best experience, recommend users install the Chrome Extension.');
