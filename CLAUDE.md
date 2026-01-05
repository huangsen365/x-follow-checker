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
- `utils/i18n.js` — English/Chinese translations
- `background/background.js` — Message handler, orchestrates API calls

## X.com API Notes

The extension uses X.com's internal GraphQL endpoints:
- `/i/api/graphql/{queryId}/UserByScreenName` — Get user info
- `/i/api/graphql/{queryId}/Following` — Get following list with `followed_by` field

**GraphQL query IDs change frequently.** If HTTP 400 errors occur, query IDs in `utils/api.js` need updating. Find current IDs by inspecting network requests on x.com or from https://github.com/fa0311/twitter-openapi.

Required headers: `authorization` (Bearer token), `x-csrf-token` (from ct0 cookie), `x-twitter-auth-type: OAuth2Session`
