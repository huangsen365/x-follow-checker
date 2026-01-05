// Popup UI logic for X Follow Checker

import { t, setLanguage, getLanguage, getAvailableLanguages } from '../utils/i18n.js';
import * as storage from '../utils/storage.js';

// DOM Elements
const elements = {
  langSelect: null,
  screenNameInput: null,
  startBtn: null,
  progressSection: null,
  progressFill: null,
  progressText: null,
  errorSection: null,
  errorTitle: null,
  errorMessage: null,
  errorActionBtn: null,
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

// State
let currentResults = null;
let currentFilter = 'all';
let isChecking = false;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initElements();
  await initLanguage();
  await loadCachedResults();
  setupEventListeners();
  updateUI();
});

function initElements() {
  elements.langSelect = document.getElementById('langSelect');
  elements.screenNameInput = document.getElementById('screenNameInput');
  elements.startBtn = document.getElementById('startBtn');
  elements.progressSection = document.getElementById('progressSection');
  elements.progressFill = document.getElementById('progressFill');
  elements.progressText = document.getElementById('progressText');
  elements.errorSection = document.getElementById('errorSection');
  elements.errorTitle = document.getElementById('errorTitle');
  elements.errorMessage = document.getElementById('errorMessage');
  elements.errorActionBtn = document.getElementById('errorActionBtn');
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

function setupEventListeners() {
  // Language change
  elements.langSelect.addEventListener('change', async (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    await storage.setLanguage(lang);
    updateTranslations();
  });

  // Start check button
  elements.startBtn.addEventListener('click', handleStartCheck);

  // Enter key in input
  elements.screenNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !isChecking) {
      handleStartCheck();
    }
  });

  // Export buttons
  elements.exportCsvBtn.addEventListener('click', () => exportData('csv'));
  elements.exportJsonBtn.addEventListener('click', () => exportData('json'));

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

async function handleStartCheck() {
  const screenName = elements.screenNameInput.value.trim().replace('@', '');

  if (!screenName) {
    showError('error', t('notLoggedIn'), t('notLoggedInDesc'));
    return;
  }

  if (isChecking) {
    // Stop current check
    chrome.runtime.sendMessage({ type: 'STOP_CHECK' });
    setCheckingState(false);
    return;
  }

  setCheckingState(true);
  hideAllSections();
  showSection(elements.progressSection);
  updateProgress(0, t('loading'));

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'START_CHECK',
      screenName: screenName
    });

    if (response.success) {
      currentResults = response.data;
      showResults();
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
  }
}

function handleProgressUpdate(message) {
  switch (message.status) {
    case 'getting_user_info':
      updateProgress(5, t('loading'));
      break;

    case 'fetching_following':
      const percent = message.totalEstimate
        ? Math.min(95, (message.loaded / message.totalEstimate) * 100)
        : 50;
      updateProgress(percent, t('loadingProgress', { count: message.loaded }));
      break;

    case 'completed':
      currentResults = message.results;
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

  // Show action button for specific errors
  if (type === 'NOT_AUTHENTICATED') {
    elements.errorActionBtn.textContent = t('openX');
    elements.errorActionBtn.classList.remove('hidden');
    elements.errorActionBtn.onclick = () => {
      chrome.tabs.create({ url: 'https://x.com/login' });
    };
  } else {
    elements.errorActionBtn.textContent = t('retry');
    elements.errorActionBtn.classList.remove('hidden');
    elements.errorActionBtn.onclick = handleStartCheck;
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

  // Update stats
  elements.totalCount.textContent = currentResults.stats.total;
  elements.mutualCount.textContent = currentResults.stats.mutualCount;
  elements.notFollowingCount.textContent = currentResults.stats.notFollowingBackCount;

  // Update last check info
  const lastCheck = new Date();
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
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_CACHED_RESULTS' });
    if (response.success && response.data.cached) {
      currentResults = response.data.cached;

      // Update last check info
      if (response.data.lastCheck) {
        const lastCheck = new Date(response.data.lastCheck);
        elements.lastCheckInfo.textContent = t('lastChecked', {
          time: lastCheck.toLocaleString()
        });
      }
    }
  } catch (error) {
    console.error('Failed to load cached results:', error);
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
      u.screenName,
      u.name.replace(/,/g, ' '),
      u.followedBy ? 'Yes' : 'No',
      u.verified ? 'Yes' : 'No'
    ]);

    content = [headers, ...rows].map(row => row.join(',')).join('\n');
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

function hideAllSections() {
  elements.progressSection.classList.add('hidden');
  elements.errorSection.classList.add('hidden');
  elements.resultsSection.classList.add('hidden');
  elements.emptyState.classList.add('hidden');
}

function showSection(section) {
  section.classList.remove('hidden');
}

function updateUI() {
  hideAllSections();

  if (currentResults) {
    showResults();
  } else {
    showSection(elements.emptyState);
  }
}

function updateTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
}
