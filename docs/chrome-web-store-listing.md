# Chrome Web Store Listing — X Follow Checker

> Copy-paste reference for filling out the Chrome Web Store Developer Dashboard.
> Fields marked with * are required.

---

## 1. Store Listing

### Extension Name *
```
X Follow Checker
```

### Summary / Short Description * (max 132 chars)
```
Check which X.com (Twitter) accounts you follow don't follow you back. One-click scan, export CSV/JSON, 100% local & private.
```

### Detailed Description * (max 16,000 chars)

```
X Follow Checker helps you find out who doesn't follow you back on X.com (formerly Twitter).

HOW IT WORKS
• Click the extension icon, enter your X username, and hit "Start Check"
• The extension scans your following list using your logged-in session
• Results show mutual follows and non-followers at a glance

KEY FEATURES
✅ One-Click Detection — Scan your entire following list with a single click
✅ Mutual Follow Status — Clearly see who follows you back (green) and who doesn't (red)
✅ Export Data — Download results as CSV or JSON with profile links
✅ Draft Message — Generate a message mentioning non-followers, copy to clipboard
✅ Continue Check — Support for accounts following 1,000+ users with batch loading
✅ Per-User Caching — Results are saved per username for instant access later
✅ Side Panel — Browse verified followers in a dedicated side panel
✅ Multilingual — English, Simplified Chinese (简体中文), Traditional Chinese (繁體中文)

PRIVACY FIRST
• All data is processed locally in your browser
• No external servers, no third-party tracking
• No API keys required — uses your existing X.com session
• Your data never leaves your device

HOW TO USE
1. Log in to x.com in your browser
2. Click the X Follow Checker icon in the toolbar
3. Enter your X username (or click Detect to auto-detect)
4. Click "Start Check" and wait for results
5. Filter by All / Mutual / Not Following Back
6. Click any user to visit their profile
7. Export results as CSV or JSON

REQUIREMENTS
• Google Chrome browser
• Logged in to X.com (Twitter)

PERMISSIONS EXPLAINED
• Cookies: Read authentication tokens from x.com to access your following data
• Storage: Save your check results and preferences locally
• Tabs: Open user profiles when you click on results
• Host access (x.com): Required to access X.com's API with your session

OPEN SOURCE
This extension is fully open source under the MIT license.
GitHub: https://github.com/huangsen365/x-follow-checker

Questions or bugs? Open an issue on GitHub or contact @yunbiyun on X.com.
```

---

## 2. Category *

```
Social & Communication
```

### Sub-category (if available)
```
Social Networking
```

---

## 3. Language *

```
English
```
(The extension auto-detects and supports: English, Simplified Chinese, Traditional Chinese)

---

## 4. Permissions Justification *

Chrome Web Store requires you to explain why each permission is needed:

| Permission | Justification |
|---|---|
| `cookies` | Required to read authentication tokens (ct0, auth_token) from x.com cookies to authenticate API requests on behalf of the user. |
| `storage` | Required to save check results, user preferences (language), username history, and cached data locally on the user's device. |
| `sidePanel` | Required to display the verified followers browsing panel in Chrome's side panel. |
| `tabs` | Required to open X.com user profiles in new tabs when the user clicks on a result, and to sync the side panel with the active tab. |

### Host Permissions Justification

| Host | Justification |
|---|---|
| `https://x.com/*` | Required to access X.com's GraphQL API to fetch the user's following list and follower status. |
| `https://twitter.com/*` | Legacy domain for X.com. Required for users who still access Twitter via twitter.com. |
| `https://version-check.x-follow-checker.com/*` | Required to check for extension updates and retrieve the latest API query IDs to ensure compatibility. |

---

## 5. Single Purpose Description *

```
This extension checks which X.com (Twitter) accounts you follow that don't follow you back.
```

---

## 6. Privacy Policy

### Option A: Simple inline (if no website)
```
X Follow Checker does not collect, transmit, or share any user data. All processing happens locally in your browser. No analytics, no tracking, no external servers are involved in processing your data. Authentication tokens are only used to communicate directly with X.com's API from your browser. Cached results are stored locally using Chrome's storage API and never leave your device.
```

### Option B: Privacy policy URL (if hosted)
```
https://github.com/huangsen365/x-follow-checker/blob/main/PRIVACY.md
```

---

## 7. Screenshots

Chrome Web Store requires **at least 1 screenshot** (1280x800 or 640x400 recommended).

Suggested screenshots to prepare:

| # | Content | Notes |
|---|---|---|
| 1 | Main popup showing check results with user list | Show mutual (green) and not-following (red) status |
| 2 | Filter view — "Not Following Back" tab selected | Highlight the core use case |
| 3 | Export options (CSV/JSON buttons visible) | Show data export capability |
| 4 | Side panel browsing verified followers | Show the side panel feature |
| 5 | Language selector showing EN/中/繁 | Highlight multilingual support |

### Screenshot sizes
- Required: **1280 x 800** or **640 x 400**
- Format: PNG or JPEG
- Capture with Chrome DevTools device toolbar or screenshot tool

---

## 8. Promotional Images (Optional but recommended)

| Type | Size | Usage |
|---|---|---|
| Small promo tile | 440 x 280 | Shown in Chrome Web Store listings |
| Large promo tile | 920 x 680 | Featured in store |
| Marquee | 1400 x 560 | Top of store page if featured |

---

## 9. Additional Store Fields

### Website URL
```
https://x-follow-checker.com
```
(or use GitHub repo if website not ready)
```
https://github.com/huangsen365/x-follow-checker
```

### Support URL
```
https://github.com/huangsen365/x-follow-checker/issues
```

---

## 10. Content Rating

- Does this extension contain mature content? **No**
- Does this extension access or handle user credentials? **No** (it reads session cookies, not passwords)

---

## 11. Regions / Distribution

```
All regions
```

---

## 12. Localized Listing (Optional)

### 简体中文 (Simplified Chinese)

**Name:**
```
X 关注检查器
```

**Short Description (max 132 chars):**
```
检查你在 X.com（Twitter）上关注的哪些账号没有回关你。一键扫描，支持导出 CSV/JSON，数据完全本地处理。
```

**Detailed Description:**
```
X 关注检查器帮助你找出在 X.com（原 Twitter）上谁没有回关你。

功能特点
✅ 一键检测 — 一键扫描你的全部关注列表
✅ 互关状态 — 清晰显示谁回关了你（绿色）谁没有（红色）
✅ 导出数据 — 将结果导出为 CSV 或 JSON，包含个人主页链接
✅ 草拟消息 — 生成 @提及未回关者的消息模板，一键复制
✅ 继续检查 — 支持关注超过 1000 人的账号，分批加载
✅ 按用户缓存 — 每个用户名的结果独立保存，下次即时查看
✅ 侧边栏 — 在专用侧边栏中浏览已认证的关注者
✅ 多语言 — 支持英文、简体中文、繁體中文

隐私保护
• 所有数据在浏览器本地处理
• 无外部服务器，无第三方追踪
• 无需 API 密钥 — 使用你现有的 X.com 登录会话
• 你的数据永远不会离开你的设备

使用方法
1. 在浏览器中登录 x.com
2. 点击工具栏中的 X Follow Checker 图标
3. 输入你的 X 用户名（或点击"检测"自动获取）
4. 点击"开始检查"并等待结果
5. 按 全部 / 互关 / 未回关 筛选
6. 点击任何用户访问其主页
7. 将结果导出为 CSV 或 JSON

开源项目
GitHub: https://github.com/huangsen365/x-follow-checker
```

### 繁體中文 (Traditional Chinese)

**Name:**
```
X 追蹤檢查器
```

**Short Description (max 132 chars):**
```
檢查你在 X.com（Twitter）上追蹤的哪些帳號沒有回追你。一鍵掃描，支援匯出 CSV/JSON，資料完全本地處理。
```

**Detailed Description:**
```
X 追蹤檢查器幫助你找出在 X.com（原 Twitter）上誰沒有回追你。

功能特點
✅ 一鍵檢測 — 一鍵掃描你的全部追蹤列表
✅ 互追狀態 — 清楚顯示誰回追了你（綠色）誰沒有（紅色）
✅ 匯出資料 — 將結果匯出為 CSV 或 JSON，包含個人主頁連結
✅ 草擬訊息 — 產生 @提及未回追者的訊息範本，一鍵複製
✅ 繼續檢查 — 支援追蹤超過 1000 人的帳號，分批載入
✅ 按使用者快取 — 每個使用者名稱的結果獨立儲存，下次即時查看
✅ 側邊欄 — 在專用側邊欄中瀏覽已認證的追蹤者
✅ 多語言 — 支援英文、簡體中文、繁體中文

隱私保護
• 所有資料在瀏覽器本地處理
• 無外部伺服器，無第三方追蹤
• 無需 API 金鑰 — 使用你現有的 X.com 登入工作階段
• 你的資料永遠不會離開你的裝置

使用方法
1. 在瀏覽器中登入 x.com
2. 點擊工具列中的 X Follow Checker 圖示
3. 輸入你的 X 使用者名稱（或點擊「偵測」自動取得）
4. 點擊「開始檢查」並等待結果
5. 按 全部 / 互追 / 未回追 篩選
6. 點擊任何使用者造訪其主頁
7. 將結果匯出為 CSV 或 JSON

開源專案
GitHub: https://github.com/huangsen365/x-follow-checker
```
