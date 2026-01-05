# X.com GraphQL Query IDs Guide

This document explains how to find and update X.com's GraphQL query IDs when they expire.

## Why Query IDs Expire

X.com uses internal GraphQL APIs with query IDs that can change:
- When X deploys frontend updates
- Usually lasts weeks to months
- No fixed schedule - can change suddenly

**Symptom of expired IDs:** HTTP 400 errors or `"query not found"` responses.

## Where to Find Latest Query IDs

### 1. GitHub: twitter-openapi (Recommended)

**Repository:** https://github.com/fa0311/twitter-openapi

This community project tracks X.com's GraphQL API and keeps query IDs updated.

Look for files containing query IDs or check their documentation.

### 2. Browser DevTools (Manual Method)

1. Open **https://x.com** in Chrome (must be logged in)
2. Open DevTools: `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
3. Go to **Network** tab
4. In filter box, type `graphql`
5. Perform actions to capture the requests:

| Action | Captures Query |
|--------|----------------|
| Visit any user profile | `UserByScreenName` |
| Click "Following" on a profile | `Following` |
| Click "Followers" on a profile | `Followers` |
| Refresh homepage (logged in) | `Viewer` |

6. Click on a captured request
7. Look at the **Request URL**, format is:
   ```
   https://x.com/i/api/graphql/{QUERY_ID}/{QueryName}?variables=...
   ```
8. Copy the `{QUERY_ID}` portion

### 3. X.com JavaScript Bundles

1. In DevTools → **Sources** tab
2. Search (`Cmd+F` / `Ctrl+F`) for `queryId` or the endpoint name
3. Find patterns like:
   ```javascript
   queryId:"eWTmcJY3EMh-dxIR7CYTKw"
   ```

## Current Query IDs

As of last update, these are the query IDs used:

```javascript
{
  Following: 'eWTmcJY3EMh-dxIR7CYTKw',
  Followers: '1cgQROvByT7VpDSj3Ps5SQ',
  UserByScreenName: 'BQ6xjFU6Mgm-WhEP3OiT9w',
  Viewer: 'W62NnYgkgziw9bwyoVht0g'
}
```

## How to Update Query IDs

### Option A: Via Cloudflare Worker (No Extension Update)

Update environment variables on your Cloudflare Worker:

```
QUERY_ID_FOLLOWING=<new_id>
QUERY_ID_FOLLOWERS=<new_id>
QUERY_ID_USER_BY_SCREEN_NAME=<new_id>
QUERY_ID_VIEWER=<new_id>
```

Users will receive new IDs automatically on next popup open.

### Option B: Update Extension Code (Fallback)

Edit `utils/api.js`:

```javascript
const DEFAULT_QUERY_IDS = {
  Following: '<new_id>',
  Followers: '<new_id>',
  UserByScreenName: '<new_id>',
  Viewer: '<new_id>'
};
```

## API Endpoints Reference

| Endpoint | Purpose | Used For |
|----------|---------|----------|
| `UserByScreenName` | Get user profile by @handle | Fetching user info before check |
| `Following` | Get list of accounts user follows | Main check functionality |
| `Followers` | Get list of followers | Not currently used |
| `Viewer` | Get current logged-in user | Auto-detect username feature |

## Required Headers

All requests require these headers:

```javascript
{
  'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
  'x-csrf-token': '<ct0 cookie value>',
  'x-twitter-auth-type': 'OAuth2Session',
  'x-twitter-active-user': 'yes',
  'x-twitter-client-language': 'en',
  'content-type': 'application/json'
}
```

The Bearer token is public (from X.com's JS bundles). The CSRF token comes from the `ct0` cookie.

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| HTTP 400 Bad Request | Expired query ID | Update query IDs |
| HTTP 401/403 | Not authenticated | User needs to log in to x.com |
| HTTP 429 | Rate limited | Wait a few minutes |
| `"query not found"` | Invalid query ID | Get fresh IDs from sources above |
