// Internationalization module - English (default), Simplified Chinese, Traditional Chinese

const translations = {
  en: {
    appTitle: 'X Follow Checker',
    startCheck: 'Start Check',
    checking: 'Checking...',
    stop: 'Stop',
    following: 'Following',
    mutual: 'Mutual',
    notFollowingBack: 'Not Following Back',
    all: 'All',
    exportCSV: 'Export CSV',
    exportJSON: 'Export JSON',
    loading: 'Loading...',
    loadingProgress: 'Loaded {count} users...',
    error: 'Error',
    notLoggedIn: 'Please log in to X.com first',
    notLoggedInDesc: 'Open X.com and log in to your account, then try again.',
    alsoInputUsername: 'Also make sure to enter your X username in the input box above.',
    openX: 'Open X.com',
    rateLimited: 'Rate Limited',
    rateLimitedDesc: 'Too many requests. Please wait a few minutes and try again.',
    networkError: 'Connection Error',
    networkErrorDesc: 'Cannot connect to X.com. Check your internet connection.',
    retry: 'Retry',
    noResults: 'No results yet',
    noResultsDesc: 'Click "Start Check" to scan your following list.',
    checkComplete: 'Check Complete',
    foundNotFollowing: 'Found {count} accounts not following you back',
    settings: 'Settings',
    language: 'Language',
    viewProfile: 'View Profile',
    lastChecked: 'Last checked: {time}',
    never: 'Never',
    users: 'users',
    exportSuccess: 'Export successful!',
    exportFailed: 'Export failed',
    confirmStop: 'Stop the current check?',
    recentUsernames: 'Recent',
    clearHistory: 'Clear History',
    clearHistoryConfirm: 'Clear all username history?',
    noHistory: 'No recent usernames',
    detectUsername: 'Detect',
    detecting: 'Detecting...',
    detectSuccess: 'Username detected!',
    detectFailed: 'Could not detect username',
    permissionRequired: 'Permission required. Please allow access to X.com when prompted.',
    notLoggedInX: 'Please log in to X.com first, then try again.',
    detectTipNotLoggedIn: 'Could not detect username. Please {loginLink} first, then try again. Or manually enter your username above.',
    detectTipError: 'Could not detect username automatically. Please manually enter your username above.',
    loginToX: 'log in to X.com',
    viewOnGitHub: 'Star on GitHub',
    reportIssue: 'Report Issue',
    unexpectedError: 'Something went wrong. Please report this issue so we can fix it.',
    draftMessage: 'Draft Message',
    copyMessage: 'Copy Message',
    messageCopied: 'Copied!',
    goPostMessage: 'Now go to {link} to post your message!',
    messageTemplate: `Hey friends! 👋 I noticed we're not yet mutual followers. Would you consider following back? Otherwise, I might have to "clean up my following list" for some uncertain reasons... 🙈

I used a handy tool called X Follow Checker (https://x-follow-checker.com) to check mutual follow status — feel free to try it too!

Let's support each other. 🤝

{mentions}`,
    newVersionAvailable: '🎉 New version {version} available! Click to update.',
    latestVersion: '(latest)',
    currentVersion: 'v{version}',
    limitReached: 'Results limited to 1,000 users to protect API usage.',
    requestMoreQuota: 'Need more? Request extra quota'
  },
  zh: {
    appTitle: 'X 互关检测助手',
    startCheck: '开始检测',
    checking: '检测中...',
    stop: '停止',
    following: '关注',
    mutual: '互相关注',
    notFollowingBack: '未回关',
    all: '全部',
    exportCSV: '导出 CSV',
    exportJSON: '导出 JSON',
    loading: '加载中...',
    loadingProgress: '已加载 {count} 位用户...',
    error: '错误',
    notLoggedIn: '请先登录 X.com',
    notLoggedInDesc: '请打开 X.com 并登录您的账户，然后重试。',
    alsoInputUsername: '同时请确保在上方输入框中输入您的 X 用户名。',
    openX: '打开 X.com',
    rateLimited: '请求过于频繁',
    rateLimitedDesc: '请求次数过多，请等待几分钟后重试。',
    networkError: '连接错误',
    networkErrorDesc: '无法连接到 X.com，请检查网络连接。',
    retry: '重试',
    noResults: '暂无结果',
    noResultsDesc: '点击"开始检测"扫描您的关注列表。',
    checkComplete: '检测完成',
    foundNotFollowing: '发现 {count} 位用户未回关',
    settings: '设置',
    language: '语言',
    viewProfile: '查看主页',
    lastChecked: '上次检测: {time}',
    never: '从未',
    users: '位用户',
    exportSuccess: '导出成功！',
    exportFailed: '导出失败',
    confirmStop: '确定停止当前检测吗？',
    recentUsernames: '最近使用',
    clearHistory: '清除记录',
    clearHistoryConfirm: '确定清除所有用户名记录吗？',
    noHistory: '暂无记录',
    detectUsername: '检测',
    detecting: '检测中...',
    detectSuccess: '检测成功！',
    detectFailed: '无法检测用户名',
    permissionRequired: '需要权限。请在提示时允许访问 X.com。',
    notLoggedInX: '请先登录 X.com，然后重试。',
    detectTipNotLoggedIn: '无法检测用户名。请先{loginLink}，然后重试。或者在上方手动输入您的用户名。',
    detectTipError: '无法自动检测用户名。请在上方手动输入您的用户名。',
    loginToX: '登录 X.com',
    viewOnGitHub: '在 GitHub 上加星',
    reportIssue: '反馈问题',
    unexpectedError: '出现了意外错误，请反馈此问题以便我们修复。',
    draftMessage: '生成消息',
    copyMessage: '复制消息',
    messageCopied: '已复制！',
    goPostMessage: '现在去 {link} 发布消息吧！',
    messageTemplate: `朋友们好！👋 我注意到咱们还不是互相关注的状态。方便的话可以考虑回关一下吗？不然的话，可能会因为某些不确定的原因"取消互关"哦... 🙈

我用了一个小工具 X Follow Checker (https://x-follow-checker.com) 来查看互关状态，你也可以试试看！

让我们互相支持吧 🤝

{mentions}`,
    newVersionAvailable: '🎉 新版本 {version} 已发布！点击更新。',
    latestVersion: '(最新)',
    currentVersion: 'v{version}',
    limitReached: '为保护 API 使用量，结果限制为 1,000 位用户。',
    requestMoreQuota: '需要更多？申请额外配额'
  },
  'zh-TW': {
    appTitle: 'X 互追檢測助手',
    startCheck: '開始檢測',
    checking: '檢測中...',
    stop: '停止',
    following: '追蹤',
    mutual: '互相追蹤',
    notFollowingBack: '未回追',
    all: '全部',
    exportCSV: '匯出 CSV',
    exportJSON: '匯出 JSON',
    loading: '載入中...',
    loadingProgress: '已載入 {count} 位用戶...',
    error: '錯誤',
    notLoggedIn: '請先登入 X.com',
    notLoggedInDesc: '請開啟 X.com 並登入您的帳戶，然後重試。',
    alsoInputUsername: '同時請確保在上方輸入框中輸入您的 X 用戶名。',
    openX: '開啟 X.com',
    rateLimited: '請求過於頻繁',
    rateLimitedDesc: '請求次數過多，請等待幾分鐘後重試。',
    networkError: '連線錯誤',
    networkErrorDesc: '無法連線到 X.com，請檢查網路連線。',
    retry: '重試',
    noResults: '暫無結果',
    noResultsDesc: '點擊「開始檢測」掃描您的追蹤列表。',
    checkComplete: '檢測完成',
    foundNotFollowing: '發現 {count} 位用戶未回追',
    settings: '設定',
    language: '語言',
    viewProfile: '檢視個人頁面',
    lastChecked: '上次檢測: {time}',
    never: '從未',
    users: '位用戶',
    exportSuccess: '匯出成功！',
    exportFailed: '匯出失敗',
    confirmStop: '確定停止目前的檢測嗎？',
    recentUsernames: '最近使用',
    clearHistory: '清除記錄',
    clearHistoryConfirm: '確定清除所有用戶名記錄嗎？',
    noHistory: '暫無記錄',
    detectUsername: '偵測',
    detecting: '偵測中...',
    detectSuccess: '偵測成功！',
    detectFailed: '無法偵測用戶名',
    permissionRequired: '需要權限。請在提示時允許存取 X.com。',
    notLoggedInX: '請先登入 X.com，然後重試。',
    detectTipNotLoggedIn: '無法偵測用戶名。請先{loginLink}，然後重試。或者在上方手動輸入您的用戶名。',
    detectTipError: '無法自動偵測用戶名。請在上方手動輸入您的用戶名。',
    loginToX: '登入 X.com',
    viewOnGitHub: '在 GitHub 上加星',
    reportIssue: '回報問題',
    unexpectedError: '發生了意外錯誤，請回報此問題以便我們修復。',
    draftMessage: '產生訊息',
    copyMessage: '複製訊息',
    messageCopied: '已複製！',
    goPostMessage: '現在去 {link} 發佈訊息吧！',
    messageTemplate: `朋友們好！👋 我注意到咱們還不是互相追蹤的狀態。方便的話可以考慮回追一下嗎？不然的話，可能會因為某些不確定的原因「取消互追」哦... 🙈

我用了一個小工具 X Follow Checker (https://x-follow-checker.com) 來查看互追狀態，你也可以試試看！

讓我們互相支持吧 🤝

{mentions}`,
    newVersionAvailable: '🎉 新版本 {version} 已發佈！點擊更新。',
    latestVersion: '(最新)',
    currentVersion: 'v{version}',
    limitReached: '為保護 API 使用量，結果限制為 1,000 位用戶。',
    requestMoreQuota: '需要更多？申請額外配額'
  }
};

let currentLanguage = 'en';

export function setLanguage(lang) {
  if (translations[lang]) {
    currentLanguage = lang;
  }
}

export function getLanguage() {
  return currentLanguage;
}

export function t(key, params = {}) {
  const text = translations[currentLanguage]?.[key] || translations.en[key] || key;
  return text.replace(/\{(\w+)\}/g, (_, param) => params[param] ?? `{${param}}`);
}

export function getAvailableLanguages() {
  return [
    { code: 'en', name: 'English' },
    { code: 'zh', name: '简体中文' },
    { code: 'zh-TW', name: '繁體中文' }
  ];
}

export { translations };
