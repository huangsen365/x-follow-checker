// Popup UI logic for X Follow Checker

import { t, setLanguage, getLanguage, getAvailableLanguages } from '../utils/i18n.js';
import * as storage from '../utils/storage.js';
import { saveQueryIds } from '../utils/api.js';

// DOM Elements
const elements = {
  langSelect: null,
  screenNameInput: null,
  detectBtn: null,
  startBtn: null,
  recentDropdown: null,
  recentList: null,
  clearHistoryBtn: null,
  detectTip: null,
  progressSection: null,
  progressFill: null,
  progressText: null,
  errorSection: null,
  errorTitle: null,
  errorMessage: null,
  errorHint: null,
  errorActionBtn: null,
  reportIssueBtn: null,
  resultsSection: null,
  limitWarning: null,
  limitWarningText: null,
  limitWarningLink: null,
  continueCheckBtn: null,
  totalCount: null,
  mutualCount: null,
  notFollowingCount: null,
  exportCsvBtn: null,
  exportJsonBtn: null,
  draftMessageBtn: null,
  draftSection: null,
  closeDraftBtn: null,
  draftTextarea: null,
  copyMessageBtn: null,
  filterTabs: null,
  userList: null,
  lastCheckInfo: null,
  emptyState: null,
  versionInfo: null,
  updateLink: null,
  updateMessage: null
};

// State
let currentResults = null;
let currentFilter = 'all';
let isChecking = false;

// Initialize
console.log('[Popup] Script loaded');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Popup] DOMContentLoaded fired');

  try {
    initElements();
    console.log('[Popup] Elements initialized');
    console.log('[Popup] versionInfo element:', elements.versionInfo);

    await initLanguage();
    console.log('[Popup] Language initialized');

    await loadRecentUsernames();
    console.log('[Popup] Recent usernames loaded');

    await loadCachedResults();
    console.log('[Popup] Cached results loaded');

    setupEventListeners();
    console.log('[Popup] Event listeners set up');

    // Check if a check is currently running in background
    await checkRunningStatus();
    console.log('[Popup] Running status checked');

    updateUI();
    console.log('[Popup] UI updated');

    console.log('[Popup] About to call checkForUpdates...');
    checkForUpdates();
    console.log('[Popup] checkForUpdates called');
  } catch (error) {
    console.error('[Popup] Initialization error:', error);
  }
});

function initElements() {
  elements.langSelect = document.getElementById('langSelect');
  elements.screenNameInput = document.getElementById('screenNameInput');
  elements.detectBtn = document.getElementById('detectBtn');
  elements.startBtn = document.getElementById('startBtn');
  elements.recentDropdown = document.getElementById('recentDropdown');
  elements.recentList = document.getElementById('recentList');
  elements.clearHistoryBtn = document.getElementById('clearHistoryBtn');
  elements.detectTip = document.getElementById('detectTip');
  elements.progressSection = document.getElementById('progressSection');
  elements.progressFill = document.getElementById('progressFill');
  elements.progressText = document.getElementById('progressText');
  elements.errorSection = document.getElementById('errorSection');
  elements.errorTitle = document.getElementById('errorTitle');
  elements.errorMessage = document.getElementById('errorMessage');
  elements.errorHint = document.getElementById('errorHint');
  elements.errorActionBtn = document.getElementById('errorActionBtn');
  elements.reportIssueBtn = document.getElementById('reportIssueBtn');
  elements.resultsSection = document.getElementById('resultsSection');
  elements.limitWarning = document.getElementById('limitWarning');
  elements.limitWarningText = document.getElementById('limitWarningText');
  elements.limitWarningLink = document.getElementById('limitWarningLink');
  elements.continueCheckBtn = document.getElementById('continueCheckBtn');
  elements.totalCount = document.getElementById('totalCount');
  elements.mutualCount = document.getElementById('mutualCount');
  elements.notFollowingCount = document.getElementById('notFollowingCount');
  elements.exportCsvBtn = document.getElementById('exportCsvBtn');
  elements.exportJsonBtn = document.getElementById('exportJsonBtn');
  elements.draftMessageBtn = document.getElementById('draftMessageBtn');
  elements.draftSection = document.getElementById('draftSection');
  elements.closeDraftBtn = document.getElementById('closeDraftBtn');
  elements.draftTextarea = document.getElementById('draftTextarea');
  elements.copyMessageBtn = document.getElementById('copyMessageBtn');
  elements.goPostHint = document.getElementById('goPostHint');
  elements.filterTabs = document.querySelectorAll('.filter-tab');
  elements.userList = document.getElementById('userList');
  elements.lastCheckInfo = document.getElementById('lastCheckInfo');
  elements.emptyState = document.getElementById('emptyState');
  elements.versionInfo = document.getElementById('versionInfo');
  elements.updateLink = document.getElementById('updateLink');
  elements.updateMessage = document.getElementById('updateMessage');
  elements.serverNotification = document.getElementById('serverNotification');
}

async function initLanguage() {
  const savedLang = await storage.getLanguage();
  setLanguage(savedLang);
  elements.langSelect.value = savedLang;
  updateTranslations();
}

function setupEventListeners() {
  // Language change
  elements.langSelect.addEventListener('change', async (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    await storage.setLanguage(lang);
    updateTranslations();
  });

  // Detect username button
  elements.detectBtn.addEventListener('click', handleDetectUsername);

  // Start check button
  elements.startBtn.addEventListener('click', handleStartCheck);

  // Keyboard navigation for recent list
  elements.screenNameInput.addEventListener('keydown', (e) => {
    const dropdown = elements.recentDropdown;
    const isDropdownVisible = !dropdown.classList.contains('hidden');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (isDropdownVisible) {
        navigateRecentList(1);
      } else {
        showRecentDropdown(elements.screenNameInput.value);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isDropdownVisible) {
        navigateRecentList(-1);
      }
    } else if (e.key === 'Enter') {
      if (isDropdownVisible && selectedIndex >= 0) {
        e.preventDefault();
        selectCurrentItem();
      } else if (!isChecking) {
        hideRecentDropdown();
        handleStartCheck();
      }
    } else if (e.key === 'Escape') {
      hideRecentDropdown();
    }
  });

  // Show recent dropdown on input focus
  elements.screenNameInput.addEventListener('focus', () => {
    showRecentDropdown(elements.screenNameInput.value);
  });

  // Filter recent list as user types, and update UI when input changes
  elements.screenNameInput.addEventListener('input', (e) => {
    showRecentDropdown(e.target.value);
    const inputValue = e.target.value.trim();

    if (!inputValue) {
      // Hide results if input is cleared
      hideAllSections();
      showSection(elements.emptyState);
    } else {
      // Check if typed username matches cached results
      showResultsIfCached(inputValue);
    }
  });

  // Hide dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.input-wrapper')) {
      hideRecentDropdown();
    }
  });

  // Clear history button
  elements.clearHistoryBtn.addEventListener('click', handleClearHistory);

  // Export buttons
  elements.exportCsvBtn.addEventListener('click', () => exportData('csv'));
  elements.exportJsonBtn.addEventListener('click', () => exportData('json'));

  // Continue check button
  elements.continueCheckBtn.addEventListener('click', handleContinueCheck);

  // Draft message buttons
  elements.draftMessageBtn.addEventListener('click', showDraftSection);
  elements.closeDraftBtn.addEventListener('click', hideDraftSection);
  elements.copyMessageBtn.addEventListener('click', copyMessage);

  // Filter tabs
  elements.filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const filter = tab.dataset.filter;
      setFilter(filter);
    });
  });

  // Listen for progress updates from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'PROGRESS_UPDATE') {
      handleProgressUpdate(message);
    }
  });
}

// Recent usernames state
let recentUsernames = [];
let selectedIndex = -1; // For keyboard navigation

async function loadRecentUsernames() {
  recentUsernames = await storage.getRecentUsernames();
  console.log('[RecentUsernames] Loaded:', recentUsernames);

  // Pre-fill with last selected username, or fall back to most recent from history
  if (!elements.screenNameInput.value) {
    const lastSelected = await storage.getLastSelectedUsername();
    console.log('[RecentUsernames] Last selected username:', lastSelected);

    if (lastSelected) {
      elements.screenNameInput.value = lastSelected;
      console.log('[RecentUsernames] Pre-filled input with last selected:', lastSelected);
    } else if (recentUsernames.length > 0) {
      elements.screenNameInput.value = recentUsernames[0];
      console.log('[RecentUsernames] Pre-filled input with most recent:', recentUsernames[0]);
    }
  }
}

function showRecentDropdown(filterText = '') {
  if (recentUsernames.length === 0) return;

  const filtered = filterRecentUsernames(filterText);
  if (filtered.length === 0) {
    hideRecentDropdown();
    return;
  }

  selectedIndex = -1; // Reset selection
  renderRecentList(filtered);
  elements.recentDropdown.classList.remove('hidden');
}

function hideRecentDropdown() {
  elements.recentDropdown.classList.add('hidden');
  selectedIndex = -1;
}

function navigateRecentList(direction) {
  const items = elements.recentList.querySelectorAll('.recent-item');
  if (items.length === 0) return;

  // Remove current selection
  items.forEach(item => item.classList.remove('selected'));

  // Calculate new index
  selectedIndex += direction;
  if (selectedIndex < 0) selectedIndex = items.length - 1;
  if (selectedIndex >= items.length) selectedIndex = 0;

  // Add selection to new item
  items[selectedIndex].classList.add('selected');
  items[selectedIndex].scrollIntoView({ block: 'nearest' });
}

function selectCurrentItem() {
  const items = elements.recentList.querySelectorAll('.recent-item');
  console.log('[Keyboard] selectCurrentItem called, selectedIndex:', selectedIndex);
  if (selectedIndex >= 0 && selectedIndex < items.length) {
    const username = items[selectedIndex].dataset.username;
    console.log('[Keyboard] Selected username:', username);
    elements.screenNameInput.value = username;
    hideRecentDropdown();

    // Save as last selected username
    storage.setLastSelectedUsername(username);
    console.log('[Keyboard] Saved last selected username:', username);

    // Show cached results if available for this username
    console.log('[Keyboard] Calling showResultsIfCached...');
    showResultsIfCached(username);
  }
}

function filterRecentUsernames(filterText) {
  if (!filterText) return recentUsernames;

  const query = filterText.toLowerCase().replace('@', '');
  return recentUsernames.filter(username =>
    username.toLowerCase().startsWith(query)
  );
}

function renderRecentList(usernames) {
  elements.recentList.innerHTML = usernames.map(username => `
    <div class="recent-item" data-username="${username}">
      <span class="recent-item-text">${username}</span>
      <button class="recent-item-delete" data-username="${username}" title="Delete">×</button>
    </div>
  `).join('');

  // Add click handlers for selecting username
  elements.recentList.querySelectorAll('.recent-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // Don't trigger if clicking on delete button
      if (e.target.classList.contains('recent-item-delete')) return;

      const selectedUsername = item.dataset.username;
      console.log('[RecentList] Clicked on username:', selectedUsername);
      elements.screenNameInput.value = selectedUsername;
      hideRecentDropdown();

      // Save as last selected username
      storage.setLastSelectedUsername(selectedUsername);
      console.log('[RecentList] Saved last selected username:', selectedUsername);

      // Check if we have cached results for this username - show immediately if match
      console.log('[RecentList] Calling showResultsIfCached...');
      showResultsIfCached(selectedUsername);
    });
  });

  // Add click handlers for delete buttons
  elements.recentList.querySelectorAll('.recent-item-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation(); // Prevent triggering the parent click
      const usernameToDelete = btn.dataset.username;

      // Confirm before deleting
      if (!confirm(t('confirmDeleteUsername', { username: usernameToDelete }))) {
        return;
      }

      console.log('[RecentList] Deleting username:', usernameToDelete);

      // Delete username and all related data
      const updatedList = await storage.deleteUsername(usernameToDelete);
      recentUsernames = updatedList;

      // Clear input and results if deleted username was current
      const currentInput = elements.screenNameInput.value.trim().toLowerCase();
      if (currentInput === usernameToDelete.toLowerCase()) {
        elements.screenNameInput.value = '';
        currentResults = null;
        hideAllSections();
        showSection(elements.emptyState);
      }

      // Re-render the list or hide if empty
      if (recentUsernames.length === 0) {
        hideRecentDropdown();
      } else {
        renderRecentList(filterRecentUsernames(elements.screenNameInput.value));
      }
    });
  });
}

// Show cached results immediately if available for this username
async function showResultsIfCached(username) {
  const normalizedInput = username.toLowerCase().replace('@', '');

  console.log('[Cache] showResultsIfCached called with:', username);
  console.log('[Cache] normalizedInput:', normalizedInput);

  // Try to get cached results for this specific username
  const cached = await storage.getCachedResults(normalizedInput);
  console.log('[Cache] Cached results for', normalizedInput, ':', cached ? 'found' : 'not found');

  if (cached) {
    currentResults = cached;
    console.log('[Cache] ✅ Found cached results for:', username);
    console.log('[Cache] Stats:', cached.stats);
    showResults();
  } else {
    // No cache for this username - show empty state
    console.log('[Cache] ❌ No cached results for:', normalizedInput);
    hideAllSections();
    showSection(elements.emptyState);
  }
}

async function handleClearHistory() {
  if (confirm(t('clearHistoryConfirm'))) {
    // Clear all user data from storage for privacy
    await storage.clearAllUserData();

    // Clear in-memory data
    recentUsernames = [];
    currentResults = null;

    // Update UI
    hideRecentDropdown();
    hideAllSections();
    showSection(elements.emptyState);
    elements.screenNameInput.value = '';
    elements.lastCheckInfo.textContent = '';
  }
}

async function handleDetectUsername() {
  console.log('[Detect] Starting username detection...');

  const detectBtn = elements.detectBtn;
  const originalText = detectBtn.textContent;

  // Hide any previous tip
  hideDetectTip();

  // Check if chrome.runtime is available (extension context)
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
    console.log('[Detect] Not in extension context');
    showDetectTip('error');
    return;
  }

  // Update button state
  detectBtn.textContent = t('detecting');
  detectBtn.disabled = true;
  detectBtn.classList.add('detecting');

  try {
    const response = await chrome.runtime.sendMessage({ type: 'DETECT_USERNAME' });
    console.log('[Detect] Response:', response);

    if (response.success) {
      // Fill in the username
      elements.screenNameInput.value = response.data.screenName;
      console.log('[Detect] Username detected:', response.data.screenName);

      // Hide tip on success
      hideDetectTip();

      // Brief success feedback
      detectBtn.textContent = t('detectSuccess');
      setTimeout(() => {
        detectBtn.textContent = originalText;
        detectBtn.disabled = false;
        detectBtn.classList.remove('detecting');
      }, 1500);
    } else {
      console.log('[Detect] Failed:', response.error);

      // Show appropriate error tip
      if (response.error.type === 'NOT_AUTHENTICATED') {
        showDetectTip('notLoggedIn');
      } else {
        showDetectTip('error');
      }

      detectBtn.textContent = originalText;
      detectBtn.disabled = false;
      detectBtn.classList.remove('detecting');
    }
  } catch (error) {
    console.error('[Detect] Error:', error);
    showDetectTip('error');
    detectBtn.textContent = originalText;
    detectBtn.disabled = false;
    detectBtn.classList.remove('detecting');
  }
}

function showDetectTip(type) {
  const tip = elements.detectTip;

  if (type === 'notLoggedIn') {
    // Create clickable login link
    const loginLink = `<a href="https://x.com/login" target="_blank">${t('loginToX')}</a>`;
    tip.innerHTML = t('detectTipNotLoggedIn', { loginLink: loginLink });
  } else {
    tip.textContent = t('detectTipError');
  }

  tip.classList.remove('hidden');
}

function hideDetectTip() {
  elements.detectTip.classList.add('hidden');
}

async function handleStartCheck() {
  const screenName = elements.screenNameInput.value.trim().replace('@', '');

  if (!screenName) {
    showError('INPUT_REQUIRED', t('usernameRequired'), t('usernameRequiredDesc'));
    return;
  }

  hideRecentDropdown();

  if (isChecking) {
    // Stop current check
    chrome.runtime.sendMessage({ type: 'STOP_CHECK' });
    setCheckingState(false);
    await updateUI();
    return;
  }

  // Save as last selected username when starting check
  await storage.setLastSelectedUsername(screenName);
  console.log('[StartCheck] Saved last selected username:', screenName);

  setCheckingState(true);
  hideAllSections();

  // Reset progress bar before showing
  elements.progressFill.style.width = '0%';
  showSection(elements.progressSection);
  updateProgress(5, t('loading'));

  let cancelled = false;

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'START_CHECK',
      screenName: screenName
    });

    if (response.success) {
      currentResults = response.data;
      // Save username to history on successful check
      await storage.addRecentUsername(screenName);
      recentUsernames = await storage.getRecentUsernames();
      showResults();
    } else if (response.error?.message === 'Check cancelled') {
      cancelled = true;
    } else {
      showError(
        response.error.type,
        getErrorTitle(response.error.type),
        response.error.message
      );
    }
  } catch (error) {
    showError('error', t('error'), error.message);
  } finally {
    setCheckingState(false);
    if (cancelled) {
      await updateUI();
    }
  }
}

async function handleContinueCheck() {
  if (isChecking) return;

  // Get current count before continuing
  const existingCount = currentResults?.stats?.total || 0;

  // Update button state to show loading
  const continueBtn = elements.continueCheckBtn;
  const originalText = continueBtn.textContent;
  continueBtn.innerHTML = `<span class="spinner-small"></span>${t('checking')}`;
  continueBtn.disabled = true;

  setCheckingState(true);

  // Show progress section with current count
  hideAllSections();
  // Reset progress bar before showing
  elements.progressFill.style.width = '0%';
  showSection(elements.progressSection);
  updateProgress(5, t('continuingFrom', { count: existingCount }));

  let cancelled = false;

  try {
    // Get current username from input or cached results
    const username = elements.screenNameInput.value.trim().replace('@', '') ||
                     currentResults?.user?.screenName;

    const response = await chrome.runtime.sendMessage({
      type: 'CONTINUE_CHECK',
      username: username
    });

    if (response.success) {
      currentResults = response.data;
      showResults();
    } else if (response.error?.message === 'Check cancelled') {
      cancelled = true;
    } else {
      showError(
        response.error.type,
        getErrorTitle(response.error.type),
        response.error.message
      );
    }
  } catch (error) {
    showError('error', t('error'), error.message);
  } finally {
    setCheckingState(false);
    continueBtn.textContent = originalText;
    continueBtn.disabled = false;
    if (cancelled) {
      await updateUI();
    }
  }
}

function handleProgressUpdate(message) {
  switch (message.status) {
    case 'getting_user_info':
      updateProgress(5, t('loading'));
      break;

    case 'fetching_following':
      // Calculate progress based on current batch (max 1000 per batch)
      let progressPercent;

      if (message.loaded <= 1000) {
        // First batch: progress toward min(totalEstimate, 1000)
        const target = Math.min(message.totalEstimate || 1000, 1000);
        progressPercent = (message.loaded / target) * 100;
      } else {
        // Continue batch: progress within this batch of 1000
        // loaded is cumulative, so use modulo to get progress in current batch
        const remainder = message.loaded % 1000;
        // If remainder is 0, we just hit a boundary (1000, 2000, etc.) = 100%
        progressPercent = remainder === 0 ? 100 : (remainder / 1000) * 100;
      }

      // Cap at 95% until complete
      const percent = Math.min(95, progressPercent);
      updateProgress(percent, t('loadingProgress', { count: message.loaded }));
      break;

    case 'completed':
      currentResults = message.results;
      // Save username to history on successful check
      if (currentResults?.user?.screenName) {
        storage.addRecentUsername(currentResults.user.screenName).then(() => {
          storage.getRecentUsernames().then(usernames => {
            recentUsernames = usernames;
          });
        });
      }
      showResults();
      setCheckingState(false);
      break;

    case 'error':
      showError(
        message.error.type,
        getErrorTitle(message.error.type),
        message.error.message
      );
      setCheckingState(false);
      break;
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
  } else {
    btnText.classList.remove('hidden');
    btnLoading.classList.add('hidden');
    elements.screenNameInput.disabled = false;
  }
}

function updateProgress(percent, text) {
  elements.progressFill.style.width = `${percent}%`;
  elements.progressText.textContent = text;
}

function showError(type, title, message) {
  hideAllSections();
  showSection(elements.errorSection);

  elements.errorTitle.textContent = title;
  elements.errorMessage.textContent = message;

  // Reset buttons and hint
  elements.errorActionBtn.classList.add('hidden');
  elements.reportIssueBtn.classList.add('hidden');
  elements.errorHint.classList.add('hidden');

  if (type === 'INPUT_REQUIRED') {
    return;
  }

  // Show action button for specific errors
  if (type === 'NOT_AUTHENTICATED') {
    elements.errorActionBtn.textContent = t('openX');
    elements.errorActionBtn.classList.remove('hidden');
    elements.errorActionBtn.onclick = () => {
      chrome.tabs.create({ url: 'https://x.com/login' });
    };
    // Show username input reminder
    elements.errorHint.textContent = t('alsoInputUsername');
    elements.errorHint.classList.remove('hidden');
  } else if (type === 'RATE_LIMITED') {
    elements.errorActionBtn.textContent = t('retry');
    elements.errorActionBtn.classList.remove('hidden');
    elements.errorActionBtn.onclick = handleStartCheck;
  } else {
    // For unexpected errors (API_ERROR, NETWORK_ERROR, etc.)
    elements.errorActionBtn.textContent = t('retry');
    elements.errorActionBtn.classList.remove('hidden');
    elements.errorActionBtn.onclick = handleStartCheck;

    // Show report issue button for unexpected errors
    elements.reportIssueBtn.classList.remove('hidden');
    elements.reportIssueBtn.onclick = () => {
      const issueTitle = encodeURIComponent(`Error: ${message}`);
      const issueBody = encodeURIComponent(`**Error Type:** ${type}\n**Error Message:** ${message}\n\n**Steps to reproduce:**\n1. \n\n**Browser:** ${navigator.userAgent}`);
      chrome.tabs.create({
        url: `https://github.com/huangsen365/x-follow-checker/issues/new?title=${issueTitle}&body=${issueBody}`
      });
    };
  }
}

function getErrorTitle(errorType) {
  const titles = {
    NOT_AUTHENTICATED: t('notLoggedIn'),
    RATE_LIMITED: t('rateLimited'),
    NETWORK_ERROR: t('networkError')
  };
  return titles[errorType] || t('error');
}

function showResults() {
  hideAllSections();
  showSection(elements.resultsSection);

  if (!currentResults) return;

  // Show/hide limit warning and continue button
  if (currentResults.hitLimit) {
    elements.limitWarningText.textContent = t('limitReached');
    elements.limitWarningLink.textContent = t('requestMoreQuota');

    // Show continue button if there's more data to fetch
    if (currentResults.hasMore) {
      elements.continueCheckBtn.classList.remove('hidden');
      elements.continueCheckBtn.textContent = t('continueCheck');
    } else {
      elements.continueCheckBtn.classList.add('hidden');
    }

    // Create GitHub issue URL with prefilled content
    const issueTitle = encodeURIComponent('Request: Extra Quota for More Than 1000 Users');
    const issueBody = encodeURIComponent(`## Request for Extra Quota

**Username:** @${currentResults.user?.screenName || 'unknown'}
**Following Count:** ${currentResults.user?.followingCount || 'unknown'}
**Currently Loaded:** ${currentResults.stats?.total || 'unknown'}

### Reason
I need to check more than 1,000 following users.

### Additional Information
(Please describe why you need extra quota)

`);
    elements.limitWarningLink.href = `https://github.com/huangsen365/x-follow-checker/issues/new?title=${issueTitle}&body=${issueBody}`;
    elements.limitWarning.classList.remove('hidden');

    // Expand popup height to accommodate warning
    document.body.classList.add('limit-warning-visible');
    document.querySelector('.container').classList.add('limit-warning-visible');
  } else {
    elements.limitWarning.classList.add('hidden');
    elements.continueCheckBtn.classList.add('hidden');

    // Restore normal popup height
    document.body.classList.remove('limit-warning-visible');
    document.querySelector('.container').classList.remove('limit-warning-visible');
  }

  // Update stats
  elements.totalCount.textContent = currentResults.stats.total;
  elements.mutualCount.textContent = currentResults.stats.mutualCount;
  elements.notFollowingCount.textContent = currentResults.stats.notFollowingBackCount;

  // Update last check info
  const lastCheck = currentResults.timestamp ? new Date(currentResults.timestamp) : new Date();
  elements.lastCheckInfo.textContent = t('lastChecked', {
    time: lastCheck.toLocaleString()
  });

  // Render user list
  renderUserList();
}

function setFilter(filter) {
  currentFilter = filter;

  elements.filterTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === filter);
  });

  renderUserList();
}

function renderUserList() {
  if (!currentResults) return;

  let users;
  switch (currentFilter) {
    case 'mutual':
      users = currentResults.mutual;
      break;
    case 'notFollowing':
      users = currentResults.notFollowingBack;
      break;
    default:
      users = currentResults.following;
  }

  elements.userList.innerHTML = users.map(user => `
    <div class="user-item" data-screen-name="${user.screenName}">
      <img
        class="user-avatar"
        src="${user.profileImage || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><circle fill=%22%23cfd9de%22 cx=%2220%22 cy=%2220%22 r=%2220%22/></svg>'}"
        alt="${user.name}"
        onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><circle fill=%22%23cfd9de%22 cx=%2220%22 cy=%2220%22 r=%2220%22/></svg>'"
      >
      <div class="user-info">
        <div class="user-name">
          <span class="user-display-name">${escapeHtml(user.name)}</span>
          ${user.verified ? '<span class="user-verified">✓</span>' : ''}
        </div>
        <div class="user-screen-name">@${user.screenName}</div>
      </div>
      <span class="user-status ${user.followedBy ? 'status-mutual' : 'status-not-following'}">
        ${user.followedBy ? '🟢' : '🔴'}
      </span>
      <span class="user-arrow">›</span>
    </div>
  `).join('');

  // Add click handlers to open profiles
  elements.userList.querySelectorAll('.user-item').forEach(item => {
    item.addEventListener('click', () => {
      const screenName = item.dataset.screenName;
      chrome.tabs.create({ url: `https://x.com/${screenName}` });
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function loadCachedResults() {
  console.log('[LoadCache] Loading cached results...');
  try {
    // Get the username from input (already pre-filled by loadRecentUsernames)
    const username = elements.screenNameInput.value.trim().replace('@', '');
    console.log('[LoadCache] Current input username:', username);

    if (username) {
      // Load cached results for this specific username
      const cached = await storage.getCachedResults(username);
      console.log('[LoadCache] Cached results for', username, ':', cached ? 'found' : 'not found');

      if (cached) {
        currentResults = cached;
        console.log('[LoadCache] ✅ Loaded cached results for user:', currentResults?.user?.screenName);
        console.log('[LoadCache] Stats:', currentResults?.stats);

        // Update last check info
        if (cached.timestamp) {
          const lastCheck = new Date(cached.timestamp);
          elements.lastCheckInfo.textContent = t('lastChecked', {
            time: lastCheck.toLocaleString()
          });
        }
      } else {
        console.log('[LoadCache] ❌ No cached results for:', username);
        currentResults = null;
      }
    } else {
      console.log('[LoadCache] No username in input, skipping cache load');
      currentResults = null;
    }
  } catch (error) {
    console.error('[LoadCache] Failed to load cached results:', error);
  }
}

// Check if a check is currently running in background
async function checkRunningStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    if (response.success && response.data) {
      const status = response.data.status;
      console.log('[Popup] Background status:', status);

      if (status === 'running') {
        // A check is in progress - show progress UI
        setCheckingState(true);
        hideAllSections();
        // Reset progress bar before showing to avoid stale width
        elements.progressFill.style.width = '0%';
        showSection(elements.progressSection);

        // Restore the username being checked (override any pre-filled value)
        const checkingUsername = response.data.screenName || response.data.user?.screenName;
        if (checkingUsername) {
          elements.screenNameInput.value = checkingUsername;
        }

        // Show current progress if available
        const progress = response.data.progress;
        const totalEstimate = response.data.totalEstimate || 0;

        if (progress && progress.loaded > 0) {
          // Use same calculation as handleProgressUpdate
          let progressPercent;
          const loaded = progress.loaded;

          if (loaded <= 1000) {
            // First batch: progress toward min(totalEstimate, 1000)
            const target = Math.min(totalEstimate || 1000, 1000);
            progressPercent = (loaded / target) * 100;
          } else {
            // Continue batch: progress within this batch of 1000
            const remainder = loaded % 1000;
            progressPercent = remainder === 0 ? 100 : (remainder / 1000) * 100;
          }

          const percent = Math.min(95, progressPercent);
          updateProgress(percent, t('loadingProgress', { count: loaded }));
        } else {
          updateProgress(5, t('loading'));
        }
      } else if (status === 'completed' && response.data.results) {
        // Check completed while popup was closed
        currentResults = response.data.results;
        // Restore the username from results
        if (currentResults.user?.screenName) {
          if (!elements.screenNameInput.value) {
            elements.screenNameInput.value = currentResults.user.screenName;
          }
          // Save username to history
          await storage.addRecentUsername(currentResults.user.screenName);
          recentUsernames = await storage.getRecentUsernames();
        }
      } else if (status === 'error' && response.data.error) {
        // Error occurred while popup was closed - show it
        showError(
          response.data.error.type,
          getErrorTitle(response.data.error.type),
          response.data.error.message
        );
      }
    }
  } catch (error) {
    console.error('Failed to check running status:', error);
  }
}

function exportData(format) {
  if (!currentResults) return;

  const users = currentFilter === 'all'
    ? currentResults.following
    : currentFilter === 'mutual'
      ? currentResults.mutual
      : currentResults.notFollowingBack;

  let content, filename, mimeType;

  if (format === 'csv') {
    const headers = ['Screen Name', 'Display Name', 'Follows Back', 'Verified'];
    const rows = users.map(u => [
      csvEscape(u.screenName),
      csvEscape(u.name),
      csvEscape(u.followedBy ? 'Yes' : 'No'),
      csvEscape(u.verified ? 'Yes' : 'No')
    ]);

    content = [headers.map(csvEscape), ...rows].map(row => row.join(',')).join('\n');
    filename = `x-follow-check-${currentFilter}-${Date.now()}.csv`;
    mimeType = 'text/csv';
  } else {
    content = JSON.stringify({
      exportDate: new Date().toISOString(),
      filter: currentFilter,
      count: users.length,
      users: users
    }, null, 2);
    filename = `x-follow-check-${currentFilter}-${Date.now()}.json`;
    mimeType = 'application/json';
  }

  // Download file
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function hideAllSections() {
  elements.progressSection.classList.add('hidden');
  elements.errorSection.classList.add('hidden');
  elements.resultsSection.classList.add('hidden');
  elements.emptyState.classList.add('hidden');
}

function showSection(section) {
  section.classList.remove('hidden');
}

async function updateUI() {
  // Don't update UI if a check is running
  if (isChecking) {
    return;
  }

  hideAllSections();

  const screenName = elements.screenNameInput.value.trim();

  if (!screenName) {
    showSection(elements.emptyState);
  } else {
    // Show cached results if available for this username
    await showResultsIfCached(screenName);
  }
}

function updateTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
}

// Draft Message Functions
function generateDraftMessage() {
  const nonFollowers = currentResults?.notFollowingBack || [];
  const mentions = nonFollowers
    .map(u => `@${u.screenName}`)
    .join(' ');

  const template = t('messageTemplate');
  return template.replace('{mentions}', mentions);
}

function showDraftSection() {
  elements.draftSection.classList.remove('hidden');
  elements.draftTextarea.value = generateDraftMessage();
  elements.draftTextarea.focus();

  // Auto-scroll to show the Copy button above sticky footer
  // Use multiple checks to ensure scroll is complete
  scrollToShowCopyButton();
}

// Smart scroll function that retries until element is visible above footer
function scrollToShowElement(element, attempts = 0) {
  const maxAttempts = 5;
  const container = document.querySelector('.container');
  const footer = document.querySelector('.footer');
  const footerHeight = footer ? footer.offsetHeight : 80;
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  const visibleBottom = containerRect.bottom - footerHeight;
  const elementBottom = elementRect.bottom;

  if (elementBottom > visibleBottom) {
    const scrollAmount = elementBottom - visibleBottom + 20; // Extra padding
    container.scrollBy({ top: scrollAmount, behavior: 'smooth' });

    // Check again after scroll animation completes
    if (attempts < maxAttempts) {
      setTimeout(() => scrollToShowElement(element, attempts + 1), 150);
    }
  }
}

// Scroll to show Copy button
function scrollToShowCopyButton() {
  scrollToShowElement(elements.copyMessageBtn);
}

function hideDraftSection() {
  elements.draftSection.classList.add('hidden');
  elements.goPostHint.classList.add('hidden');
}

async function copyMessage() {
  try {
    await navigator.clipboard.writeText(elements.draftTextarea.value);

    // Show "Copied!" feedback
    const copyBtn = elements.copyMessageBtn;
    const originalText = copyBtn.querySelector('.btn-copy-text').textContent;
    copyBtn.querySelector('.btn-copy-text').textContent = t('messageCopied');
    copyBtn.disabled = true;

    // Show "go post" hint with clickable button
    const goPostText = t('goPostMessage', { link: '' }).replace('{link}', '').trim();
    elements.goPostHint.innerHTML = `${goPostText}<br><a href="https://x.com/home" target="_blank">x.com/home →</a>`;
    elements.goPostHint.classList.remove('hidden');

    // Auto-scroll to make the hint fully visible above sticky footer
    scrollToShowElement(elements.goPostHint);

    setTimeout(() => {
      copyBtn.querySelector('.btn-copy-text').textContent = originalText;
      copyBtn.disabled = false;
    }, 2000);
  } catch (error) {
    console.error('Failed to copy:', error);
  }
}

// Version Check
const APP_VERSION = '1.0.0'; // Fallback version for web

async function checkForUpdates() {
  console.log('[VersionCheck] Starting version check...');

  try {
    // Get current version from manifest (Chrome extension) or fallback
    let currentVersion = APP_VERSION;
    console.log('[VersionCheck] Default version:', APP_VERSION);

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
      const manifest = chrome.runtime.getManifest();
      currentVersion = manifest.version;
      console.log('[VersionCheck] Got version from manifest:', currentVersion);
    } else {
      console.log('[VersionCheck] No manifest available, using fallback version');
    }

    // Show current version immediately
    console.log('[VersionCheck] Setting version info text:', `v${currentVersion}`);
    elements.versionInfo.textContent = `v${currentVersion}`;

    const apiUrl = `https://version-check.x-follow-checker.com/is-latest-version?v=${currentVersion}`;
    console.log('[VersionCheck] Fetching:', apiUrl);

    const response = await fetch(apiUrl);
    console.log('[VersionCheck] Response status:', response.status, response.statusText);

    if (!response.ok) {
      console.log('[VersionCheck] Response not OK, aborting');
      return;
    }

    const data = await response.json();
    console.log('[VersionCheck] API response data:', JSON.stringify(data, null, 2));
    console.log('[VersionCheck] isLatest value:', data.isLatest, 'type:', typeof data.isLatest);
    console.log('[VersionCheck] downloadUrl value:', data.downloadUrl);
    console.log('[VersionCheck] notificationMessage:', data.notificationMessage);

    // Show server notification if available (independent of version status)
    if (data.notificationMessage && data.notificationMessage.trim()) {
      console.log('[VersionCheck] Showing server notification');
      // Wrap in marquee span for scrolling animation
      elements.serverNotification.innerHTML = `<span class="marquee-content">${escapeHtml(data.notificationMessage)}</span>`;
      elements.serverNotification.classList.remove('hidden');
    }

    // Save query IDs if provided by server (for dynamic updates)
    if (data.queryIds && Object.keys(data.queryIds).length > 0) {
      console.log('[VersionCheck] Received query IDs from server:', data.queryIds);
      await saveQueryIds(data.queryIds);
    }

    // Handle isLatest as boolean true, string "true", or number 1
    const isLatest = data.isLatest === true || data.isLatest === 'true' || data.isLatest === 1;
    console.log('[VersionCheck] Computed isLatest:', isLatest);

    if (isLatest) {
      // Already on latest version
      console.log('[VersionCheck] Already on latest version - showing (latest)');
      const latestText = t('latestVersion');
      console.log('[VersionCheck] latestVersion translation:', latestText);
      elements.versionInfo.textContent = `v${currentVersion} ${latestText}`;
      elements.versionInfo.classList.add('version-latest');
      console.log('[VersionCheck] versionInfo text now:', elements.versionInfo.textContent);
    } else if (data.downloadUrl) {
      // New version available - show update link
      console.log('[VersionCheck] New version available:', data.latestVersion);
      elements.updateMessage.textContent = t('newVersionAvailable', {
        version: data.latestVersion || 'new'
      });
      elements.updateLink.href = data.downloadUrl;
      elements.updateLink.classList.remove('hidden');
    } else {
      // Unknown response format - just show version without status
      console.log('[VersionCheck] Unknown response format');
      console.log('[VersionCheck] isLatest =', data.isLatest, ', downloadUrl =', data.downloadUrl);
    }

    console.log('[VersionCheck] Completed successfully');
  } catch (error) {
    console.error('[VersionCheck] Error:', error);
    console.error('[VersionCheck] Error message:', error.message);
    console.error('[VersionCheck] Error stack:', error.stack);
  }
}
