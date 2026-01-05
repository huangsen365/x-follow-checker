# AGENTS.md

This file provides guidance to AI coding agents when working with this repository.

## Project Summary

**X Follow Checker** — Chrome Extension (Manifest V3) that checks which X.com (Twitter) accounts you follow don't follow you back. Uses browser's authenticated session to access X.com's internal GraphQL APIs.

## Quick Start

```bash
# No build required - plain JavaScript with ES modules
# Load in Chrome:
# 1. chrome://extensions/ → Enable Developer mode
# 2. Load unpacked → Select this folder
# 3. Refresh extension after code changes
```

## File Structure

```
├── manifest.json           # Chrome extension manifest v3
├── popup/
│   ├── popup.html          # Extension popup UI
│   ├── popup.css           # Styles (sticky footer, marquee notifications)
│   └── popup.js            # UI logic, version check, draft message
├── background/
│   └── background.js       # Service worker, API orchestration
├── content/
│   └── content.js          # Content script for x.com (minimal)
├── utils/
│   ├── api.js              # X.com GraphQL API wrapper
│   ├── i18n.js             # Translations (en/zh/zh-TW)
│   └── storage.js          # Chrome storage utilities
└── icons/                  # Extension icons
```

## Core Concepts

### Authentication
- No API keys needed
- Uses browser cookies: `ct0` (CSRF token) and `auth_token`
- Bearer token is public (from X.com's JS bundles)

### GraphQL Query IDs
- X.com uses query IDs that change periodically
- **Dynamic loading**: Fetched from version-check API, stored in `chrome.storage.local`
- **Fallback**: Hardcoded defaults in `utils/api.js`
- Update via Cloudflare Worker env vars when X.com changes them

### Data Flow
```
User clicks "Start Check"
    → popup.js sends START_CHECK message
    → background.js gets auth tokens from cookies
    → background.js calls X.com GraphQL APIs
    → Results sent back via PROGRESS_UPDATE messages
    → popup.js displays results
```

## Key APIs

### X.com GraphQL Endpoints
```
Base: https://x.com/i/api/graphql/{queryId}/{endpoint}

Endpoints:
- UserByScreenName — Get user profile by @handle
- Following — Get following list (includes followed_by field)
- Viewer — Get current logged-in user
```

### Version Check API
```
GET https://version-check.x-follow-checker.com/is-latest-version?v={version}

Response: {
  clientVersion, latestVersion, isLatest,
  downloadUrl, notificationMessage,
  queryIds: { Following, Followers, UserByScreenName, Viewer }
}
```

## Storage Keys

| Key | Type | Description |
|-----|------|-------------|
| `language` | string | en, zh, or zh-TW |
| `cachedResults` | object | Results keyed by lowercase username |
| `usernameHistory` | array | Recent usernames (max 10) |
| `lastSelectedUsername` | string | Pre-fills input on popup open |
| `checkpoint` | object | Resume interrupted checks (1hr expiry) |
| `queryIds` | object | Dynamic GraphQL query IDs |

## Message Protocol

**popup.js → background.js:**
- `START_CHECK { screenName }` — Begin new check
- `CONTINUE_CHECK { username }` — Fetch next 1000 users
- `STOP_CHECK` — Cancel running check
- `GET_STATUS` — Get current status
- `DETECT_USERNAME` — Auto-detect logged-in user

**background.js → popup.js:**
- `PROGRESS_UPDATE { status, loaded, results, error }`

## Coding Patterns

### Adding Translations
```javascript
// utils/i18n.js
const translations = {
  en: { newKey: 'English text' },
  zh: { newKey: '中文文本' },
  'zh-TW': { newKey: '中文文本' }
};

// Usage in JS
import { t } from '../utils/i18n.js';
element.textContent = t('newKey');

// Usage in HTML
<span data-i18n="newKey">Fallback text</span>
```

### Adding Storage Keys
```javascript
// utils/storage.js
const STORAGE_KEYS = {
  NEW_KEY: 'newKey'
};

export async function getNewKey() {
  return await get(STORAGE_KEYS.NEW_KEY);
}
```

### Making API Calls
```javascript
// utils/api.js - Query IDs are loaded dynamically
const queryIds = await getQueryIds();
const url = `https://x.com/i/api/graphql/${queryIds.Following}/Following?${params}`;
```

## Common Tasks

### Update GraphQL Query IDs
1. Find new IDs: DevTools → Network → filter "graphql" on x.com
2. Update Cloudflare Worker env vars (no extension update needed)

### Add New Language
1. Add translation object in `utils/i18n.js`
2. Add option in `popup.html` language selector

### Modify Results Limit
- Change `MAX_USERS_PER_BATCH` in `utils/api.js` (default: 1000)

## Testing Checklist

- [ ] Extension loads without errors
- [ ] Can detect logged-in user (when logged into x.com)
- [ ] Check completes for < 1000 following
- [ ] "Continue to Check" works for > 1000 following
- [ ] Results cached per username
- [ ] Language switching works
- [ ] Export CSV/JSON works
- [ ] Draft message copies correctly

## Gotchas

1. **Service worker sleep**: Background script may sleep; popup re-checks status on open
2. **Rate limiting**: 1 second delay between API pages; 429 errors show retry message
3. **Query ID expiry**: HTTP 400 = likely expired query IDs, update via API
4. **Sticky footer**: Auto-scroll calculations must account for footer height
