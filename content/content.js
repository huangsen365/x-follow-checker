// Content script - runs on X.com pages
// Used as fallback for token extraction and to detect logged-in state

(function() {
  // Extract current user screen name from URL or page
  function getCurrentUserScreenName() {
    // Try to get from URL if on profile page
    const match = window.location.pathname.match(/^\/([^\/]+)$/);
    if (match && !['home', 'explore', 'notifications', 'messages', 'settings', 'i', 'search'].includes(match[1])) {
      return match[1];
    }

    // Try to get from the account switcher or profile link
    const profileLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
    if (profileLink) {
      const href = profileLink.getAttribute('href');
      if (href) {
        return href.replace('/', '');
      }
    }

    return null;
  }

  // Extract ct0 token from cookies (non-HttpOnly)
  function getCsrfToken() {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    return cookies.ct0 || null;
  }

  // Check if user is logged in
  function isLoggedIn() {
    return !!getCsrfToken();
  }

  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_PAGE_INFO') {
      sendResponse({
        screenName: getCurrentUserScreenName(),
        csrfToken: getCsrfToken(),
        isLoggedIn: isLoggedIn(),
        url: window.location.href
      });
    }
    return true;
  });

  // Notify background when page loads (optional - for future features)
  if (isLoggedIn()) {
    chrome.runtime.sendMessage({
      type: 'USER_LOGGED_IN',
      screenName: getCurrentUserScreenName()
    }).catch(() => {
      // Background might not be listening, ignore
    });
  }

  console.log('X Follow Checker content script loaded');
})();
