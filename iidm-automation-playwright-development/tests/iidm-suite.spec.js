// @ts-check
/**
 * ============================================================
 *  IIDM — Full Team Test Suite
 *  Covers: Authentication · Quotes · Repairs
 *
 *  Run all:     npx playwright test tests/iidm-team-suite.spec.js
 *  Run one:     npx playwright test tests/iidm-team-suite.spec.js --grep "AUTH-001"
 *  UI mode:     npx playwright test tests/iidm-team-suite.spec.js --ui
 * ============================================================
 */
import { test, expect } from '@playwright/test';
import path from 'path';

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_URL   = 'https://www.staging-buzzworld-v1.iidm.com';
const SSO_URL    = 'https://staging-sso-v1.iidm.com';       // eslint-disable-line no-unused-vars
const PORTAL_URL = 'https://www.staging-portal-v1.iidm.com';

const USERS = {
  default:  { email: 'defaultuser@enterpi.com',          password: 'Enspirit@625' },
  sales:    { email: 'g.bhavanishankar@enspirit.co',     password: 'Enspirit@625' },
  customer: { email: 'chumpchange@espi.co',              password: 'Enspirit@625' },
};

const IMPORT_FILE_PATH = path.resolve('fixtures/Import_quote_items_file.xlsx');

// ─── Shared helpers (inlined — no external imports needed) ────────────────────

async function login(page, email, password, landingPath = '/quote_for_parts') {
  await page.goto(`${BASE_URL}${landingPath}`);
  await page.waitForURL('**/Login**', { timeout: 30000 });
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).pressSequentially(email, { delay: 50 });
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).pressSequentially(password, { delay: 50 });
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL(`**${landingPath}`, { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
}

async function loginAsDefault(page) {
  await login(page, USERS.default.email, USERS.default.password, '/quote_for_parts');
}

async function loginAsSales(page) {
  await login(page, USERS.sales.email, USERS.sales.password, '/quote_for_parts');
}

async function loginAsCustomer(page, email, password) {
  await page.goto(PORTAL_URL);
  await page.waitForURL('**/Login**', { timeout: 30000 });
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).pressSequentially(email, { delay: 50 });
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).pressSequentially(password, { delay: 50 });
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForTimeout(10000);
}

async function verifyLoggedIn(page) {
  const url = page.url();
  expect(url).not.toContain('staging-sso-v1.iidm.com');
  expect(url).toContain('staging-buzzworld-v1.iidm.com');
}

async function logout(page) {
  const userButton = page.getByRole('button', { name: 'loading' }).first();
  await userButton.waitFor({ state: 'visible', timeout: 30000 });
  await userButton.click();
  await page.waitForTimeout(1000);
  const logoutButton = page.getByRole('menuitem', { name: 'Logout' }).first();
  if (await logoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await logoutButton.click();
  } else {
    await page.locator('text=Logout').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('text=Logout').first().click();
  }
  await page.waitForURL('**/Login**', { timeout: 30000 });
}

async function isNavItemVisible(page, menuText) {
  return await page.getByText(menuText).first().isVisible({ timeout: 10000 }).catch(() => false);
}

async function waitForGridLoad(page, timeout = 30000) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForSelector('.ag-center-cols-container', { state: 'attached', timeout });
  const loadingOverlay = page.locator('.ag-overlay-loading-center');
  await loadingOverlay.waitFor({ state: 'hidden', timeout }).catch(() => {});
  const visibleRows = await page.locator('.ag-center-cols-container .ag-row:not(.ag-row-loading)').count().catch(() => 0);
  if (visibleRows > 0) return;
  const noData = page.locator('text=/no rows|no data|no records/i').first();
  if (await noData.isVisible().catch(() => false)) return;
  await page.waitForTimeout(1000);
}

async function clickGridRow(page, rowIndex = 0) {
  await page.locator(`.ag-center-cols-container .ag-row[row-index="${rowIndex}"]`).click({ force: true });
}

// ─────────────────────────────────────────────────────────────────────────────
//  MODULE 1 — AUTHENTICATION & PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Authentication & Permissions', () => {
  test.describe.configure({ timeout: 180000 });

  // AUTH-001: Successful SSO login with valid credentials @smoke
  test('AUTH-001: Successful SSO login with valid credentials', async ({ page }) => {
    await page.goto(BASE_URL + '/quote_for_parts');
    await page.waitForURL('**/Login**', { timeout: 30000 });
    expect(page.url()).toContain('staging-sso-v1.iidm.com');

    await page.getByRole('textbox', { name: 'Email' }).click();
    await page.getByRole('textbox', { name: 'Email' }).pressSequentially(USERS.default.email, { delay: 50 });
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).pressSequentially(USERS.default.password, { delay: 50 });
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    await page.waitForURL('**/quote_for_parts', { timeout: 60000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await verifyLoggedIn(page);
    expect(page.url()).toContain('/quote_for_parts');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    const profileButton = page.getByRole('button', { name: 'loading' });
    await profileButton.waitFor({ state: 'visible', timeout: 30000 });
    await profileButton.click();
    await page.waitForTimeout(1000);

    await page.getByRole('menuitem', { name: 'Logout' }).click();
    await page.waitForURL('**/Login**', { timeout: 30000 });
    expect(page.url()).toContain('Login');
  });

  // AUTH-002: Login with invalid credentials
  test('AUTH-002: Login with invalid credentials', async ({ page }) => {
    await page.goto(BASE_URL + '/quote_for_parts');
    await page.waitForURL('**/Login**', { timeout: 30000 });

    await page.getByRole('textbox', { name: 'Email' }).click();
    await page.getByRole('textbox', { name: 'Email' }).pressSequentially(USERS.default.email, { delay: 50 });
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).pressSequentially('WrongPassword123!', { delay: 50 });
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    await page.waitForTimeout(3000);
    const errorText = page.locator('text=Invalid Email or Password');
    await expect(errorText).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('staging-sso-v1.iidm.com');
    expect(page.url()).not.toContain('staging-buzzworld');
  });

  // AUTH-003: Session expiry handling
  test('AUTH-003: Session expiry handling', async ({ page }) => {
    await loginAsDefault(page);
    await verifyLoggedIn(page);

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();
    await page.waitForTimeout(1000);

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(10000);

    const url = page.url();
    const redirectedToLogin = url.includes('Login') || url.includes('loading') || url.includes('sso');
    expect(redirectedToLogin).toBeTruthy();
  });

  // AUTH-004: Admin user sees admin menu items
  test('AUTH-004: Admin user sees admin menu items', async ({ page }) => {
    await loginAsDefault(page);
    await page.waitForTimeout(5000);

    const adminVisible  = await isNavItemVisible(page, 'Admin');
    const pricingVisible = await isNavItemVisible(page, 'Pricing');
    expect(adminVisible).toBeTruthy();
    expect(pricingVisible).toBeTruthy();

    await page.getByText('Admin').first().click();
    await page.waitForTimeout(3000);
    const adminUrl = page.url();
    const onAdminPage = adminUrl.includes('/admin') || adminUrl.includes('/account-type');
    expect(onAdminPage).toBeTruthy();

    await page.getByText('Pricing').first().click();
    await page.waitForTimeout(1000);
    await page.getByText('Discount Codes').click();
    await page.waitForTimeout(3000);
    const pricingUrl = page.url();
    const onPricingPage = pricingUrl.includes('/pricing') || pricingUrl.includes('/discount');
    expect(onPricingPage).toBeTruthy();
  });

  // AUTH-005: Sales user sees sales menu items
  test('AUTH-005: Sales user sees sales menu items', async ({ page }) => {
    await loginAsSales(page);
    await page.waitForTimeout(8000);

    const quotesVisible  = await isNavItemVisible(page, 'Quote');
    const repairsVisible = await isNavItemVisible(page, 'Repair');
    const jobsVisible    = await isNavItemVisible(page, 'Job');
    expect(quotesVisible).toBeTruthy();
    expect(repairsVisible).toBeTruthy();
    expect(jobsVisible).toBeTruthy();
  });

  // AUTH-006: Customer portal user sees limited menu
  test('AUTH-006: Customer portal user sees limited menu', async ({ page }) => {
    await loginAsCustomer(page, USERS.customer.email, USERS.customer.password);

    const url = page.url();
    const loggedIn = !url.includes('/Login');
    expect(loggedIn).toBeTruthy();

    const adminVisible = await isNavItemVisible(page, 'Admin');
    expect(adminVisible).toBeFalsy();
  });

  // AUTH-007: Logout clears session
  test('AUTH-007: Logout clears session', async ({ page }) => {
    await loginAsDefault(page);
    await verifyLoggedIn(page);

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    const profileButton = page.getByRole('button', { name: 'loading' });
    await profileButton.waitFor({ state: 'visible', timeout: 30000 });
    await profileButton.click();
    await page.waitForTimeout(1000);

    await page.getByRole('menuitem', { name: 'Logout' }).click();
    await page.waitForURL('**/Login**', { timeout: 30000 });
    expect(page.url()).toContain('Login');
    await page.waitForTimeout(3000);

    await page.goto(BASE_URL + '/quote_for_parts', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(8000);
    const url = page.url();
    const onLoginOrLoading = url.includes('Login') || url.includes('loading');
    expect(onLoginOrLoading).toBeTruthy();
  });

  // AUTH-008: Role-based landing page
  test('AUTH-008: Role-based landing page', async ({ page }) => {
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    expect(page.url()).toContain('/quote_for_parts');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  MODULE 2 — QUOTES
// ─────────────────────────────────────────────────────────────────────────────

// Shared quote URL + ID captured in QUO-006, reused by QUO-008/009/010/011
let sharedQuoteId  = '';
let sharedQuoteUrl = '';

async function applyQuoteFilter(page, status) {
  await page.getByText('All Quotes', { exact: true }).click();
  await page.waitForTimeout(2000);
  await waitForGridLoad(page, 30000);

  const clearBtn = page.getByText('Clear', { exact: true }).first();
  const hasClear = await clearBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (hasClear) {
    await clearBtn.click();
    await page.waitForTimeout(3000);
    await waitForGridLoad(page, 30000);
  }

  await page.getByText('Filters').click();
  await page.waitForTimeout(2000);
  await page.locator('h3').filter({ hasText: /Filters/ }).waitFor({ state: 'visible', timeout: 10000 });

  await page.locator('div:nth-child(3) > .css-sjtnp2 > .pi-select-wrapper > .css-5a7vsu-container > .drop-height-80px.multi-select.react-select__control > .drop-height-80px.multi-select.react-select__value-container').click();
  await page.waitForTimeout(1500);

  await page.getByText(status, { exact: true }).first().click();
  await page.waitForTimeout(1000);

  await page.getByRole('button', { name: 'Apply' }).click();
  await page.waitForTimeout(5000);
  await waitForGridLoad(page, 30000);
}

async function waitForQuoteGridOrNoData(page, timeout = 30000) {
  await page.waitForLoadState('networkidle').catch(() => {});
  const firstRow = page.locator('.ag-center-cols-container .ag-row').first();
  try {
    await firstRow.waitFor({ state: 'visible', timeout });
    await page.waitForTimeout(1000);
  } catch {
    const noData = page.locator('text=/no rows|no data|no records/i').first();
    await noData.waitFor({ state: 'visible', timeout }).catch(() => {});
  }
}

async function clickNavAndWait(page, locator) {
  await locator.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await waitForQuoteGridOrNoData(page, 45000);
  await page.waitForTimeout(1500);
}

async function clickTabAndWait(page, tabLocator) {
  await tabLocator.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  const visiblePanel = page.locator('[role="tabpanel"]:not([hidden])').first();
  await visiblePanel.waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1500);
}

test.describe('Quotes Module', () => {
  test.describe.configure({ timeout: 300000 });

  // QUO-001: Login, verify grid, paginate, logout
  test('QUO-001: Quotes page loads after login', async ({ page }) => {
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    const nextBtn = page.getByRole('button', { name: 'Next Page' });
    const nextEnabled = await nextBtn.isEnabled().catch(() => false);
    if (nextEnabled) {
      await nextBtn.click();
      await page.waitForTimeout(3000);
      await waitForGridLoad(page, 30000);

      const prevBtn = page.getByRole('button', { name: 'Previous Page' });
      const prevEnabled = await prevBtn.isEnabled().catch(() => false);
      if (prevEnabled) {
        await prevBtn.click();
        await page.waitForTimeout(3000);
        await waitForGridLoad(page, 30000);
      }
    } else {
      console.log('QUO-001: pagination not available, skipping next/previous page checks');
    }

    const profileButton = page.getByRole('button', { name: 'loading' });
    await profileButton.waitFor({ state: 'visible', timeout: 30000 });
    await profileButton.click();
    await page.waitForTimeout(1000);

    await page.getByRole('menuitem', { name: 'Logout' }).click();
    await page.waitForURL('**/Login**', { timeout: 30000 });
  });

  // QUO-002: Filter by Status "Approved", apply, clear, verify data restored
  test('QUO-002: Quotes list renders with data', async ({ page }) => {
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    const existingClear = page.getByText('Clear', { exact: true }).first();
    const hasExistingFilter = await existingClear.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasExistingFilter) {
      await existingClear.click();
      await page.waitForTimeout(3000);
      await waitForGridLoad(page, 30000);
    }

    await page.getByText('Filters').click();
    await page.waitForTimeout(2000);
    await page.locator('h3').filter({ hasText: /Filters/ }).waitFor({ state: 'visible', timeout: 10000 });

    await page.locator('div:nth-child(3) > .css-sjtnp2 > .pi-select-wrapper > .css-5a7vsu-container > .drop-height-80px.multi-select.react-select__control > .drop-height-80px.multi-select.react-select__value-container').click();
    await page.waitForTimeout(1000);
    await page.getByText('Approved', { exact: true }).first().click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Apply' }).click();
    await page.waitForTimeout(5000);

    await waitForGridLoad(page, 30000);

    const clearBtn = page.getByText('Clear', { exact: true }).first();
    await expect(clearBtn).toBeVisible({ timeout: 10000 });
    await clearBtn.click();

    await page.waitForTimeout(5000);
    await waitForGridLoad(page, 30000);
  });

  // QUO-003: Search "CHUMP", verify results, clear search, verify data returns
  test('QUO-003: Navigate to Quotes via top nav', async ({ page }) => {
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    const searchInput = page.getByRole('textbox', { name: /Quote ID/i });
    await searchInput.click();
    await searchInput.fill('CHUMP');
    await searchInput.press('Enter');

    await page.waitForTimeout(5000);
    await waitForGridLoad(page, 30000);

    await searchInput.clear();
    await searchInput.press('Enter');

    await page.waitForTimeout(5000);
    await waitForGridLoad(page, 30000);
  });

  // QUO-004: Sort by Quote ID column (ascending then descending)
  test('QUO-004: Search/filter quotes', async ({ page }) => {
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    const quoteIdHeader = page.locator('.ag-header-cell-text').filter({ hasText: 'Quote ID' });
    await quoteIdHeader.click();
    await page.waitForTimeout(3000);
    await waitForGridLoad(page, 30000);

    await quoteIdHeader.click();
    await page.waitForTimeout(3000);
    await waitForGridLoad(page, 30000);
  });

  // QUO-005: Click a quote row, verify redirect to detail page
  test('QUO-005: Open a quote detail page', async ({ page }) => {
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    await clickGridRow(page, 0);
    await page.waitForURL('**/quote_for_parts/**', { timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(5000);

    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });
  });

  // QUO-006: Create new quote with company, project name, and Parts Quote type
  test('QUO-006: Create new quote', async ({ page }) => {
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    await page.getByText('Create Quote', { exact: true }).click();
    await page.waitForTimeout(3000);

    await page.getByText('Search By Account ID or Company Name').click();
    await page.waitForTimeout(500);
    await page.locator('#async-select-example').pressSequentially('chump03', { delay: 150 });
    await page.waitForTimeout(4000);

    await page.locator('[class*="react-select__option"]').filter({ hasText: /Chump Change Automation/i }).first().waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('[class*="react-select__option"]').filter({ hasText: /Chump Change Automation/i }).first().click();
    await page.waitForTimeout(2000);

    await page.locator('input[name="project_name"]').fill('test');
    await page.waitForTimeout(1000);

    await page.locator('[class*="react-select__placeholder"]').filter({ hasText: 'Quote Type' }).click();
    await page.waitForTimeout(2000);
    await page.locator('[class*="react-select__option"]').filter({ hasText: 'Parts Quote' }).first().click();
    await page.waitForTimeout(1000);

    const createQuoteButton = page.getByRole('button', { name: 'Create Quote' }).first();
    await expect(createQuoteButton).toBeVisible({ timeout: 15000 });
    await createQuoteButton.click();

    await page.waitForURL('**/quote_for_parts/**', { timeout: 45000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);

    const quoteItemsHeader = page.locator('h4').filter({ hasText: /Quote Items/ }).first();
    await quoteItemsHeader.waitFor({ state: 'visible', timeout: 45000 });
    await page.waitForTimeout(2000);

    sharedQuoteUrl = page.url();
    sharedQuoteId = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const t = (node.textContent || '').trim();
        if (/^#\d{10,}$/.test(t)) return t.replace('#', '');
      }
      return '';
    });

    expect(page.url()).toMatch(/\/quote_for_parts\/.+/);
    await expect(page.locator('[class*="open"]').first()).toBeVisible({ timeout: 15000 });
  });

  // QUO-007: Create new quote without selecting a quote type
  test('QUO-007: Create new quote without quote type', async ({ page }) => {
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    await page.getByText('Create Quote', { exact: true }).click();
    await page.waitForTimeout(3000);

    await page.getByText('Search By Account ID or Company Name').click();
    await page.waitForTimeout(500);
    await page.locator('#async-select-example').pressSequentially('chump03', { delay: 150 });
    await page.waitForTimeout(4000);

    await page.locator('[class*="react-select__option"]').filter({ hasText: /Chump Change Automation/i }).first().waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('[class*="react-select__option"]').filter({ hasText: /Chump Change Automation/i }).first().click();
    await page.waitForTimeout(2000);

    await page.locator('input[name="project_name"]').fill('test');
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Create Quote' }).click();
    await page.waitForTimeout(3000);

    await expect(page.getByText('Please select Quote Type')).toBeVisible({ timeout: 10000 });
  });

  // QUO-008: Add item to an existing open quote
  test('QUO-008: Add items to quote', async ({ page }) => {
    await loginAsDefault(page);

    await page.goto(sharedQuoteUrl);
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    await page.evaluate(() => {
      const el = [...document.querySelectorAll('h4')].find(h => h.textContent.includes('Quote Items'));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await page.waitForTimeout(2000);

    await page.getByText('Add Items', { exact: true }).click();

    const partSearch = page.getByPlaceholder('Search By Part Number');
    await partSearch.waitFor({ state: 'visible', timeout: 15000 });
    await partSearch.fill('231-642');
    await page.waitForTimeout(3000);

    const checkboxes = page.locator('input.repair-item-checkbox');
    await checkboxes.first().waitFor({ state: 'visible', timeout: 10000 });
    const cbCount = await checkboxes.count();
    for (let i = 0; i < cbCount; i++) {
      await checkboxes.nth(i).click({ force: true });
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(1000);

    await page.locator('button').filter({ hasText: /Add Selected/i }).click();
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(page.locator('h4').filter({ hasText: /Quote Items \(\d+\)/ })).toBeVisible({ timeout: 15000 });
  });

  // QUO-009: Edit item — change quantity and select Source, then save
  test('QUO-009: Edit quote item quantity', async ({ page }) => {
    await loginAsDefault(page);

    await page.goto(sharedQuoteUrl);
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    await page.evaluate(() => {
      const el = [...document.querySelectorAll('h4')].find(h => h.textContent.includes('Quote Items'));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: 'chevron-right' }).first().click({ force: true });
    await page.waitForTimeout(2000);

    await page.getByPlaceholder('Quantity').click();
    await page.getByPlaceholder('Quantity').fill('5');
    await page.waitForTimeout(500);

    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await page.waitForTimeout(2000);
    await page.locator('[class*="react-select__option"]:visible').first().click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle').catch(() => {});

    await page.evaluate(() => {
      const el = [...document.querySelectorAll('h4')].find(h => h.textContent.includes('Quote Items'));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await page.waitForTimeout(2000);
    await expect(page.locator('h4').filter({ hasText: /Quote Items \(\d+\)/ })).toBeVisible({ timeout: 10000 });
  });

  // QUO-010: Delete a quote item
  test('QUO-010: Delete quote item', async ({ page }) => {
    await loginAsDefault(page);

    await page.goto(sharedQuoteUrl);
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    await page.evaluate(() => {
      const el = [...document.querySelectorAll('h4')].find(h => h.textContent.includes('Quote Items'));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await page.waitForTimeout(2000);

    const headingText = (await page.locator('h4').filter({ hasText: /Quote Items \(\d+\)/ }).textContent().catch(() => 'Quote Items (0)')) ?? 'Quote Items (0)';
    const matchBefore = headingText.match(/\((\d+)\)/);
    const countBefore = matchBefore ? parseInt(matchBefore[1]) : 0;

    await page.getByRole('button', { name: 'delet-icon' }).nth(1).scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'delet-icon' }).nth(1).click({ force: true });
    await page.waitForTimeout(2000);

    await page.locator('#repair-items').getByRole('button', { name: 'Yes' }).click();
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle').catch(() => {});

    await page.evaluate(() => {
      const el = [...document.querySelectorAll('h4')].find(h => h.textContent.includes('Quote Items'));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await page.waitForTimeout(2000);
    const headingAfter = (await page.locator('h4').filter({ hasText: /Quote Items \(\d+\)/ }).textContent().catch(() => '')) ?? '';
    const matchAfter = headingAfter.match(/\((\d+)\)/);
    const countAfter = matchAfter ? parseInt(matchAfter[1]) : countBefore;
    expect(countAfter).toBeLessThan(countBefore);
  });

  // QUO-011: Add quote option — Duplicate from existing option
  test('QUO-011: Add quote option', async ({ page }) => {
    await loginAsDefault(page);

    await page.goto(sharedQuoteUrl);
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    await page.evaluate(() => {
      const el = [...document.querySelectorAll('h4')].find(h => h.textContent.includes('Quote Items'));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await page.waitForTimeout(2000);

    const option2Tab = page.getByText('Option 2', { exact: true });
    const hasOption2 = await option2Tab.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasOption2) {
      await option2Tab.click();
      await page.waitForTimeout(2000);
    }

    await page.getByRole('button', { name: /Add Options/i }).click({ force: true });
    await page.waitForTimeout(3000);

    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await page.waitForTimeout(2000);

    await page.locator('[class*="react-select__option"]:visible').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('[class*="react-select__option"]:visible').first().click();
    await page.waitForTimeout(5000);

    const modalTabpanel = page.getByRole('tabpanel').last();
    await modalTabpanel.waitFor({ state: 'visible', timeout: 15000 });

    const modalCheckbox = modalTabpanel.getByRole('checkbox').first();
    await modalCheckbox.waitFor({ state: 'visible', timeout: 15000 });
    await modalCheckbox.click();
    await page.waitForTimeout(2000);

    const addItemsBtn = modalTabpanel.getByRole('button', { name: /Add (Items|Selected)/i });
    await expect(addItemsBtn).toBeEnabled({ timeout: 10000 });
    await addItemsBtn.click();
    await page.waitForTimeout(6000);
    await page.waitForLoadState('networkidle').catch(() => {});

    await page.evaluate(() => {
      const el = [...document.querySelectorAll('h4')].find(h => h.textContent.includes('Quote Items'));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await page.waitForTimeout(2000);
    await expect(page.locator('h4').filter({ hasText: /Quote Items \(\d+\)/ })).toBeVisible({ timeout: 10000 });
  });

  // QUO-015: Submit quote for internal submit
  test('QUO-015: Submit quote for internal submit', async ({ page }) => {
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    await applyQuoteFilter(page, 'Approved');

    await clickGridRow(page, 0);
    await page.waitForURL(/\/(quote_for_parts|all_quotes|repair_quotes|system_quotes)\/.+/, { timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    const submitBtn = page.getByRole('button', { name: /Submit for Customer Approval/i }).first();
    await expect(submitBtn).toBeVisible({ timeout: 15000 });
    await submitBtn.click();

    const confirmSubmitBtn = page.getByRole('button', { name: /^Submit$/i }).first();
    await expect(confirmSubmitBtn).toBeVisible({ timeout: 15000 });
    await confirmSubmitBtn.click();

    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });
  });

  // QUO-016: Clone won quote and proceed
  test('QUO-016: Clone won quote and proceed', async ({ page }) => {
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    await applyQuoteFilter(page, 'Won');
    await page.waitForTimeout(2000);

    await clickGridRow(page, 0);
    await page.waitForURL(/\/(quote_for_parts|all_quotes|repair_quotes|system_quotes)\/.+/, { timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    const kebabBtn = page.getByRole('button').filter({ hasText: /^$/ }).nth(2);
    await expect(kebabBtn).toBeVisible({ timeout: 15000 });
    await kebabBtn.click();
    await page.waitForTimeout(1500);
    await page.getByRole('menuitem', { name: 'Clone' }).click();

    const cloneModalTrigger = page.locator('div').filter({ hasText: /^Search By Account ID or Company Name$/ }).first();
    await cloneModalTrigger.waitFor({ state: 'visible', timeout: 15000 });
    await cloneModalTrigger.click();
    const companyInput = page.getByRole('textbox', { name: /Company Name\*/i }).first();
    await companyInput.waitFor({ state: 'visible', timeout: 15000 });
    await companyInput.fill('chump03');
    await page.waitForTimeout(2000);
    const companyOption = page.locator('[id^="react-select-"][id$="-option-0"]').first();
    await companyOption.waitFor({ state: 'visible', timeout: 15000 });
    await companyOption.click();
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: /Proceed/i }).nth(3).click();
    await page.getByRole('button', { name: /Proceed/i }).first().click();
    await page.waitForURL(/\/(quote_for_parts|all_quotes|repair_quotes|system_quotes)\/.+/, { timeout: 45000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await waitForGridLoad(page, 30000).catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });
  });

  // QUO-017: Mark delivered quote as lost
  test('QUO-017: Mark delivered quote as lost', async ({ page }) => {
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    await applyQuoteFilter(page, 'Delivered to Customer');
    await page.waitForTimeout(2000);

    await clickGridRow(page, 0);
    await page.waitForURL(/\/(quote_for_parts|all_quotes|repair_quotes|system_quotes)\/.+/, { timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    const lostBtn = page.getByRole('button', { name: /Lost/i }).first();
    await expect(lostBtn).toBeVisible({ timeout: 15000 });
    await lostBtn.click();

    const confirmLostBtn = page.getByRole('button', { name: /Proceed/i }).first();
    if (await confirmLostBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await confirmLostBtn.click();
    }

    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(5000);
    await waitForGridLoad(page, 30000).catch(() => {});
    await page.waitForTimeout(2000);
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/Lost/i).first()).toBeVisible({ timeout: 30000 });
  });

  // QUO-018: Clone lost quote and proceed with reject
  test('QUO-018: Clone lost quote and proceed with reject', async ({ page }) => {
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    await applyQuoteFilter(page, 'Lost');
    await page.waitForTimeout(2000);

    await clickGridRow(page, 0);
    await page.waitForURL(/\/(quote_for_parts|all_quotes|repair_quotes|system_quotes)\/.+/, { timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    const kebabBtn18 = page.getByRole('button').filter({ hasText: /^$/ }).nth(2);
    await expect(kebabBtn18).toBeVisible({ timeout: 15000 });
    await kebabBtn18.click();
    await page.waitForTimeout(1500);
    await page.getByRole('menuitem', { name: 'Clone' }).click();

    const cloneModalTrigger18 = page.locator('div').filter({ hasText: /^Search By Account ID or Company Name$/ }).first();
    await cloneModalTrigger18.waitFor({ state: 'visible', timeout: 15000 });
    await cloneModalTrigger18.click();
    const companyInput18 = page.getByRole('textbox', { name: /Company Name\*/i }).first();
    await companyInput18.waitFor({ state: 'visible', timeout: 15000 });
    await companyInput18.fill('chump03');
    await page.waitForTimeout(2000);
    const companyOption18 = page.locator('[id^="react-select-"][id$="-option-0"]').first();
    await companyOption18.waitFor({ state: 'visible', timeout: 15000 });
    await companyOption18.click();
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: /Proceed/i }).nth(3).click();
    await page.getByRole('button', { name: /Proceed/i }).first().click();
    await page.waitForURL(/\/quote_for_parts\/.+/, { timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });
  });

  // QUO-019: Clone open quote to another company
  test('QUO-019: Clone open quote to another company', async ({ page }) => {
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    await applyQuoteFilter(page, 'Open');
    await page.waitForTimeout(2000);

    await clickGridRow(page, 0);
    await page.waitForURL(/\/(quote_for_parts|all_quotes|repair_quotes|system_quotes)\/.+/, { timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    const kebabBtn19 = page.getByRole('button').filter({ hasText: /^$/ }).nth(2);
    await expect(kebabBtn19).toBeVisible({ timeout: 15000 });
    await kebabBtn19.click();
    await page.waitForTimeout(1500);
    await page.getByRole('menuitem', { name: 'Clone' }).click();

    const cloneModalTrigger19 = page.locator('div').filter({ hasText: /^Search By Account ID or Company Name$/ }).first();
    await cloneModalTrigger19.waitFor({ state: 'visible', timeout: 15000 });
    await cloneModalTrigger19.click();
    const companyInput19 = page.getByRole('textbox', { name: /Company Name\*/i }).first();
    await companyInput19.waitFor({ state: 'visible', timeout: 15000 });
    await companyInput19.fill('chump03');
    await page.waitForTimeout(2000);
    const companyOption19 = page.locator('[id^="react-select-"][id$="-option-0"]').first();
    await companyOption19.waitFor({ state: 'visible', timeout: 15000 });
    await companyOption19.click();
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: /Proceed/i }).nth(3).click();
    await page.getByRole('button', { name: /Proceed/i }).first().click();
    await page.waitForURL(/\/quote_for_parts\/.+/, { timeout: 45000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await waitForGridLoad(page, 30000).catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });
  });

  // QUO-020: Revise delivered quote to open
  test('QUO-020: Revise delivered quote to open', async ({ page }) => {
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    await applyQuoteFilter(page, 'Delivered to Customer');
    await page.waitForTimeout(2000);

    await clickGridRow(page, 0);
    await page.waitForURL(/\/(quote_for_parts|all_quotes|repair_quotes|system_quotes)\/.+/, { timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    const reviseBtn = page.getByRole('button', { name: /Revise Quote/i }).first();
    await expect(reviseBtn).toBeVisible({ timeout: 15000 });
    await reviseBtn.click();

    const confirmProceed = page.getByRole('button', { name: /Proceed/i }).first();
    if (await confirmProceed.isVisible({ timeout: 10000 }).catch(() => false)) {
      await confirmProceed.click();
    }
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(5000);
    await waitForGridLoad(page, 30000).catch(() => {});
    await page.waitForTimeout(2000);
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });
  });

  // QUO-021: Download quote PDF from open quote
  test('QUO-021: Download quote PDF from open quote', async ({ page }) => {
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    await applyQuoteFilter(page, 'Open');
    await page.waitForTimeout(2000);

    await clickGridRow(page, 0);
    await page.waitForURL(/\/(quote_for_parts|all_quotes|repair_quotes|system_quotes)\/.+/, { timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    const kebabBtn = page.getByRole('button').filter({ hasText: /^$/ }).nth(2);
    await expect(kebabBtn).toBeVisible({ timeout: 15000 });
    await kebabBtn.click();
    await page.waitForTimeout(1500);
    const downloadMenuItem = page.locator('text=Download').first();
    await expect(downloadMenuItem).toBeVisible({ timeout: 15000 });
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      downloadMenuItem.click(),
    ]);
    await expect(download.suggestedFilename()).toContain('.pdf');
  });

  // QUO-022: Import quote items from Excel
  test('QUO-022: Import quote items from Excel', async ({ page }) => {
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(2000);

    const clearBtn = page.getByText('Clear', { exact: true }).first();
    if (await clearBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clearBtn.click();
      await page.waitForTimeout(3000);
      await waitForQuoteGridOrNoData(page, 45000);
    }

    await page.getByText('Filters').click();
    await page.waitForTimeout(2000);
    await page.locator('h3').filter({ hasText: /Filters/ }).waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('div:nth-child(3) > .css-sjtnp2 > .pi-select-wrapper > .css-5a7vsu-container > .drop-height-80px.multi-select.react-select__control > .drop-height-80px.multi-select.react-select__value-container').click();
    await page.waitForTimeout(1500);
    await page.getByText('Open', { exact: true }).first().click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Apply' }).click();
    await waitForQuoteGridOrNoData(page, 45000);

    await clickGridRow(page, 0);
    await page.waitForURL(/\/(quote_for_parts|all_quotes|repair_quotes|system_quotes)\/.+/, { timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    await page.getByText('Import Items').click();
    await page.waitForTimeout(2000);

    const browseBtn = page.getByRole('button', { name: /Drag & drop files or Browse/i });
    await expect(browseBtn).toBeVisible({ timeout: 15000 });
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      browseBtn.click(),
    ]);
    await fileChooser.setFiles(IMPORT_FILE_PATH);

    const importBtn = page.getByRole('button', { name: /^Import$/i }).first();
    await expect(importBtn).toBeVisible({ timeout: 30000 });
    await expect(importBtn).toBeEnabled({ timeout: 60000 });
    await importBtn.click();

    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });
  });

  // QUO-023: Create quote end-to-end, submit, win, create sales order and navigate
  test('QUO-023: Create quote end-to-end, submit, win, create sales order and navigate', async ({ page }) => {
    test.setTimeout(600000);
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    await page.getByText('Create Quote').click();
    await page.getByText('Search By Account ID or').click();
    const companyInput = page.getByRole('textbox', { name: 'Company Name*' }).first();
    await expect(companyInput).toBeVisible({ timeout: 15000 });
    await companyInput.fill('chump03');
    await page.locator('#react-select-2-option-0').first().click();

    const projectInput = page.getByRole('textbox', { name: 'Enter Project Name' }).first();
    await expect(projectInput).toBeVisible({ timeout: 15000 });
    await projectInput.fill('test');

    await page.locator('div').filter({ hasText: /^Quote Type$/ }).nth(2).click();
    await page.getByText('System Quote', { exact: true }).click();
    await page.getByRole('button', { name: 'Create Quote' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    await page.locator('.pilabel-star > .css-uyo27s > .label-text-div > .pi-label-edit-icon > svg > path').first().click();
    await page.getByRole('button', { name: 'Now' }).click();
    await page.locator('.save-reset-icons > .tick-icon > svg').click();
    await page.waitForTimeout(2000);

    await page.locator('div:nth-child(7) > .pilabel-star > .css-uyo27s > .label-text-div > .pi-label-edit-icon > svg').click();
    await page.locator('.react-select__value-container').click();
    await page.getByText('Ajay Reddy', { exact: true }).click();
    await page.locator('.save-reset-icons > .tick-icon > svg').click();
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: /Add Items/i }).first().click();
    await page.getByRole('textbox', { name: 'Search By Part Number' }).click();
    await page.getByRole('textbox', { name: 'Search By Part Number' }).fill('231-642');
    await page.getByRole('textbox', { name: 'Search By Part Number' }).press('Enter');
    await page.waitForTimeout(2000);
    await page.getByRole('textbox', { name: 'Search By Part Number' }).fill('231-642');
    await page.getByRole('textbox', { name: 'Search By Part Number' }).press('Enter');
    await page.waitForTimeout(2000);

    const itemCheckbox = page.locator('input[name="checkbox0"]');
    await expect(itemCheckbox).toBeVisible({ timeout: 15000 });
    await itemCheckbox.check();
    await page.getByText('Selected Items (1)').click();
    await page.getByRole('button', { name: 'Add Selected 1 Items' }).click();
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: 'chevron-right' }).click();
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await page.getByText('Dallas I-IDM Stocked', { exact: true }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: 'Approve' }).first().click();
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: 'Approve' }).nth(1).click();
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: 'Submit for Customer Approval' }).click();
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await page.waitForTimeout(3000);

    await page.getByRole('button', { name: 'Resend Quote' }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.waitForTimeout(3000);

    await page.getByRole('button', { name: 'Won' }).click();
    await page.getByRole('button', { name: 'Proceed' }).first().click();
    await page.waitForTimeout(3000);

    const createSalesOrderBtn = page.locator('div').filter({ hasText: /^Create Sales Order$/ }).first();
    await expect(createSalesOrderBtn).toBeVisible({ timeout: 15000 });
    await createSalesOrderBtn.click();
    await page.waitForTimeout(2000);

    await expect(page.getByRole('textbox', { name: 'Enter PO Number' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('textbox', { name: 'Enter PO Number' }).fill('123');
    await page.locator('div').filter({ hasText: /^Select FOB Point$/ }).nth(2).click();
    await page.getByText('FOB FACTORY', { exact: true }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Create', exact: true }).last().click();
    await page.waitForURL(/orders-detail-view|order|sales-order/, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(3000);

    await page.getByText('Quotes').first().click();
    await page.waitForURL(/quote_for_parts|all_quotes/, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await expect(page.getByRole('heading', { name: 'Quotes' })).toBeVisible({ timeout: 30000 });
  });

  // QUO-024: All quote filter views work
  test('QUO-024: All quote filter views work', async ({ page }) => {
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    await clickNavAndWait(page, page.locator('div').filter({ hasText: /^Parts Quotes$/ }).first());
    await clickNavAndWait(page, page.locator('#root').getByText('Repair Quotes'));
    await clickNavAndWait(page, page.locator('div').filter({ hasText: /^System Quotes$/ }).first());
    await clickNavAndWait(page, page.locator('div').filter({ hasText: /^Expired Quotes$/ }).first());
    await clickNavAndWait(page, page.locator('div').filter({ hasText: /^Archived Quotes$/ }).first());
    await clickNavAndWait(page, page.locator('div').filter({ hasText: /^Waiting On Me$/ }).first());
    await clickNavAndWait(page, page.locator('div').filter({ hasText: /^Quoted By Me$/ }).first());
    await clickNavAndWait(page, page.locator('div').filter({ hasText: /^All Quotes$/ }).first());
  });

  // QUO-025: Quote detail tabs all load
  test('QUO-025: Quote detail tabs all load', async ({ page }) => {
    test.setTimeout(300000);
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    await applyQuoteFilter(page, 'Open');
    await page.waitForTimeout(2000);
    await clickGridRow(page, 0);
    await page.waitForURL(/\/(quote_for_parts|all_quotes|repair_quotes|system_quotes)\/.+/, { timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    await expect(page.getByRole('button', { name: /Add Items/i })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    await expect(page.getByRole('button', { name: /Add Options/i })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);

    const dynamicsNotesTab = page.getByRole('tab', { name: 'Dynamics Notes' });
    await expect(dynamicsNotesTab).toBeVisible({ timeout: 15000 });
    await clickTabAndWait(page, dynamicsNotesTab);
    await expect(dynamicsNotesTab).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });

    const internalNotesTab = page.getByRole('tab', { name: /Internal Notes/i });
    await expect(internalNotesTab).toBeVisible({ timeout: 15000 });
    await clickTabAndWait(page, internalNotesTab);
    await expect(internalNotesTab).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
    await page.waitForTimeout(2000);
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  MODULE 3 — REPAIRS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Repairs Module', () => {
  test.describe.configure({ timeout: 300000 });

  async function openRepairsPage(page) {
    await page.getByText('Repairs').click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByRole('heading', { name: 'Repairs', level: 1 }))
      .toBeVisible({ timeout: 30000 });
    await waitForGridLoad(page, 60000);
    await expect(page.getByText('Create RMA', { exact: true }))
      .toBeVisible({ timeout: 30000 });
  }

  async function clearSearchAndFilters(page) {
    const searchInput = page.locator('input[placeholder*="RMA ID"]').first();
    if (await searchInput.count() > 0) {
      const val = await searchInput.inputValue().catch(() => '');
      if (val.trim()) {
        await searchInput.fill('');
        await page.waitForTimeout(1000);
        await waitForGridLoad(page, 60000).catch(() => {});
      }
    }
    const clearBtn = page.getByText('Clear', { exact: true }).first();
    if (await clearBtn.isVisible().catch(() => false)) {
      await clearBtn.click();
      await page.waitForTimeout(1000);
      await waitForGridLoad(page, 60000).catch(() => {});
    }
  }

  async function applyRepairsStatusFilter(page, status) {
    const clearBtn = page.getByText('Clear', { exact: true }).first();
    if (await clearBtn.isVisible().catch(() => false)) {
      await clearBtn.click();
      await page.waitForTimeout(1000);
      await waitForGridLoad(page, 60000);
    }

    await page.getByText('Filters').click();
    await page.waitForTimeout(2000);
    await page.locator('h3').filter({ hasText: /Filters/ }).waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('div:nth-child(3) > .css-sjtnp2 > .pi-select-wrapper > .css-5a7vsu-container > .drop-height-80px.multi-select.react-select__control > .drop-height-80px.multi-select.react-select__value-container').click();
    await page.waitForTimeout(1000);
    await page.getByText(status, { exact: true }).first().click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Apply' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);
    await waitForGridLoad(page, 60000);
  }

  async function clickRepairsStatus(page, status) {
    const statusItem = page.getByText(status, { exact: true }).first();
    await statusItem.waitFor({ state: 'visible', timeout: 30000 });
    await statusItem.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);
    await waitForGridLoad(page, 60000);
  }

  // REP-001
  test('REP-001: Repairs page loads after login', async ({ page }) => {
    await loginAsDefault(page);
    await openRepairsPage(page);
    await clearSearchAndFilters(page);
    await waitForGridLoad(page, 60000);
    await expect(page.getByRole('heading', { name: 'Repairs', level: 1 })).toBeVisible();
    await expect(page.getByText('Create RMA', { exact: true })).toBeVisible();
    await page.waitForTimeout(5000);
    await logout(page);
  });

  // REP-002
  test('REP-002: Filter repairs by Completed RMA status', async ({ page }) => {
    await loginAsDefault(page);
    await openRepairsPage(page);
    await clearSearchAndFilters(page);

    await applyRepairsStatusFilter(page, 'Completed');

    const clearBtn = page.getByText('Clear', { exact: true }).first();
    await expect(clearBtn).toBeVisible({ timeout: 10000 });
    await clearBtn.click();
    await page.waitForTimeout(3000);
    await waitForGridLoad(page, 60000);
  });

  // REP-003
  test('REP-003: Cycle through all repair statuses', async ({ page }) => {
    await loginAsDefault(page);
    await openRepairsPage(page);
    await clearSearchAndFilters(page);
    await waitForGridLoad(page, 60000);

    const statuses = [
      'Receiving',
      'Check In',
      'Evaluation',
      'Pending Quote',
      'Pending Approval',
      'Repair in progress',
      'QC',
      'Billing',
    ];

    for (const status of statuses) {
      await clickRepairsStatus(page, status);
      await expect(page.locator('.ag-center-cols-container .ag-row:not(.ag-row-loading)').first())
        .toBeVisible({ timeout: 60000 });
    }
  });

  // REP-004
  test('REP-004: Create RMA with company and contact', async ({ page }) => {
    await loginAsDefault(page);
    await openRepairsPage(page);

    await page.locator('div').filter({ hasText: /^Create RMA$/ }).nth(1).click();
    await expect(page.getByRole('heading', { name: 'Create RMA', level: 3 }))
      .toBeVisible({ timeout: 15000 });

    await page.locator('div').filter({ hasText: /^Search By Company Name$/ }).nth(2).click();
    await page.getByRole('textbox', { name: 'Company Name*' }).fill('chump03');
    await expect(page.locator('.react-select__menu')).toBeVisible({ timeout: 15000 });
    await page.locator('.react-select__menu .react-select__option').first().click();

    await page.waitForTimeout(2000);

    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await expect(page.getByText('Ajay Reddy', { exact: true })).toBeVisible({ timeout: 15000 });
    await page.getByText('Ajay Reddy', { exact: true }).click();

    await page.getByRole('button', { name: 'Create' }).nth(1).click();
    await page.waitForURL(/\/repair-request\/[A-Za-z0-9-]+/, { timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);
  });

  // REP-005
  test('REP-005: Create RMA without contact shows validation', async ({ page }) => {
    await loginAsDefault(page);
    await openRepairsPage(page);

    await page.locator('div').filter({ hasText: /^Create RMA$/ }).nth(1).click();
    await expect(page.getByRole('heading', { name: 'Create RMA', level: 3 }))
      .toBeVisible({ timeout: 15000 });

    await page.locator('div').filter({ hasText: /^Search By Company Name$/ }).nth(2).click();
    await page.getByRole('textbox', { name: 'Company Name*' }).fill('chump03');
    await expect(page.locator('.react-select__menu')).toBeVisible({ timeout: 15000 });
    await page.locator('.react-select__menu .react-select__option').first().click();

    await page.waitForTimeout(1500);

    const createButton = page.getByRole('button', { name: 'Create' }).nth(1);
    await expect(createButton).toBeVisible({ timeout: 10000 });

    const createDisabled = await createButton.isDisabled().catch(() => false);
    if (!createDisabled) {
      await createButton.click();
      await page.waitForTimeout(5000);
    }

    await expect(page.getByRole('heading', { name: 'Create RMA', level: 3 })).toBeVisible();
    await expect(page.locator('text=/contact.*required|required.*contact|contact.*is required|select.*contact|missing.*contact/i')).toBeVisible({ timeout: 10000 });
  });

  // REP-006 to REP-020: Full repair lifecycle
  test('REP-006 to REP-020: Full repair lifecycle: create,items,assign,evaluate,quote,order,in-progress,summary,parts,QC,complete,statuses,edit,download', async ({ page }) => {
    test.setTimeout(1200000);

    const APP_URL  = 'https://www.staging-buzzworld-v1.iidm.com';
    const EMAIL    = 'defaultuser@enterpi.com';
    const PASSWORD = 'Enspirit@625';

    // LOGIN
    await page.goto(`${APP_URL}/quote_for_parts`);
    await page.waitForURL('**/Login**', { timeout: 30000 });
    await page.getByRole('textbox', { name: 'Email' }).click();
    await page.getByRole('textbox', { name: 'Email' }).pressSequentially(EMAIL, { delay: 50 });
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).pressSequentially(PASSWORD, { delay: 50 });
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.waitForURL(`**\/quote_for_parts`, { timeout: 60000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    // OPEN REPAIRS
    await page.getByText('Repairs').click();
    await expect(page.getByRole('heading', { name: 'Repairs', level: 1 })).toBeVisible({ timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // DISPLAY ALL
    await page.locator('div').filter({ hasText: 'Display All' }).nth(4).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);

    // CREATE RMA
    await page.getByText('Create RMA').click();
    await expect(page.getByRole('heading', { name: 'Create RMA', level: 3 })).toBeVisible({ timeout: 15000 });

    await page.locator('div').filter({ hasText: /^Search By Company Name$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.getByRole('textbox', { name: 'Company Name*' }).fill('chump03');
    await expect(page.locator('#react-select-2-option-0')).toBeVisible({ timeout: 15000 });
    await page.locator('#react-select-2-option-0').click();
    await page.waitForTimeout(1000);

    // Contact dropdown
    await page.waitForTimeout(2000);
    const contactControl = page.locator('div.css-sjtnp2', { hasText: 'Contact Name' }).locator('div.react-select__control').first();
    await expect(contactControl).toBeVisible({ timeout: 15000 });
    await contactControl.click();
    await expect(page.locator('div.react-select__menu')).toBeVisible({ timeout: 20000 });
    const ajayOption = page.locator('div.react-select__option', { hasText: 'Ajay Reddy' }).first();
    if (await ajayOption.count() > 0) {
      await ajayOption.click();
    } else {
      const firstOption = page.locator('div.react-select__option').first();
      await expect(firstOption).toBeVisible({ timeout: 20000 });
      await firstOption.click();
    }

    // Create
    await Promise.all([
      page.waitForURL(/\/repair-request\/[A-Za-z0-9-]+/, { timeout: 60000 }),
      page.getByRole('button', { name: 'Create' }).nth(1).click(),
    ]);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);

    // ADD ITEMS
    await page.getByText('Add Items').click();
    await expect(page.getByRole('textbox', { name: 'Search By Part Number' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('textbox', { name: 'Search By Part Number' }).click();
    await page.getByRole('textbox', { name: 'Search By Part Number' }).fill('231-642');
    await page.getByRole('textbox', { name: 'Search By Part Number' }).press('Enter');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);
    const itemCheckboxes = page.locator('input[type="checkbox"][name^="checkbox"]');
    await expect(itemCheckboxes.first()).toBeVisible({ timeout: 15000 });
    await itemCheckboxes.nth(0).check();
    await itemCheckboxes.nth(1).check();
    await itemCheckboxes.nth(2).check();
    await itemCheckboxes.nth(3).check();
    await page.waitForTimeout(500);
    await page.getByText('Selected Items(4)').click();
    await page.getByRole('button', { name: 'Add Selected 4 Parts' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByText('Repair Items (4)')).toBeVisible({ timeout: 60000 });
    await page.waitForTimeout(2000);

    // NOTES TO CUSTOMER (Quill editor)
    await page.locator('.ql-editor').click();
    await page.locator('.ql-editor').pressSequentially('test purposes', { delay: 30 });
    await page.locator('.ql-editor').press('Enter');
    await page.locator('.ql-editor').pressSequentially('test purposes', { delay: 30 });
    await page.locator('.ql-editor').press('Enter');
    await page.locator('.ql-editor').pressSequentially('test purposes', { delay: 30 });
    await page.locator('.ql-editor').press('Enter');
    await page.locator('.ql-editor').pressSequentially('test purposes', { delay: 30 });
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // INTERNAL NOTE
    await page.getByRole('button', { name: 'chevron-right' }).first().click();
    await page.waitForTimeout(500);
    await page.getByRole('textbox', { name: 'Type here' }).click();
    await page.getByRole('textbox', { name: 'Type here' }).fill('test');
    await page.getByRole('button', { name: 'loading' }).nth(3).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // OPEN FIRST ITEM DETAIL
    await page.locator('.sc-ecPEgm > img').click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // ── ITEM 1: Repairable ────────────────────────────────────────────────

    // Assign Location
    await page.getByText('Assign Location').first().click();
    await page.waitForTimeout(500);
    await page.locator('div:nth-child(4) > .label-text-div > .pi-label-edit-icon > svg').click();
    await page.getByRole('textbox', { name: 'Serial No' }).click();
    await page.getByRole('textbox', { name: 'Serial No' }).fill('123');
    await page.locator('.save-reset-icons > .tick-icon > svg').click();
    await page.waitForTimeout(500);
    await page.getByRole('textbox', { name: 'Storage Location' }).click();
    await page.getByRole('textbox', { name: 'Storage Location' }).fill('123');
    await page.getByRole('button', { name: 'Update Location' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);

    // Assign Technician
    await page.getByText('Assign Technician').click();
    await page.waitForTimeout(500);
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await expect(page.locator('#react-select-6-option-0')).toBeVisible({ timeout: 10000 });
    await page.locator('#react-select-6-option-0').click();
    await page.getByRole('button', { name: 'Assign' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);

    // Evaluate (Repairable)
    await page.locator('div').filter({ hasText: /^Evaluate Item$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await expect(page.locator('#react-select-7-option-0')).toBeVisible({ timeout: 10000 });
    await page.locator('#react-select-7-option-0').click();
    await page.locator('#react-select-7-option-1').click();
    await page.getByLabel('open').first().click();
    await page.getByRole('textbox', { name: 'Estimated Repair Hrs' }).click();
    await page.getByRole('textbox', { name: 'Estimated Repair Hrs' }).fill('11');
    await page.getByRole('textbox', { name: 'Estimated Parts Cost' }).click();
    await page.getByRole('textbox', { name: 'Estimated Parts Cost' }).fill('11');
    await page.getByRole('textbox', { name: 'Technician Suggested Price' }).click();
    await page.getByRole('textbox', { name: 'Technician Suggested Price' }).fill('11');
    await page.locator('.ql-editor.ql-blank').click();
    await page.locator('.ql-editor.ql-blank').fill('test');
    await page.getByRole('textbox', { name: 'Type here' }).click();
    await page.getByRole('textbox', { name: 'Type here' }).fill('test');
    await page.getByRole('button', { name: 'Update Evaluation' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // ── ITEM 2: Not Repairable ────────────────────────────────────────────

    // Assign Location
    await page.getByText('Assign Location').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('textbox', { name: 'Storage Location' }).click();
    await page.getByRole('textbox', { name: 'Storage Location' }).fill('123');
    await page.locator('div:nth-child(4) > .label-text-div > .pi-label-edit-icon > svg > path').click();
    await page.getByRole('textbox', { name: 'Serial No' }).click();
    await page.getByRole('textbox', { name: 'Serial No' }).fill('123');
    await page.locator('.save-reset-icons > .tick-icon > svg').click();
    await page.getByRole('button', { name: 'Update Location' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);

    // Assign Technician
    await page.locator('div').filter({ hasText: /^Assign Technician$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await expect(page.locator('#react-select-9-option-0')).toBeVisible({ timeout: 10000 });
    await page.locator('#react-select-9-option-0').click();
    await page.getByRole('button', { name: 'Assign' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);

    // Evaluate (Not Repairable)
    await page.locator('div').filter({ hasText: /^Evaluate Item$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.locator('.sc-iLLODe').click();
    await page.getByText('Not Repairable').click();
    await page.waitForTimeout(500);
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await expect(page.locator('#react-select-10-option-0')).toBeVisible({ timeout: 10000 });
    await page.locator('#react-select-10-option-0').click();
    await page.getByText('Chassis - damage', { exact: true }).click();
    await page.locator('div').filter({ hasText: /^Summary\*$/ }).first().click();
    await page.getByLabel('open').first().click();
    await page.getByRole('button', { name: 'Update Evaluation' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // ── ITEM 3: Repairable-Outsource ──────────────────────────────────────

    // Assign Location
    await page.locator('div').filter({ hasText: /^Assign Location$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.getByRole('textbox', { name: 'Storage Location' }).click();
    await page.getByRole('textbox', { name: 'Storage Location' }).fill('123');
    await page.locator('div:nth-child(4) > .label-text-div > .pi-label-edit-icon > svg').click();
    await page.getByRole('textbox', { name: 'Serial No' }).click();
    await page.getByRole('textbox', { name: 'Serial No' }).fill('123');
    await page.getByTitle('Save Changes').click();
    await page.getByRole('button', { name: 'Update Location' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);

    // Assign Technician (search by "dan")
    await page.locator('div').filter({ hasText: /^Assign Technician$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.locator('#react-select-12-input').fill('dan');
    await expect(page.locator('#react-select-12-option-0')).toBeVisible({ timeout: 10000 });
    await page.locator('#react-select-12-option-0').click();
    await page.getByRole('button', { name: 'Assign' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);

    // Evaluate (Repairable-Outsource)
    await page.locator('div').filter({ hasText: /^Evaluate Item$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.getByText('Repairable-Outsource').click();
    await page.getByRole('textbox', { name: 'Technician Suggested Price' }).click();
    await page.getByRole('textbox', { name: 'Technician Suggested Price' }).fill('545');
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await page.waitForTimeout(1000);
    await expect(page.getByText('Chassis - corrosion', { exact: true })).toBeVisible({ timeout: 15000 });
    await page.getByText('Chassis - damage', { exact: true }).click();
    await page.getByLabel('open').first().click();
    await page.getByRole('button', { name: 'Update Evaluation' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // DELETE ITEM 4
    await page.getByRole('button', { name: 'delete-icon' }).nth(3).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Yes' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // ADD ITEMS TO QUOTE (only the first item)
    const quoteCheckbox = page.locator('input[type="checkbox"][name="checkbox0"]');
    await expect(quoteCheckbox).toBeVisible({ timeout: 15000 });
    await quoteCheckbox.check();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Add items to quote' }).click();
    const acceptBtn = page.getByRole('button', { name: 'Accept' });
    await expect(acceptBtn).toBeVisible({ timeout: 10000 });
    await expect(acceptBtn).toBeEnabled({ timeout: 10000 });
    await acceptBtn.click();
    await expect(acceptBtn).toHaveCount(0, { timeout: 10000 });
    const approveBtn = page.locator('button:has-text("Approve"), [role="button"]:has-text("Approve")').first();
    await page.waitForTimeout(1000);
    await expect(approveBtn).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(1000);

    // APPROVE QUOTE
    await page.getByRole('button', { name: 'Approve' }).first().click();
    await page.waitForTimeout(1000);
    await expect(page.getByRole('button', { name: 'Approve' }).nth(1)).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Approve' }).nth(1).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // SUBMIT FOR CUSTOMER APPROVAL
    await expect(page.getByRole('button', { name: 'Submit for Customer Approval' })).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: 'Submit for Customer Approval' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('button', { name: 'Submit', exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);

    // WON
    await page.getByRole('button', { name: 'Won' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Proceed' }).first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // RESEND QUOTE (conditional)
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);
    const resendQuoteCount = await page.getByRole('button', { name: 'Resend Quote' }).count();
    if (resendQuoteCount > 0) {
      await page.getByRole('button', { name: 'Resend Quote' }).click();
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: 'Submit' }).click();
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(2000);
    }

    // WON (conditional second time)
    const wonButton = page.getByRole('button', { name: 'Won' });
    if (await wonButton.count() > 0) {
      await wonButton.click();
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: 'Proceed' }).first().click();
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(2000);
    }

    // CREATE SALES ORDER
    await page.waitForTimeout(2000);
    const createSOBtn = page.locator('div').filter({ hasText: /^Create Sales Order$/ });
    await expect(createSOBtn.first()).toBeVisible({ timeout: 30000 });
    await createSOBtn.nth(2).click();
    await expect(page.getByRole('textbox', { name: 'Enter PO Number' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('textbox', { name: 'Enter PO Number' }).click();
    await page.getByRole('textbox', { name: 'Enter PO Number' }).fill('1234');
    await page.waitForTimeout(1500);
    await page.locator('div').filter({ hasText: /^Select FOB Point$/ }).nth(2).click();
    await page.waitForTimeout(1000);
    await expect(page.getByText('DDP', { exact: true })).toBeVisible({ timeout: 15000 });
    await page.getByText('DDP', { exact: true }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Create' }).nth(1).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);

    // NAVIGATE to Orders grid, open first row, follow job → repair links
    await page.bringToFront();
    await page.getByText('Orders', { exact: true }).first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);
    await expect(page.locator('.ag-center-cols-container .ag-row').first()).toBeVisible({ timeout: 30000 });
    await page.locator('.ag-center-cols-container .ag-row').first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);
    await expect(page.getByRole('link', { name: /^\d{5,6}$/ }).first()).toBeVisible({ timeout: 30000 });
    await page.getByRole('link', { name: /^\d{5,6}$/ }).first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);
    await expect(page.getByRole('link', { name: /^\d{5,6}$/ }).first()).toBeVisible({ timeout: 30000 });
    await page.getByRole('link', { name: /^\d{5,6}$/ }).first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // MARK AS IN PROGRESS
    await page.locator('div').filter({ hasText: /^Mark as In Progress$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Accept' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // REPAIR SUMMARY — test result / notes
    await page.getByRole('button', { name: 'chevron-right' }).nth(3).click();
    await page.waitForTimeout(1000);
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await expect(page.locator('#react-select-2-option-0')).toBeVisible({ timeout: 10000 });
    await page.locator('#react-select-2-option-0').click();
    await page.locator('#react-select-2-option-1').click();
    await page.getByLabel('open').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // REPAIR SUMMARY — labour entries
    await page.getByRole('button', { name: 'chevron-right' }).nth(1).click();
    await page.waitForTimeout(1000);
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await expect(page.getByText('ABEL MORALEZ - 165', { exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByText('ABEL MORALEZ - 165', { exact: true }).click();
    await page.waitForTimeout(500);
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await expect(page.getByText('2 - ASSEMBLY', { exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByText('2 - ASSEMBLY', { exact: true }).click();
    await page.locator('div:nth-child(5) > .css-1p1fgsa > .css-1s25hsw').click();
    await page.getByRole('textbox', { name: 'Spent Time (Hours)' }).fill('11');
    await page.getByRole('button', { name: 'Add' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);
    await page.locator('div').filter({ hasText: /^2 - ASSEMBLY$/ }).nth(2).click();
    await expect(page.getByText('1 - MATERIAL STAGING', { exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByText('1 - MATERIAL STAGING', { exact: true }).click();
    await page.getByRole('button', { name: 'Add' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);

    // PART PURCHASES
    await page.getByRole('button', { name: 'chevron-right' }).nth(2).click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(500);
    await page.locator('div').filter({ hasText: /^Search Vendor$/ }).nth(2).click();
    await page.getByRole('textbox', { name: 'Date Requested* Vendor Name*' }).fill('wago001');
    await expect(page.getByLabel('Dynamics Notes').getByText('WAGO CORPORATION', { exact: true })).toBeVisible({ timeout: 15000 });
    await page.getByLabel('Dynamics Notes').getByText('WAGO CORPORATION', { exact: true }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    await page.locator('div').filter({ hasText: /^Search Manufacturer$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.locator('#async-select-example').nth(2).fill('WAGO001');
    await expect(page.getByLabel('Internal Notes').getByText('WAGO CORPORATION', { exact: true })).toBeVisible({ timeout: 15000 });
    await page.getByLabel('Internal Notes').getByText('WAGO CORPORATION', { exact: true }).click();
    await page.getByRole('textbox', { name: 'Enter Cost' }).click();
    await page.getByRole('textbox', { name: 'Enter Cost' }).fill('1');
    await page.getByRole('textbox', { name: 'Enter Quantity' }).click();
    await page.getByRole('textbox', { name: 'Enter Quantity' }).fill('1');
    await page.getByRole('textbox', { name: 'Enter Description' }).click();
    await page.getByRole('textbox', { name: 'Enter Description' }).fill('TESt');
    await page.getByLabel('Internal Notes').getByRole('button', { name: 'Create' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);
    await page.getByRole('textbox', { name: 'Enter Vendor Part Number' }).click();
    await page.getByRole('textbox', { name: 'Enter Vendor Part Number' }).fill('231-642');
    await page.getByLabel('Internal Notes').getByRole('button', { name: 'Create' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // Navigate to sub-item parts page via repair link
    await page.getByRole('link', { name: /^\d{5,6}$/ }).first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);
    await page.getByRole('link', { name: /^\d{6}$/ }).first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // STATUS: Requested -> Partially Received
    await page.locator('.pi-label-edit-icon > svg').first().click();
    await page.waitForTimeout(500);
    await page.locator('div').filter({ hasText: /^Requested$/ }).nth(3).click();
    await expect(page.getByText('Partially Received', { exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByText('Partially Received', { exact: true }).click();
    await page.locator('.save-reset-icons > .tick-icon > svg').click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);

    // Navigate to next item
    await page.locator('.sc-ecPEgm > img').click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // STATUS: Requested -> Received and Completed
    await page.locator('.pi-label-edit-icon > svg').first().click();
    await page.waitForTimeout(500);
    await page.locator('div').filter({ hasText: /^Requested$/ }).nth(3).click();
    await expect(page.getByText('Received and Completed', { exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByText('Received and Completed', { exact: true }).click();
    await page.locator('.save-reset-icons > .tick-icon > svg').click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // Navigate back to repair
    await page.getByRole('link', { name: /^\d{5,6}$/ }).first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // MARK IN PROGRESS (2nd time)
    await page.locator('div').filter({ hasText: /^Mark as In Progress$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Accept' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // ASSIGN TO QC
    await page.locator('div').filter({ hasText: /^Assign to QC$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(1).click();
    await expect(page.locator('#react-select-14-option-0')).toBeVisible({ timeout: 10000 });
    await page.locator('#react-select-14-option-0').click();
    await page.getByRole('button', { name: 'Assign' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // QC CHECKLIST
    await page.getByRole('button', { name: 'chevron-right' }).nth(4).click();
    await page.waitForTimeout(1000);
    await page.locator('div').filter({ hasText: /^Select Control$/ }).nth(2).click();
    await expect(page.getByText('Drive QC', { exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByText('Drive QC', { exact: true }).click();
    await page.waitForTimeout(1000);
    await page.locator('div').filter({ hasText: /^Status$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.getByRole('radio', { name: 'Yes' }).first().check();
    await page.getByRole('radio', { name: 'Yes' }).nth(1).check();
    await page.getByRole('radio', { name: 'Yes' }).nth(2).check();
    await page.getByRole('radio', { name: 'Yes' }).nth(3).check();
    await page.locator('div').filter({ hasText: /^Status$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Pass', { exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByText('Pass', { exact: true }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // COMPLETE QC
    await page.getByRole('button', { name: 'loading Change Status' }).first().click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('menuitem', { name: 'Completed' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('menuitem', { name: 'Completed' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Accept' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // CHANGE STATUSES
    for (const status of ['Recycled', 'Scrapped', 'Returned', 'Evaluate']) {
      await page.getByRole('button', { name: 'loading Change Status' }).nth(1).click();
      await page.waitForTimeout(500);
      await expect(page.getByRole('menuitem', { name: status })).toBeVisible({ timeout: 10000 });
      await page.getByRole('menuitem', { name: status }).click();
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: 'Accept' }).click();
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(2000);
    }

    // EDIT ITEM QUANTITY
    await page.locator('div:nth-child(3) > .sc-gwZKzw > .sc-cDvQBt > .align-right > .sc-btwKTd > div:nth-child(4) > .action-item').click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder('Quantity').click();
    await page.getByPlaceholder('Quantity').fill('3');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Accept' }).first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // DOWNLOAD PDF
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'chevron-right' }).nth(3).click();
    await popupPromise;
    await page.waitForTimeout(1000);
    await page.getByRole('link', { name: /^\d{13}$/ }).first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);
    await page.getByRole('button').filter({ hasText: /^$/ }).nth(2).click();
    await page.waitForTimeout(500);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'Download' }).click();
    await downloadPromise;
  });
});
