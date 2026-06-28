# IIDM Buzzworld — Playwright E2E Test Automation Documentation

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [How We Set It Up — Step by Step](#2-how-we-set-it-up--step-by-step)
3. [Project Folder Structure](#3-project-folder-structure)
4. [Configuration Explained](#4-configuration-explained)
5. [Helper Files — What Each One Does](#5-helper-files--what-each-one-does)
6. [Auth Test Cases — Detailed Breakdown](#6-auth-test-cases--detailed-breakdown)
7. [How to Run the Tests](#7-how-to-run-the-tests)
8. [Test Results — Pass/Fail Summary](#8-test-results--passfail-summary)
9. [Key Problems Solved](#9-key-problems-solved)
10. [Troubleshooting Guide](#10-troubleshooting-guide)
11. [Next Steps — What to Build Next](#11-next-steps--what-to-build-next)

---

## 1. Project Overview

| Item | Detail |
|------|--------|
| **Application** | IIDM Buzzworld — Industrial Distribution Management System |
| **Tech Stack** | React frontend → Lumen API → PostgreSQL |
| **App URL** | `https://www.staging-buzzworld-v1.iidm.com` |
| **SSO URL** | `https://staging-sso-v1.iidm.com` |
| **Test Framework** | Playwright (Node.js) |
| **Browser** | Chromium (headed mode — you can see the browser) |
| **Test Runner** | `npx playwright test` |

### What is Playwright?
Playwright is a tool that opens a real browser (Chrome, Firefox, Safari) and automatically clicks buttons, fills forms, and checks if the app works correctly — just like a human tester would, but faster and repeatable.

### What is E2E Testing?
End-to-End (E2E) testing means testing the **full user journey** — from opening the browser, logging in, clicking through pages, to logging out. It tests the app exactly how a real user would use it.

---

## 2. How We Set It Up — Step by Step

### Step 1: Analyzed the Existing Code
- The project already had Playwright installed (`@playwright/test` in `package.json`)
- There was one existing test file (`tests/iidm.spec.js`) with basic login + navigation
- The existing test had issues:
  - Password was entered incorrectly (codegen recorded CapsLock key presses)
  - Used `fill()` method which was detected as automation by SSO
  - No waits after login — the app didn't have time to load

### Step 2: Fixed the Login Flow
The biggest challenge was the **SSO (Single Sign-On) login**. Here's how it works:

```
User opens app URL → App redirects to SSO login page → User enters credentials → 
SSO verifies → SSO redirects back to app with auth cookies → App loads
```

**Problem:** When Playwright used `fill()` to enter the password, the SSO server detected it as automation and rejected the login with "Invalid Email or Password".

**Solution:** We switched to `pressSequentially()` which types each character one by one with a 50ms delay, simulating real human typing. This bypasses the automation detection.

```javascript
// BEFORE (detected as automation — FAILS)
await page.getByRole('textbox', { name: 'Password' }).fill('Enspirit@625');

// AFTER (types like a human — WORKS)
await page.getByRole('textbox', { name: 'Password' }).pressSequentially('Enspirit@625', { delay: 50 });
```

### Step 3: Created the Folder Structure
We organized tests into modules matching the application's structure — Auth, Quotes, Repairs, etc.

### Step 4: Created Helper Files
Instead of repeating the same code in every test (like login), we created reusable helper functions that any test can import and use.

### Step 5: Created the Auth Test Suite (8 Tests)
We wrote 8 test cases covering all authentication scenarios — login, logout, invalid credentials, session expiry, menu visibility, etc.

### Step 6: Ran and Fixed Tests
- First run: 4 passed, 3 failed, 1 skipped
- Identified issues:
  - Session expiry test needed to clear cookies (not just localStorage)
  - Admin test used wrong credentials (the default user already has admin access)
  - Nav items used truncated text on screen ("Quote" not "Quotes")
- Fixed all issues and re-ran
- **Final result: 7 passed, 1 skipped (no customer credentials yet)**

---

## 3. Project Folder Structure

```
Playwright_MCP/
├── playwright.config.js          ← Main configuration file
├── package.json                  ← Node.js dependencies
│
├── helpers/                      ← Reusable helper functions
│   ├── auth.js                   ← Login, logout, verify login
│   ├── navigation.js             ← Navigate to pages, check menu items
│   ├── grid.js                   ← AG Grid interactions (tables)
│   ├── form.js                   ← Fill forms, click buttons
│   ├── assertions.js             ← Check if things appeared correctly
│   └── test-data.js              ← Generate unique test data
│
├── fixtures/                     ← Test data and credentials
│   └── users.js                  ← User credentials per role
│
├── tests/                        ← All test files
│   ├── 01-auth/                  ← Authentication tests ← WE ARE HERE
│   │   └── login.spec.js         ← 8 auth test cases
│   ├── 02-quotes/                ← Quote tests (coming next)
│   ├── 03-repairs/               ← Repair tests
│   ├── 04-jobs/                  ← Job tests
│   ├── 05-orders/                ← Order tests
│   ├── 06-parts-purchase/        ← Parts purchase tests
│   ├── 07-pricing/               ← Pricing tests
│   ├── 08-inventory/             ← Inventory tests
│   ├── 09-organizations/         ← Organization tests
│   ├── 10-admin/                 ← Admin CRUD tests
│   ├── 11-dashboard/             ← Dashboard tests
│   ├── 12-reports/               ← Report tests
│   └── 13-cross-module/          ← Cross-module workflow tests
│
├── test-results/                 ← Auto-generated test outputs
│   ├── screenshots/              ← Failure screenshots
│   ├── videos/                   ← Failure videos
│   └── traces/                   ← Debug traces
│
└── playwright-report/            ← HTML test report
```

---

## 4. Configuration Explained

File: `playwright.config.js`

| Setting | Value | What It Does |
|---------|-------|-------------|
| `testDir` | `'./tests'` | Where Playwright looks for test files |
| `fullyParallel` | `false` | Tests run one after another (not at the same time) |
| `retries` | `1` | If a test fails, it tries one more time |
| `workers` | `1` | Only one browser open at a time — avoids conflicts |
| `baseURL` | `https://www.staging-buzzworld-v1.iidm.com` | The app's URL |
| `trace` | `'on-first-retry'` | Records a trace file when a test fails and retries |
| `screenshot` | `'only-on-failure'` | Takes a screenshot when a test fails |
| `video` | `'retain-on-failure'` | Records video when a test fails |
| `slowMo` | `800` | **Waits 800ms between each action** so you can see what the browser is doing |

### About `slowMo: 800`
This is the setting that **slows down the browser** so you can watch each step:
- Every click waits 800ms before executing
- Every keystroke waits 800ms
- You can clearly see the cursor move, text being typed, buttons being clicked
- To make it faster, reduce the number (e.g., `200`)
- To make it slower, increase the number (e.g., `1500`)
- For CI/CD (automated pipelines), set it to `0`

---

## 5. Helper Files — What Each One Does

### `helpers/auth.js` — Login & Logout

This is the **most important helper**. Every test needs to log in first.

**Functions:**

| Function | What It Does |
|----------|-------------|
| `login(page, email, password, landingPath)` | Full SSO login flow — navigates to app, redirects to SSO, types credentials, waits for redirect back |
| `loginAsDefault(page)` | Shortcut — logs in as `defaultuser@enterpi.com` |
| `loginAsAdmin(page)` | Shortcut — logs in as admin user |
| `verifyLoggedIn(page)` | Checks the current URL is the app (not SSO) |
| `logout(page)` | Clicks the user menu → Logout → waits for SSO page |
| `getLoginError(page)` | Checks if an error message appeared on the login page |

**How login works internally:**

```
1. page.goto('https://www.staging-buzzworld-v1.iidm.com/quote_for_parts')
   → Browser opens the app URL
   → App detects "not logged in" and redirects to SSO

2. page.waitForURL('**/Login**')
   → Waits until the SSO login page loads

3. pressSequentially('defaultuser@enterpi.com', { delay: 50 })
   → Types email one character at a time (like a human)

4. pressSequentially('Enspirit@625', { delay: 50 })
   → Types password one character at a time

5. click('Sign In')
   → Clicks the login button

6. waitForURL('**/quote_for_parts')
   → Waits for SSO to redirect back to the app

7. waitForTimeout(5000)
   → Gives the React app time to fully render
```

### `helpers/navigation.js` — Page Navigation

| Function | What It Does |
|----------|-------------|
| `navigateTo(page, path)` | Goes to a specific page (e.g., `/all_quotes`) |
| `clickNavItem(page, menuText)` | Clicks a navigation menu item by its text |
| `isNavItemVisible(page, menuText)` | Checks if a menu item is visible on screen |
| `getVisibleNavItems(page)` | Returns a list of all visible menu items |

### `helpers/grid.js` — AG Grid (Tables)

The app uses AG Grid for all data tables (quotes, repairs, orders, etc.).

| Function | What It Does |
|----------|-------------|
| `waitForGridLoad(page)` | Waits until the table shows at least one row |
| `getGridRowCount(page)` | Counts how many rows are in the table |
| `clickGridRow(page, rowIndex)` | Clicks a specific row (0 = first row) |
| `getGridCellValue(page, rowIndex, colId)` | Reads a cell's value |
| `sortGridColumn(page, colId)` | Clicks a column header to sort |
| `isGridLoaded(page)` | Returns true/false if the grid has data |
| `getGridColumnHeaders(page)` | Gets all column header names |

### `helpers/form.js` — Form Interactions

| Function | What It Does |
|----------|-------------|
| `fillInput(page, label, value)` | Fills a text input by its label |
| `selectDropdown(page, label, option)` | Selects from a dropdown |
| `fillDatePicker(page, label, date)` | Fills a date picker |
| `submitForm(page)` | Clicks Save/Submit/Create button |
| `clickButton(page, name)` | Clicks any button by its name |

### `helpers/assertions.js` — Verification Checks

| Function | What It Does |
|----------|-------------|
| `expectToast(page, message)` | Checks for a success/error toast notification |
| `expectUrlContains(page, path)` | Verifies the current URL |
| `expectPageTitle(page, title)` | Checks page heading text |
| `expectVisible(page, text)` | Checks if text is visible on page |
| `expectNotVisible(page, text)` | Checks if text is NOT visible |
| `expectModalVisible(page)` | Checks if a popup dialog appeared |

### `helpers/test-data.js` — Unique Data Generation

| Function | What It Does |
|----------|-------------|
| `uniqueName(prefix)` | Creates `ORG_TEST_1712587200000` — unique every time |
| `testOrg()` | Returns a complete test organization object |
| `testQuote()` | Returns test quote data |
| `testRepair()` | Returns test repair data |

### `fixtures/users.js` — User Credentials

Stores credentials for different user roles:

| User | Email | Role | Landing Page |
|------|-------|------|-------------|
| default | `defaultuser@enterpi.com` | sales | `/quote_for_parts` |
| admin | `admin@enterpi.com` | admin | `/pricing` |

---

## 6. Auth Test Cases — Detailed Breakdown

### AUTH-001: Successful SSO Login ✅ PASSED (22s)

**What it tests:** Can a user log in with valid credentials?

**Steps:**
1. Open the app URL (`staging-buzzworld-v1.iidm.com/quote_for_parts`)
2. Verify browser was redirected to SSO login page (`staging-sso-v1.iidm.com`)
3. Type email: `defaultuser@enterpi.com`
4. Type password: `Enspirit@625`
5. Click "Sign In"
6. Wait for redirect back to the app
7. **Check:** URL contains `/quote_for_parts`
8. **Check:** URL does NOT contain SSO domain

**Why it matters:** If login is broken, nothing else works.

---

### AUTH-002: Login with Invalid Credentials ✅ PASSED (14s)

**What it tests:** Does the app show an error when wrong password is used?

**Steps:**
1. Open the app URL → redirected to SSO
2. Type email: `defaultuser@enterpi.com`
3. Type WRONG password: `WrongPassword123!`
4. Click "Sign In"
5. **Check:** Error message "Invalid Email or Password" appears
6. **Check:** User is still on SSO page (not redirected to the app)

**Why it matters:** Ensures unauthorized users cannot access the app.

---

### AUTH-003: Session Expiry Handling ✅ PASSED (30s)

**What it tests:** When the session expires, is the user redirected to login?

**Steps:**
1. Log in successfully
2. Clear all authentication data (localStorage, sessionStorage, cookies)
3. Try to open a page (`/all_quotes`)
4. **Check:** User is redirected to login page or loading screen

**Why it matters:** Ensures expired sessions don't expose data to unauthorized viewers.

---

### AUTH-004: Admin User Sees Admin Menu Items ✅ PASSED (29s)

**What it tests:** Does an admin user see "Admin" and "Pricing" in the navigation bar?

**Steps:**
1. Log in as default user (has admin access on this environment)
2. Wait for page to fully load
3. **Check:** "Admin" menu item is visible
4. **Check:** "Pricing" menu item is visible

**Why it matters:** Admin-only features should be visible to admin users.

---

### AUTH-005: Sales User Sees Sales Menu Items ✅ PASSED (29s)

**What it tests:** Does a sales user see "Quotes", "Repairs", and "Jobs" in the navigation?

**Steps:**
1. Log in as default user
2. Wait for navigation bar to render
3. **Check:** "Quote" text is visible in nav
4. **Check:** "Repair" text is visible in nav
5. **Check:** "Job" text is visible in nav

**Why it matters:** Each role should see the correct menu items.

---

### AUTH-006: Customer Portal User ⏭️ SKIPPED

**Why skipped:** Customer user credentials are not available yet. This test will be enabled once customer login details are provided.

---

### AUTH-007: Logout Clears Session ✅ PASSED (30s)

**What it tests:** Does clicking "Logout" properly end the session?

**Steps:**
1. Log in successfully
2. Click the user avatar/button in the top-right corner
3. Click "Logout" from the dropdown menu
4. **Check:** Redirected to SSO login page
5. Try to open the app again
6. **Check:** User is NOT automatically logged in — stays on login page

**Why it matters:** Logout must actually clear the session, not just navigate away.

---

### AUTH-008: Role-Based Landing Page ✅ PASSED (32s)

**What it tests:** Does the sales user land on the correct default page after login?

**Steps:**
1. Log in as default (sales) user
2. **Check:** URL after login contains `/quote_for_parts`

**Why it matters:** Different roles should see their relevant page first — salespeople see quotes, admins see pricing.

---

## 7. How to Run the Tests

### Prerequisites
```bash
# Navigate to the project folder
cd /Users/enspirit/Desktop/Playwright_MCP

# Install dependencies (first time only)
npm install

# Install browsers (first time only)
npx playwright install
```

### Run Commands

| Command | What It Does |
|---------|-------------|
| `npx playwright test tests/01-auth/login.spec.js --headed --project=chromium` | Run auth tests in Chrome (visible browser) |
| `npx playwright test tests/01-auth/login.spec.js --project=chromium` | Run auth tests headless (no visible browser, faster) |
| `npx playwright test --headed --project=chromium` | Run ALL tests in Chrome |
| `npx playwright test --project=chromium` | Run ALL tests headless |
| `npx playwright show-report` | Open the HTML test report in browser |

### Watching the Tests
When you run with `--headed`, a Chrome browser opens and you can watch:
- The browser navigating to pages
- Text being typed into fields (with `slowMo: 800` you can read each character)
- Buttons being clicked
- Pages loading and redirecting

### Adjusting Speed
In `playwright.config.js`, change the `slowMo` value:
```javascript
launchOptions: {
  slowMo: 800,    // Current: 800ms pause between actions
  // slowMo: 200, // Faster but still visible
  // slowMo: 1500, // Very slow — good for demos
  // slowMo: 0,   // No delay — fastest (for CI/CD)
},
```

---

## 8. Test Results — Pass/Fail Summary

### Latest Run: April 8, 2026

| # | Test ID | Test Name | Status | Duration |
|---|---------|-----------|--------|----------|
| 1 | AUTH-001 | Successful SSO login with valid credentials | ✅ PASSED | 22.0s |
| 2 | AUTH-002 | Login with invalid credentials | ✅ PASSED | 13.9s |
| 3 | AUTH-003 | Session expiry handling | ✅ PASSED | 30.2s |
| 4 | AUTH-004 | Admin user sees admin menu items | ✅ PASSED | 28.7s |
| 5 | AUTH-005 | Sales user sees sales menu items | ✅ PASSED | 29.1s |
| 6 | AUTH-006 | Customer portal user sees limited menu | ⏭️ SKIPPED | — |
| 7 | AUTH-007 | Logout clears session | ✅ PASSED | 29.5s |
| 8 | AUTH-008 | Role-based landing page | ✅ PASSED | 31.5s |

**Total: 7 passed, 0 failed, 1 skipped | Total time: 3.1 minutes**

---

## 9. Key Problems Solved

### Problem 1: "Invalid Email or Password" During Automation
- **Cause:** SSO server detected Playwright's `fill()` method as automation
- **Fix:** Used `pressSequentially()` to type characters one by one with delays
- **Result:** Login works every time

### Problem 2: Test Fails Because Page Hasn't Loaded Yet
- **Cause:** Playwright clicks elements before the React app has finished rendering
- **Fix:** Added `waitForURL()`, `waitForLoadState()`, and `waitForTimeout()` at key points
- **Result:** Tests wait for the app to be ready before interacting

### Problem 3: SSO Cookies Not Shared Across Domains
- **Cause:** Originally the test logged in at SSO URL, then did `page.goto(app URL)` — cookies weren't transferred
- **Fix:** Navigate to the APP URL first (which redirects to SSO), log in there, and let SSO redirect back with proper cookies
- **Result:** Seamless SSO flow works correctly

### Problem 4: Nav Items Not Found
- **Cause:** Navigation bar shows truncated text on smaller screens (e.g., "Quote" instead of "Quotes")
- **Fix:** Used partial text matching instead of exact matching
- **Result:** Menu items found reliably

---

## 10. Troubleshooting Guide

### Test fails with "Timeout" error
- The app or SSO might be slow or down
- Check if you can manually access `https://www.staging-buzzworld-v1.iidm.com`
- Increase timeout in the test: `test.setTimeout(300000)` (5 minutes)

### Test fails with "Invalid Email or Password"
- Check if the password has expired on the SSO
- Try logging in manually at `https://staging-sso-v1.iidm.com/Login`
- If password expired, reset it via "Forgot Password"

### Browser doesn't open (headless mode)
- Add `--headed` flag: `npx playwright test --headed --project=chromium`

### Tests run too fast to see
- Increase `slowMo` in `playwright.config.js` (e.g., `1500` for very slow)

### Tests run too slow
- Decrease `slowMo` in `playwright.config.js` (e.g., `200` or `0`)

### How to see failure screenshots
- After a failed test, check the `test-results/` folder
- Or run `npx playwright show-report` to see the HTML report with screenshots

---

## 11. Next Steps — What to Build Next

| Week | Module | Tests to Add | Running Total |
|------|--------|-------------|---------------|
| **Week 1** | ✅ **Helpers + Auth** | **8 tests** | **8** |
| Week 2 | Quotes list/create + lifecycle | ~20 tests | 28 |
| Week 3 | Repairs list/create + lifecycle | ~20 tests | 48 |
| Week 4 | Orders + Parts Purchase | ~24 tests | 72 |
| Week 5 | Pricing + Organizations | ~25 tests | 97 |
| Week 6 | Admin CRUD (23 pages) | ~23 tests | 120 |
| Week 7 | Dashboard + Reports + Inventory | ~20 tests | 140 |
| Week 8 | Cross-module + Polish + CI/CD | ~22 tests | 162 |

**Total planned: 162 tests covering every user workflow in the IIDM application.**
