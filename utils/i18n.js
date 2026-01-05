// Internationalization module - English (default) and Chinese

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
    viewOnGitHub: 'Star on GitHub'
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
    viewOnGitHub: '在 GitHub 上加星'
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
    { code: 'zh', name: '中文' }
  ];
}

export { translations };
