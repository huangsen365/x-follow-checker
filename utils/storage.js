// Chrome storage utilities

const STORAGE_KEYS = {
  LANGUAGE: 'language',
  LAST_CHECK: 'lastCheck',
  CACHED_RESULTS: 'cachedResults',
  CHECKPOINT: 'checkpoint',
  USERNAME_HISTORY: 'usernameHistory',
  LAST_SELECTED_USERNAME: 'lastSelectedUsername',
  POPUP_UI_STATE: 'popupUiState'
};

function getPopupStorageArea() {
  return chrome.storage.session || chrome.storage.local;
}

export async function get(key) {
  const result = await chrome.storage.local.get(key);
  return result[key];
}

export async function set(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

export async function remove(key) {
  await chrome.storage.local.remove(key);
}

export async function getLanguage() {
  return (await get(STORAGE_KEYS.LANGUAGE)) || 'en';
}

export async function setLanguage(lang) {
  await set(STORAGE_KEYS.LANGUAGE, lang);
}

export async function getLastCheck() {
  return await get(STORAGE_KEYS.LAST_CHECK);
}

export async function setLastCheck(timestamp) {
  await set(STORAGE_KEYS.LAST_CHECK, timestamp);
}

// Get cached results for a specific username (or all if no username provided)
export async function getCachedResults(username = null) {
  const allCached = await get(STORAGE_KEYS.CACHED_RESULTS) || {};

  if (username) {
    // Return results for specific username
    const key = username.toLowerCase();
    return allCached[key] || null;
  }

  // Return all cached results (for backward compatibility)
  return allCached;
}

// Get the most recent cached result (for backward compatibility)
export async function getMostRecentCachedResults() {
  const allCached = await get(STORAGE_KEYS.CACHED_RESULTS) || {};

  // Find the most recent by timestamp
  let mostRecent = null;
  let mostRecentTime = 0;

  for (const key in allCached) {
    if (allCached[key]?.timestamp > mostRecentTime) {
      mostRecentTime = allCached[key].timestamp;
      mostRecent = allCached[key];
    }
  }

  return mostRecent;
}

export async function setCachedResults(results) {
  const username = results?.user?.screenName;
  if (!username) return;

  const key = username.toLowerCase();
  const allCached = await get(STORAGE_KEYS.CACHED_RESULTS) || {};

  allCached[key] = {
    ...results,
    timestamp: Date.now()
  };

  await set(STORAGE_KEYS.CACHED_RESULTS, allCached);
}

export async function clearCachedResults() {
  await remove(STORAGE_KEYS.CACHED_RESULTS);
}

// Clear cached results for usernames not in the history list
export async function cleanupCachedResults() {
  const history = await getRecentUsernames();
  const historyLower = history.map(u => u.toLowerCase());
  const allCached = await get(STORAGE_KEYS.CACHED_RESULTS) || {};

  const cleaned = {};
  for (const key in allCached) {
    if (historyLower.includes(key)) {
      cleaned[key] = allCached[key];
    }
  }

  await set(STORAGE_KEYS.CACHED_RESULTS, cleaned);
}

// Verified followers cache functions
export async function setVerifiedFollowersCache(username, data) {
  if (!username) return;

  const key = `verifiedFollowers_${username.toLowerCase()}`;
  await set(key, {
    ...data,
    timestamp: Date.now()
  });
}

export async function getVerifiedFollowersCache(username) {
  if (!username) return null;

  const key = `verifiedFollowers_${username.toLowerCase()}`;
  const cached = await get(key);

  // Cache expires after 1 hour
  if (cached && (Date.now() - cached.timestamp) < 3600000) {
    return cached;
  }

  return null;
}

// Checkpoint for resuming interrupted checks
export async function saveCheckpoint(checkpoint) {
  await set(STORAGE_KEYS.CHECKPOINT, {
    ...checkpoint,
    timestamp: Date.now()
  });
}

export async function getCheckpoint() {
  const checkpoint = await get(STORAGE_KEYS.CHECKPOINT);
  // Checkpoint expires after 1 hour
  if (checkpoint && Date.now() - checkpoint.timestamp < 3600000) {
    return checkpoint;
  }
  return null;
}

export async function clearCheckpoint() {
  await remove(STORAGE_KEYS.CHECKPOINT);
}

// Username history functions
const MAX_USERNAME_HISTORY = 10;

export async function getRecentUsernames() {
  return (await get(STORAGE_KEYS.USERNAME_HISTORY)) || [];
}

export async function addRecentUsername(username) {
  if (!username) return;

  const history = await getRecentUsernames();

  // Remove if already exists (to move to top)
  const filtered = history.filter(u => u.toLowerCase() !== username.toLowerCase());

  // Add to beginning
  filtered.unshift(username);

  // Limit to max
  const limited = filtered.slice(0, MAX_USERNAME_HISTORY);

  await set(STORAGE_KEYS.USERNAME_HISTORY, limited);
  await cleanupCachedResults();
}

export async function clearUsernameHistory() {
  await remove(STORAGE_KEYS.USERNAME_HISTORY);
}

// Delete a single username and its related data
export async function deleteUsername(username) {
  if (!username) return;

  const key = username.toLowerCase();

  // Remove from history list
  const history = await getRecentUsernames();
  const filtered = history.filter(u => u.toLowerCase() !== key);
  await set(STORAGE_KEYS.USERNAME_HISTORY, filtered);

  // Remove cached results for this username
  const allCached = await get(STORAGE_KEYS.CACHED_RESULTS) || {};
  if (allCached[key]) {
    delete allCached[key];
    await set(STORAGE_KEYS.CACHED_RESULTS, allCached);
  }

  // Clear last selected if it matches
  const lastSelected = await getLastSelectedUsername();
  if (lastSelected && lastSelected.toLowerCase() === key) {
    await remove(STORAGE_KEYS.LAST_SELECTED_USERNAME);
  }

  return filtered;
}

// Last selected username functions
export async function getLastSelectedUsername() {
  return await get(STORAGE_KEYS.LAST_SELECTED_USERNAME);
}

export async function setLastSelectedUsername(username) {
  if (username) {
    await set(STORAGE_KEYS.LAST_SELECTED_USERNAME, username);
  }
}

// Clear all user data for privacy
export async function clearAllUserData() {
  await remove(STORAGE_KEYS.USERNAME_HISTORY);
  await remove(STORAGE_KEYS.CACHED_RESULTS);
  await remove(STORAGE_KEYS.LAST_CHECK);
  await remove(STORAGE_KEYS.CHECKPOINT);
  await remove(STORAGE_KEYS.LAST_SELECTED_USERNAME);
}

// Popup UI state (session storage if available)
export async function getPopupUiState() {
  const storageArea = getPopupStorageArea();
  const result = await storageArea.get(STORAGE_KEYS.POPUP_UI_STATE);
  return result[STORAGE_KEYS.POPUP_UI_STATE] || null;
}

export async function setPopupUiState(state) {
  const storageArea = getPopupStorageArea();
  await storageArea.set({ [STORAGE_KEYS.POPUP_UI_STATE]: state });
}

export async function clearPopupUiState() {
  const storageArea = getPopupStorageArea();
  await storageArea.remove(STORAGE_KEYS.POPUP_UI_STATE);
}

export { STORAGE_KEYS };
