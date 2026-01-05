// Chrome storage utilities

const STORAGE_KEYS = {
  LANGUAGE: 'language',
  LAST_CHECK: 'lastCheck',
  CACHED_RESULTS: 'cachedResults',
  CHECKPOINT: 'checkpoint'
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

export { STORAGE_KEYS };
