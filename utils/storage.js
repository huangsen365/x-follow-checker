// Chrome storage utilities

const STORAGE_KEYS = {
  LANGUAGE: 'language',
  LAST_CHECK: 'lastCheck',
  CACHED_RESULTS: 'cachedResults',
  CHECKPOINT: 'checkpoint',
  USERNAME_HISTORY: 'usernameHistory'
};

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

export async function getCachedResults() {
  return await get(STORAGE_KEYS.CACHED_RESULTS);
}

export async function setCachedResults(results) {
  await set(STORAGE_KEYS.CACHED_RESULTS, {
    ...results,
    timestamp: Date.now()
  });
}

export async function clearCachedResults() {
  await remove(STORAGE_KEYS.CACHED_RESULTS);
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
}

export async function clearUsernameHistory() {
  await remove(STORAGE_KEYS.USERNAME_HISTORY);
}

// Clear all user data for privacy
export async function clearAllUserData() {
  await remove(STORAGE_KEYS.USERNAME_HISTORY);
  await remove(STORAGE_KEYS.CACHED_RESULTS);
  await remove(STORAGE_KEYS.LAST_CHECK);
  await remove(STORAGE_KEYS.CHECKPOINT);
}

export { STORAGE_KEYS };
