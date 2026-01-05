# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

X Follow Checker is a Chrome Extension (Manifest V3) that identifies X.com (Twitter) accounts you follow that don't follow you back. It uses the browser's authenticated session to access X.com's internal GraphQL APIs—no external API keys required.

## Development

**Load extension for testing:**
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this folder
4. After code changes, click the refresh icon on the extension card

No build step required—plain JavaScript with ES modules.

## Architecture

```
popup/          → User interface (popup.html/css/js)
background/     → Service worker handling API requests
content/        → Content script injected into x.com pages
utils/          → Shared modules (api.js, i18n.js, storage.js)
```

**Data flow:**
1. `popup.js` sends messages to `background.js` via `chrome.runtime.sendMessage`
2. `background.js` fetches auth tokens via `chrome.cookies.get()` and calls X.com GraphQL APIs
3. Results flow back to popup for display

**Key files:**
- `utils/api.js` — X.com API wrapper with GraphQL query IDs, auth handling, pagination
- `utils/i18n.js` — English/Simplified Chinese/Traditional Chinese translations
- `utils/storage.js` — Chrome storage utilities with per-username caching
- `background/background.js` — Message handler, orchestrates API calls

## X.com API Notes

The extension uses X.com's internal GraphQL endpoints:
- `/i/api/graphql/{queryId}/UserByScreenName` — Get user info
- `/i/api/graphql/{queryId}/Following` — Get following list with `followed_by` field
- `/i/api/graphql/{queryId}/Viewer` — Get current logged-in user

**GraphQL query IDs are now dynamic.** They are fetched from the version-check API and stored in `chrome.storage.local`. Fallback to hardcoded defaults if API unavailable.

Required headers: `authorization` (Bearer token), `x-csrf-token` (from ct0 cookie), `x-twitter-auth-type: OAuth2Session`

## Version Check API

**Endpoint:** `https://version-check.x-follow-checker.com/is-latest-version?v={version}`

**Response structure:**
```json
{
  "clientVersion": "1.0.0",
  "latestVersion": "1.0.1",
  "isLatest": false,
  "downloadUrl": "https://x-follow-checker.com",
  "notificationMessage": "Optional scrolling notification",
  "queryIds": {
    "Following": "eWTmcJY3EMh-dxIR7CYTKw",
    "Followers": "1cgQROvByT7VpDSj3Ps5SQ",
    "UserByScreenName": "BQ6xjFU6Mgm-WhEP3OiT9w",
    "Viewer": "W62NnYgkgziw9bwyoVht0g"
  }
}
```

**Cloudflare Worker environment variables:**
- `LATEST_VERSION` — Latest extension version
- `DOWNLOAD_URL` — Download page URL
- `NOTIFICATION_MESSAGE` — Scrolling notification (optional)
- `QUERY_ID_FOLLOWING` — GraphQL ID for Following query
- `QUERY_ID_FOLLOWERS` — GraphQL ID for Followers query
- `QUERY_ID_USER_BY_SCREEN_NAME` — GraphQL ID for UserByScreenName
- `QUERY_ID_VIEWER` — GraphQL ID for Viewer query

## Storage Structure

**Keys in `chrome.storage.local`:**
- `language` — User's selected language (en/zh/zh-TW)
- `cachedResults` — Object keyed by lowercase username, each containing check results
- `usernameHistory` — Array of recent usernames (max 10)
- `lastSelectedUsername` — Last selected/checked username
- `checkpoint` — Resume data for interrupted checks (expires after 1 hour)
- `queryIds` — Dynamic GraphQL query IDs from server

## Key Features

### Per-Username Caching
Results are cached per username. Selecting a username from the dropdown shows cached results instantly.

### Continue Check (1000+ Users)
API limits results to 1000 users per batch. Users can click "Continue to Check" to fetch more. Progress resets for each batch.

### Draft Message
Generates a friendly message mentioning non-followers with a link to x-follow-checker.com. Copies to clipboard with "go post" hint.

### Server Notification
Marquee-style scrolling notification from API. Pauses on hover. Independent of version status.

## Message Types (popup ↔ background)

- `START_CHECK` — Start new check with screenName
- `CONTINUE_CHECK` — Continue from cursor for 1000+ users
- `STOP_CHECK` — Cancel running check
- `GET_STATUS` — Get current check status
- `DETECT_USERNAME` — Detect logged-in user via Viewer API
- `PROGRESS_UPDATE` — Background → popup progress updates

## Internationalization

Three languages supported in `utils/i18n.js`:
- `en` — English (default)
- `zh` — Simplified Chinese
- `zh-TW` — Traditional Chinese

Use `data-i18n` attribute on HTML elements for automatic translation.
