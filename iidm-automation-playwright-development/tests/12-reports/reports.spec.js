// @ts-check
import { test, expect } from '@playwright/test';
import { loginAsDefault } from '../../helpers/auth.js';
import { waitForGridLoad, getGridRowCount } from '../../helpers/grid.js';

const BASE_URL = 'https://www.staging-buzzworld-v1.iidm.com';

/** @type {import('@playwright/test').Page} */
let sharedPage;
/** @type {import('@playwright/test').BrowserContext} */
let sharedContext;

test.describe('Reports Module', () => {
  test.describe.configure({ timeout: 300000, hookTimeout: 300000 });

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext({ acceptDownloads: true });
    sharedPage = await sharedContext.newPage();
    await loginAsDefault(sharedPage);
    await sharedPage.waitForLoadState('networkidle').catch(() => {});
  });

  test.afterAll(async () => {
    if (sharedContext) await sharedContext.close();
  });

  test('REP-001: Reports codegen workflow', async () => {
    await sharedPage.goto(`${BASE_URL}/quote_for_parts`, { waitUntil: 'networkidle', timeout: 60000 });
    await sharedPage.waitForTimeout(2000);

    // ── Past Due Invoices ─────────────────────────────────────────
    const reportsBtn1 = sharedPage.getByRole('button', { name: 'Reports' });
    await reportsBtn1.waitFor({ state: 'visible', timeout: 20000 });
    await reportsBtn1.click();
    const pastDueItem = sharedPage.getByRole('menuitem', { name: 'Past Due Invoices' });
    await pastDueItem.waitFor({ state: 'visible', timeout: 20000 });
    await pastDueItem.click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(3000);
    await expect(sharedPage).toHaveURL(/(report|past-due-invoices)/, { timeout: 10000 });
    await expect(sharedPage.getByRole('heading', { name: 'Past Due Invoices', level: 1 })).toBeVisible({ timeout: 10000 });
    await waitForGridLoad(sharedPage, 60000);
    await sharedPage.waitForTimeout(2000);

    // Clear any pre-existing filter chip
    const clearChip = sharedPage.getByText('Clear', { exact: true }).first();
    if (await clearChip.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clearChip.click();
      await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      await sharedPage.waitForTimeout(2000);
      await waitForGridLoad(sharedPage, 60000);
      await sharedPage.waitForTimeout(2000);
    }

    // Search
    const pastDueSearch = sharedPage.getByRole('textbox', { name: 'Search By Customer ID / Name' });
    const rowCountBeforeSearch = await getGridRowCount(sharedPage);
    await pastDueSearch.waitFor({ state: 'visible', timeout: 20000 });

    const existingSearchValue = await pastDueSearch.inputValue().catch(() => '');
    if (existingSearchValue.trim()) {
      await pastDueSearch.fill('');
      await pastDueSearch.press('Enter');
      await expect(pastDueSearch).toHaveValue('');
      await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      await sharedPage.waitForTimeout(2000);
      await waitForGridLoad(sharedPage, 60000);
      await sharedPage.waitForTimeout(2000);
    }

    await pastDueSearch.click();
    await pastDueSearch.fill('ACS');
    await pastDueSearch.press('Enter');
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(3000);
    await waitForGridLoad(sharedPage, 60000);
    await sharedPage.waitForTimeout(2000);
    await expect(await getGridRowCount(sharedPage)).toBeGreaterThan(0);
    await expect(await pastDueSearch.inputValue()).toBe('ACS');

    // Clear search by resetting the textbox value directly
    await pastDueSearch.fill('');
    await pastDueSearch.press('Enter');
    await expect(pastDueSearch).toHaveValue('');
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(3000);
    await waitForGridLoad(sharedPage, 60000);
    await sharedPage.waitForTimeout(2000);
    await expect(pastDueSearch).toHaveValue('');
    await expect(await getGridRowCount(sharedPage)).toBeGreaterThanOrEqual(0);

    // Filter
    const filtersBtn = sharedPage.locator('div').filter({ hasText: /^Filters$/ }).nth(1);
    await filtersBtn.waitFor({ state: 'visible', timeout: 30000 });
    await filtersBtn.click();
    await sharedPage.waitForTimeout(2000);
    await sharedPage.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await sharedPage.locator('[id^="react-select-"][id$="-option-0"]').first().click();
    await sharedPage.getByRole('button', { name: 'Apply' }).click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(3000);
    await waitForGridLoad(sharedPage, 60000);
    await sharedPage.waitForTimeout(2000);
    await expect(sharedPage.getByText('Clear', { exact: true }).first()).toBeVisible({ timeout: 10000 });

    // Reset filters
    const resetBtn = sharedPage.getByTitle('Reset Filters ');
    await resetBtn.waitFor({ state: 'visible', timeout: 30000 });
    await resetBtn.click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(2000);
    await waitForGridLoad(sharedPage, 60000);
    await sharedPage.waitForTimeout(2000);

    // ── Point of Sales ────────────────────────────────────────────
    const reportsBtn2 = sharedPage.getByRole('button', { name: 'Reports' });
    await reportsBtn2.waitFor({ state: 'visible', timeout: 20000 });
    await reportsBtn2.click();
    const pointOfSalesItem = sharedPage.getByRole('menuitem', { name: 'Point of Sales' });
    await pointOfSalesItem.waitFor({ state: 'visible', timeout: 20000 });
    await pointOfSalesItem.click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(3000);

    // Select report from dropdown
    const reportDropdown = sharedPage.locator('div').filter({ hasText: /^Select Report$/ }).nth(2);
    await reportDropdown.waitFor({ state: 'visible', timeout: 30000 });
    await reportDropdown.click();
    await sharedPage.waitForTimeout(1000);
    const abbOption = sharedPage.getByText('ABB', { exact: true });
    await abbOption.waitFor({ state: 'visible', timeout: 20000 });
    await abbOption.click();
    await sharedPage.waitForTimeout(1000);
    await expect(sharedPage.locator('.react-select__single-value', { hasText: 'ABB' }).first()).toBeVisible({ timeout: 10000 });

    const applyBtn = sharedPage.getByRole('button', { name: 'Apply' });
    await applyBtn.waitFor({ state: 'visible', timeout: 30000 });
    await applyBtn.click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(3000);

    // Export download
    const download = await (async () => {
      const dl = sharedPage.waitForEvent('download', { timeout: 60000 });
      await sharedPage.getByText('Export', { exact: true }).click();
      return dl;
    })();
    const filename = await download.suggestedFilename();
    await expect(filename).toBeTruthy();
    await expect(filename).toContain('.csv');
    await sharedPage.waitForTimeout(2000);

    // Send Test Email
    const sendTestEmailBtn = sharedPage.locator('div').filter({ hasText: /^Send Test Email$/ }).first();
    await sendTestEmailBtn.waitFor({ state: 'visible', timeout: 20000 });
    await sendTestEmailBtn.click();
    await sharedPage.waitForTimeout(2000);

    // Send Report
    const sendReportBtn = sharedPage.locator('div').filter({ hasText: /^Send Report$/ }).first();
    await sendReportBtn.waitFor({ state: 'visible', timeout: 20000 });
    await sendReportBtn.click();
    await expect(sharedPage.getByText('Report send Successfully', { exact: true })).toBeVisible({ timeout: 20000 });
    await sharedPage.waitForTimeout(3000);
  });
});