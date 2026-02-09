// Side Panel UI logic for X Follow Checker

import { t, setLanguage } from '../utils/i18n.js';
import * as storage from '../utils/storage.js';
import { escapeHtml } from '../popup/formatters.js';

// DOM Elements
const elements = {
  langSelect: null,
  usernameInput: null,
  clearInput: null,
  loadBtn: null,
  btnText: null,
  btnLoading: null,
  progressSection: null,
  progressFill: null,
  progressText: null,
  statsSection: null,
  verifiedCount: null,
  followersList: null,
  browseSection: null,
  browseInfo: null,
  browsePrevBtn: null,
  browseNextBtn: null,
  paginationSection: null,
  prevBtn: null,
  nextBtn: null,
  pageInfo: null,
  emptyState: null,
  errorSection: null,
  errorTitle: null,
  errorMessage: null,
  retryBtn: null
};

// State
let currentUsername = '';
let currentPage = 1;
let allFollowers = [];
let loadedPages = [];
let hasMore = false;
let nextCursor = null;
let selectedFollowerIndex = -1;
let isLoading = false;
let userInfo = null;
let loadButtonMode = 'load'; // load | cache | refetch
let cachedFirstPage = null;
let cachedUsername = '';
let cacheCheckRequestId = 0;

// Initialize
console.log('[Side Panel] Script loaded');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Side Panel] DOMContentLoaded fired');

  try {
    initElements();
    console.log('[Side Panel] Elements initialized');

    await initLanguage();
    console.log('[Side Panel] Language initialized');

    await initAutoPopulate();
    console.log('[Side Panel] Auto-populate initialized');

    setupEventListeners();
    console.log('[Side Panel] Event listeners set up');

    updateUI();
  } catch (error) {
    console.error('[Side Panel] Initialization error:', error);
  }
});

function initElements() {
  elements.langSelect = document.getElementById('langSelect');
  elements.usernameInput = document.getElementById('usernameInput');
  elements.clearInput = document.getElementById('clearInput');
  elements.loadBtn = document.getElementById('loadBtn');
  elements.btnText = document.querySelector('.btn-text');
  elements.btnLoading = document.querySelector('.btn-loading');
  elements.progressSection = document.getElementById('progressSection');
  elements.progressFill = document.getElementById('progressFill');
  elements.progressText = document.getElementById('progressText');
  elements.statsSection = document.getElementById('statsSection');
  elements.verifiedCount = document.getElementById('verifiedCount');
  elements.followersList = document.getElementById('followersList');
  elements.browseSection = document.getElementById('browseSection');
  elements.browseInfo = document.getElementById('browseInfo');
  elements.browsePrevBtn = document.getElementById('browsePrevBtn');
  elements.browseNextBtn = document.getElementById('browseNextBtn');
  elements.paginationSection = document.getElementById('paginationSection');
  elements.prevBtn = document.getElementById('prevBtn');
  elements.nextBtn = document.getElementById('nextBtn');
  elements.pageInfo = document.getElementById('pageInfo');
  elements.emptyState = document.getElementById('emptyState');
  elements.errorSection = document.getElementById('errorSection');
  elements.errorTitle = document.getElementById('errorTitle');
  elements.errorMessage = document.getElementById('errorMessage');
  elements.retryBtn = document.getElementById('retryBtn');
}

async function initLanguage() {
  const savedLang = await storage.getLanguage();
  setLanguage(savedLang);
  elements.langSelect.value = savedLang;
  updateTranslations();
}

async function initAutoPopulate() {
  // Try to get the last selected username from popup
  const lastUsername = await storage.getLastSelectedUsername();
  if (lastUsername) {
    elements.usernameInput.value = lastUsername;
    currentUsername = lastUsername;
    updateInputClearState();
  }
  await refreshLoadButtonMode();
}

function setupEventListeners() {
  // Language change
  elements.langSelect.addEventListener('change', async (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    await storage.setLanguage(lang);
    updateTranslations();
  });

  // Clear input button
  elements.clearInput.addEventListener('click', () => {
    elements.usernameInput.value = '';
    currentUsername = '';
    resetFollowerState();
    cachedFirstPage = null;
    cachedUsername = '';
    setLoadButtonMode('load');
    updateUI();
    updateInputClearState();
    elements.usernameInput.focus();
  });

  // Input change
  elements.usernameInput.addEventListener('input', async () => {
    updateInputClearState();
    await refreshLoadButtonMode();
  });

  // Load button
  elements.loadBtn.addEventListener('click', onLoadButtonPressed);

  // Enter key in input
  elements.usernameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !isLoading) {
      onLoadButtonPressed();
    }
  });

  // Pagination buttons (page-level)
  elements.prevBtn.addEventListener('click', () => handlePagination('prev'));
  elements.nextBtn.addEventListener('click', () => handlePagination('next'));

  // Profile browse buttons (follower-level)
  elements.browsePrevBtn.addEventListener('click', () => handleProfileNavigation('prev'));
  elements.browseNextBtn.addEventListener('click', () => handleProfileNavigation('next'));

  // Retry button
  elements.retryBtn.addEventListener('click', () => handleLoadFollowers({ forceRefresh: true }));

  // Listen for progress updates from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'VERIFIED_FOLLOWERS_PROGRESS') {
      updateProgress(message.loaded, message.page);
    }
  });
}

function updateInputClearState() {
  const hasValue = elements.usernameInput.value.trim().length > 0;
  if (hasValue) {
    elements.clearInput.classList.remove('hidden');
  } else {
    elements.clearInput.classList.add('hidden');
  }
}

function onLoadButtonPressed() {
  handleLoadFollowers({ forceRefresh: loadButtonMode === 'refetch' });
}

function normalizeCachedFollowersData(cached, username) {
  if (!cached) return null;

  const followers = Array.isArray(cached.followers)
    ? cached.followers
    : Array.isArray(cached.users)
      ? cached.users
      : null;

  if (!followers) return null;

  return {
    user: cached.user || { screenName: username, name: username },
    followers: followers,
    hasMore: Boolean(cached.hasMore && cached.nextCursor),
    nextCursor: cached.nextCursor || null
  };
}

function setLoadButtonMode(mode) {
  loadButtonMode = mode;
  updateLoadButtonLabel();
}

function updateLoadButtonLabel() {
  let key = 'loadVerified';
  if (loadButtonMode === 'cache') {
    key = 'loadCachedVerified';
  } else if (loadButtonMode === 'refetch') {
    key = 'refetchVerified';
  }
  elements.btnText.textContent = t(key);
}

async function refreshLoadButtonMode() {
  const username = normalizeUsername(elements.usernameInput.value);
  const requestId = ++cacheCheckRequestId;

  if (!username) {
    cachedFirstPage = null;
    cachedUsername = '';
    setLoadButtonMode('load');
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_VERIFIED_FOLLOWERS_CACHE',
      username: username
    });

    if (requestId !== cacheCheckRequestId) {
      return;
    }

    const normalized = normalizeCachedFollowersData(response?.success ? response.data : null, username);
    cachedFirstPage = normalized;
    cachedUsername = normalized ? username : '';

    if (normalized) {
      // If current page is already loaded for this username, keep refetch mode.
      if (currentUsername === username && allFollowers.length > 0) {
        setLoadButtonMode('refetch');
      } else {
        setLoadButtonMode('cache');
      }
    } else {
      setLoadButtonMode('load');
    }
  } catch (error) {
    if (requestId !== cacheCheckRequestId) {
      return;
    }
    cachedFirstPage = null;
    cachedUsername = '';
    setLoadButtonMode('load');
  }
}

function applyFollowersData(username, data) {
  userInfo = data.user || { screenName: username, name: username };
  setCurrentPageData(1, data.followers, data.hasMore, data.nextCursor);

  if (allFollowers.length === 0 && !hasMore) {
    showNoResults();
    return;
  }
  showResults();
}

async function handleLoadFollowers({ forceRefresh = false } = {}) {
  console.log('[Side Panel] handleLoadFollowers called');
  if (isLoading) {
    console.log('[Side Panel] Already loading, ignoring');
    return;
  }

  const username = normalizeUsername(elements.usernameInput.value);
  console.log('[Side Panel] Username:', username);

  if (!username) {
    console.log('[Side Panel] No username provided');
    showError({
      type: 'VALIDATION_ERROR',
      message: 'Please enter a username'
    });
    return;
  }

  elements.usernameInput.value = username;
  currentUsername = username;
  resetFollowerState();

  const shouldUseCache = (
    !forceRefresh &&
    loadButtonMode === 'cache' &&
    cachedFirstPage &&
    cachedUsername === username
  );

  isLoading = true;
  showLoading();

  try {
    await storage.setLastSelectedUsername(username);

    if (shouldUseCache) {
      console.log('[Side Panel] Loading followers from cache');
      isLoading = false;
      applyFollowersData(username, cachedFirstPage);
      setLoadButtonMode('refetch');
      return;
    }

    console.log('[Side Panel] Sending LOAD_VERIFIED_FOLLOWERS message...');
    const response = await chrome.runtime.sendMessage({
      type: 'LOAD_VERIFIED_FOLLOWERS',
      username: username,
      cursor: null
    });

    console.log('[Side Panel] Received response:', response);
    isLoading = false;

    if (response && response.success) {
      console.log('[Side Panel] Success! Followers:', response.data.followers.length);
      cachedFirstPage = normalizeCachedFollowersData(response.data, username);
      cachedUsername = cachedFirstPage ? username : '';
      applyFollowersData(username, response.data);
      setLoadButtonMode('refetch');
    } else {
      console.error('[Side Panel] Error response:', response?.error);
      showError(response?.error || { type: 'API_ERROR', message: 'Unknown error' });
      await refreshLoadButtonMode();
    }
  } catch (error) {
    console.error('[Side Panel] Exception:', error);
    isLoading = false;
    showError({
      type: 'API_ERROR',
      message: error.message || 'Failed to load verified followers'
    });
    await refreshLoadButtonMode();
  }
}

async function handlePagination(direction) {
  if (isLoading) return;

  if (direction === 'prev') {
    if (currentPage <= 1) return;

    const previousPageData = loadedPages[currentPage - 2];
    if (!previousPageData) return;

    setCurrentPageData(
      currentPage - 1,
      previousPageData.followers,
      previousPageData.hasMore,
      previousPageData.nextCursor,
      -1
    );
    showResults();
    return;
  }

  // If next page is already cached, switch instantly without API call.
  const cachedNextPage = loadedPages[currentPage];
  if (cachedNextPage) {
    setCurrentPageData(
      currentPage + 1,
      cachedNextPage.followers,
      cachedNextPage.hasMore,
      cachedNextPage.nextCursor,
      -1
    );
    showResults();
    return;
  }

  if (!hasMore || !nextCursor) return;

  isLoading = true;
  showLoading();

  try {
    const targetPage = currentPage + 1;
    const response = await chrome.runtime.sendMessage({
      type: 'LOAD_VERIFIED_FOLLOWERS',
      username: currentUsername,
      cursor: nextCursor
    });

    isLoading = false;

    if (response?.success) {
      setCurrentPageData(
        targetPage,
        response.data.followers,
        response.data.hasMore,
        response.data.nextCursor,
        -1
      );
      showResults();
    } else {
      showError(response?.error || { type: 'API_ERROR', message: 'Unknown error' });
    }
  } catch (error) {
    isLoading = false;
    showError({
      type: 'API_ERROR',
      message: error.message || 'Failed to load next page'
    });
  }
}

async function handleProfileNavigation(direction) {
  if (isLoading) return;

  if (direction === 'prev') {
    if (selectedFollowerIndex > 0) {
      selectedFollowerIndex--;
      updateSelectedFollowerCard();
      updateBrowseUI();
      await openSelectedFollowerInCurrentTab();
      return;
    }

    if (selectedFollowerIndex < 0 || currentPage <= 1) return;

    const previousPageData = loadedPages[currentPage - 2];
    if (!previousPageData || previousPageData.followers.length === 0) return;

    setCurrentPageData(
      currentPage - 1,
      previousPageData.followers,
      previousPageData.hasMore,
      previousPageData.nextCursor,
      previousPageData.followers.length - 1
    );
    showResults();
    await openSelectedFollowerInCurrentTab();
    return;
  }

  // Next profile: if nothing selected yet, start from first follower.
  if (selectedFollowerIndex < 0 && allFollowers.length > 0) {
    selectedFollowerIndex = 0;
    updateSelectedFollowerCard();
    updateBrowseUI();
    await openSelectedFollowerInCurrentTab();
    return;
  }

  if (selectedFollowerIndex >= 0 && selectedFollowerIndex < allFollowers.length - 1) {
    selectedFollowerIndex++;
    updateSelectedFollowerCard();
    updateBrowseUI();
    await openSelectedFollowerInCurrentTab();
    return;
  }

  if (selectedFollowerIndex < 0) return;

  const cachedNextPage = loadedPages[currentPage];
  if (cachedNextPage && cachedNextPage.followers.length > 0) {
    setCurrentPageData(
      currentPage + 1,
      cachedNextPage.followers,
      cachedNextPage.hasMore,
      cachedNextPage.nextCursor,
      0
    );
    showResults();
    await openSelectedFollowerInCurrentTab();
    return;
  }

  if (!hasMore || !nextCursor) return;

  isLoading = true;
  showLoading();

  try {
    const targetPage = currentPage + 1;
    const response = await chrome.runtime.sendMessage({
      type: 'LOAD_VERIFIED_FOLLOWERS',
      username: currentUsername,
      cursor: nextCursor
    });

    isLoading = false;

    if (response?.success) {
      const followers = response.data.followers || [];
      setCurrentPageData(
        targetPage,
        followers,
        response.data.hasMore,
        response.data.nextCursor,
        followers.length > 0 ? 0 : -1
      );
      showResults();

      if (followers.length > 0) {
        await openSelectedFollowerInCurrentTab();
      }
    } else {
      showError(response?.error || { type: 'API_ERROR', message: 'Unknown error' });
    }
  } catch (error) {
    isLoading = false;
    showError({
      type: 'API_ERROR',
      message: error.message || 'Failed to load next page'
    });
  }
}

function normalizeUsername(input) {
  return input.trim().replace(/^@+/, '');
}

function resetFollowerState() {
  currentPage = 1;
  allFollowers = [];
  loadedPages = [];
  hasMore = false;
  nextCursor = null;
  selectedFollowerIndex = -1;
  userInfo = null;
}

function setCurrentPageData(page, followers, pageHasMore, pageNextCursor, selectedIndex = -1) {
  const safeFollowers = Array.isArray(followers) ? followers : [];
  const safeNextCursor = pageNextCursor || null;
  const safeHasMore = Boolean(pageHasMore && safeNextCursor);

  loadedPages[page - 1] = {
    followers: safeFollowers,
    hasMore: safeHasMore,
    nextCursor: safeNextCursor
  };

  currentPage = page;
  allFollowers = safeFollowers;
  hasMore = safeHasMore;
  nextCursor = safeNextCursor;
  if (safeFollowers.length === 0 || selectedIndex < 0) {
    selectedFollowerIndex = -1;
    return;
  }
  selectedFollowerIndex = Math.min(selectedIndex, safeFollowers.length - 1);
}

function updateSelectedFollowerCard() {
  const cards = elements.followersList.querySelectorAll('.follower-card');
  cards.forEach((card, index) => {
    if (index === selectedFollowerIndex) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });
}

async function openSelectedFollowerInCurrentTab() {
  const follower = allFollowers[selectedFollowerIndex];
  if (!follower?.screenName) return;
  await openFollowerInCurrentTab(follower.screenName);
}

async function openFollowerInCurrentTab(screenName) {
  const url = `https://x.com/${screenName}`;

  try {
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (activeTab?.id) {
      await chrome.tabs.update(activeTab.id, { url, active: true });
      return;
    }
  } catch (error) {
    console.warn('[Side Panel] Failed to update current tab, opening a new tab instead:', error);
  }

  await chrome.tabs.create({ url, active: true });
}

function showLoading() {
  hideAllSections();
  elements.progressSection.classList.remove('hidden');
  elements.loadBtn.disabled = true;
  elements.btnText.classList.add('hidden');
  elements.btnLoading.classList.remove('hidden');

  // Reset progress
  elements.progressFill.style.width = '0%';
  elements.progressText.textContent = t('loading');
}

function updateProgress(loaded, page) {
  elements.progressText.textContent = t('loadingProgress', { count: loaded });

  // Animate progress bar (estimate based on loaded count)
  const estimatedProgress = Math.min((loaded / 50) * 100, 95);
  elements.progressFill.style.width = `${estimatedProgress}%`;
}

function showResults() {
  hideAllSections();

  // Complete progress bar
  elements.progressFill.style.width = '100%';

  // Show stats
  elements.statsSection.classList.remove('hidden');
  elements.verifiedCount.textContent = allFollowers.length;

  // Render followers
  renderFollowers(allFollowers);
  elements.followersList.classList.remove('hidden');

  // Show profile browse controls
  elements.browseSection.classList.remove('hidden');

  // Show pagination
  elements.paginationSection.classList.remove('hidden');
  updatePaginationUI();
  updateBrowseUI();

  // Reset button
  elements.loadBtn.disabled = false;
  elements.btnText.classList.remove('hidden');
  elements.btnLoading.classList.add('hidden');
}

function renderFollowers(followers) {
  elements.followersList.innerHTML = '';

  followers.forEach((follower, index) => {
    const card = document.createElement('div');
    card.className = 'follower-card';
    card.dataset.username = follower.screenName;
    if (index === selectedFollowerIndex) {
      card.classList.add('selected');
    }

    const avatarUrl = follower.profileImage || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
    const displayName = escapeHtml(follower.name || follower.screenName);
    const username = escapeHtml(follower.screenName);
    const bio = escapeHtml(follower.description || '');

    card.innerHTML = `
      <img class="follower-avatar" src="${avatarUrl}" alt="${displayName}">
      <div class="follower-info">
        <div class="follower-name">
          <span class="follower-display-name">${displayName}</span>
          <span class="verified-badge" title="Verified">✓</span>
        </div>
        <div class="follower-username">@${username}</div>
        ${bio ? `<p class="follower-bio">${bio}</p>` : ''}
      </div>
      <span class="follower-arrow">›</span>
    `;

    // Click to open profile in current tab and set selection.
    card.addEventListener('click', async () => {
      selectedFollowerIndex = index;
      updateSelectedFollowerCard();
      updateBrowseUI();
      await openFollowerInCurrentTab(follower.screenName);
    });

    elements.followersList.appendChild(card);
  });
}

function updatePaginationUI() {
  // Update page info (pagination only)
  const pageTemplate = t('page');
  if (/\{\w+\}/.test(pageTemplate)) {
    elements.pageInfo.textContent = t('page', { 0: currentPage, page: currentPage });
  } else {
    elements.pageInfo.textContent = `${pageTemplate} ${currentPage}`;
  }

  // Update button states
  const hasCachedNextPage = currentPage < loadedPages.length;
  elements.prevBtn.disabled = currentPage <= 1;
  elements.nextBtn.disabled = !(hasCachedNextPage || (hasMore && nextCursor));
}

function updateBrowseUI() {
  const selectedFollower = allFollowers[selectedFollowerIndex];
  const index = selectedFollowerIndex + 1;
  const total = allFollowers.length;

  if (selectedFollower?.screenName) {
    elements.browseInfo.textContent = t('browsingProfile', {
      username: selectedFollower.screenName,
      index: index,
      total: total
    });
  } else {
    elements.browseInfo.textContent = t('noProfileSelected');
  }

  const hasCachedNextPage = currentPage < loadedPages.length;
  const canGoPrev = selectedFollowerIndex > 0 || (selectedFollowerIndex >= 0 && currentPage > 1);
  const canGoNext = (
    (selectedFollowerIndex < 0 && total > 0) ||
    selectedFollowerIndex < total - 1 ||
    (selectedFollowerIndex >= 0 && (hasCachedNextPage || (hasMore && nextCursor)))
  );

  elements.browsePrevBtn.disabled = !canGoPrev;
  elements.browseNextBtn.disabled = !canGoNext;
}

function showNoResults() {
  hideAllSections();
  elements.errorSection.classList.remove('hidden');
  elements.errorTitle.textContent = 'No Verified Followers';
  elements.errorMessage.textContent = `@${currentUsername} has no verified followers, or they may not be publicly visible.`;
  elements.retryBtn.classList.add('hidden');

  // Reset button
  elements.loadBtn.disabled = false;
  elements.btnText.classList.remove('hidden');
  elements.btnLoading.classList.add('hidden');
}

function showError(error) {
  hideAllSections();
  elements.errorSection.classList.remove('hidden');

  // Map error types to user-friendly messages
  let title = 'Error';
  let message = error.message || 'An error occurred';

  if (error.type === 'NOT_AUTHENTICATED') {
    title = 'Not Logged In';
    message = 'Please log in to X.com first, then try again.';
  } else if (error.type === 'RATE_LIMITED') {
    title = 'Rate Limited';
    message = 'Too many requests. Please wait a few minutes and try again.';
  } else if (error.type === 'NETWORK_ERROR') {
    title = 'Network Error';
    message = 'Unable to connect to X.com. Please check your internet connection.';
  } else if (error.type === 'API_ERROR' && message.includes('not found')) {
    title = 'User Not Found';
    message = `The username "@${currentUsername}" could not be found. Please check the spelling.`;
  }

  elements.errorTitle.textContent = title;
  elements.errorMessage.textContent = message;
  elements.retryBtn.classList.remove('hidden');

  // Reset button
  elements.loadBtn.disabled = false;
  elements.btnText.classList.remove('hidden');
  elements.btnLoading.classList.add('hidden');
}

function hideAllSections() {
  elements.progressSection.classList.add('hidden');
  elements.statsSection.classList.add('hidden');
  elements.followersList.classList.add('hidden');
  elements.browseSection.classList.add('hidden');
  elements.paginationSection.classList.add('hidden');
  elements.emptyState.classList.add('hidden');
  elements.errorSection.classList.add('hidden');
}

function updateUI() {
  if (allFollowers.length > 0) {
    showResults();
  } else {
    hideAllSections();
    elements.emptyState.classList.remove('hidden');
  }
}

function updateTranslations() {
  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = t(key);
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.placeholder = translation;
    } else {
      element.textContent = translation;
    }
  });

  updateLoadButtonLabel();

  if (!elements.paginationSection.classList.contains('hidden')) {
    updatePaginationUI();
  }
  if (!elements.browseSection.classList.contains('hidden')) {
    updateBrowseUI();
  }
}

console.log('[Side Panel] Script initialized');
