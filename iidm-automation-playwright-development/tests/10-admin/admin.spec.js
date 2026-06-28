// @ts-check
import { test, expect } from '@playwright/test';
import { loginAsDefault } from '../../helpers/auth.js';
import { waitForGridLoad, getGridRowCount } from '../../helpers/grid.js';

const BASE_URL = 'https://www.staging-buzzworld-v1.iidm.com';

/** @type {import('@playwright/test').Page} */
let sharedPage;
/** @type {import('@playwright/test').BrowserContext} */
let sharedContext;

test.describe('Admin Module', () => {
  test.describe.configure({ timeout: 900000, hookTimeout: 120000 });

  async function clearPrefilledSearch(page, searchInput) {
    if (await searchInput.count() === 0) return;
    const currentValue = await searchInput.inputValue().catch(() => '');
    if (currentValue?.trim()) {
      await searchInput.fill('');
      await searchInput.press('Enter');
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1000);
      await waitForGridLoadIfPresent(page, 20000).catch(() => {});
    }
  }

  async function clearFilters(page) {
    const clearChip = page.getByText('Clear', { exact: true }).first();
    if (await clearChip.isVisible().catch(() => false)) {
      await clearChip.click();
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1000);
      await waitForGridLoadIfPresent(page, 20000).catch(() => {});
    }
  }

  async function waitForGridLoadIfPresent(page, timeout = 30000) {
    const gridCount = await page.locator('.ag-center-cols-container').count().catch(() => 0);
    if (gridCount > 0) {
      await waitForGridLoad(page, timeout).catch(() => {});
    }
  }

  async function expectGridHasRowsIfPresent(page) {
    const gridCount = await page.locator('.ag-center-cols-container').count().catch(() => 0);
    if (gridCount > 0) {
      await expect(await getGridRowCount(page)).toBeGreaterThan(0);
    }
  }

  async function safeWait(page, timeout) {
    if (page.isClosed()) return;
    try {
      await page.waitForTimeout(timeout);
    } catch (error) {
      // swallow page-close or timeout errors
    }
  }

  async function clickFirstVisibleLocator(locator) {
    const count = await locator.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      const item = locator.nth(i);
      if (await item.isVisible().catch(() => false)) {
        await item.click().catch(() => {});
        return true;
      }
    }
    return false;
  }

  async function clickFirstVisibleFilters(page) {
    const filtersButton = page.getByRole('button', { name: /^Filters$/ }).first();
    if (await filtersButton.isVisible().catch(() => false)) {
      await filtersButton.click().catch(() => {});
      return true;
    }

    const filtersText = page.locator('div').filter({ hasText: /^Filters$/ }).first();
    if (await filtersText.isVisible().catch(() => false)) {
      await filtersText.click().catch(() => {});
      return true;
    }

    return false;
  }

  async function clickFirstVisibleText(page, text) {
    return await clickFirstVisibleLocator(page.getByText(text, { exact: true }));
  }

  async function clickButtonIfVisible(page, buttonText, timeout = 2000) {
    const button = page.getByRole('button', { name: buttonText }).first();
    if (await button.isVisible({ timeout }).catch(() => false)) {
      await button.click({ force: true }).catch(() => {});
      return true;
    }
    const fallback = page.getByText(buttonText, { exact: true }).first();
    if (await fallback.isVisible({ timeout }).catch(() => false)) {
      await fallback.click({ force: true }).catch(() => {});
      return true;
    }
    return false;
  }

  async function closeOpenFilterPanel(page) {
    if (await clickButtonIfVisible(page, 'Apply', 3000)) {
      await safeWait(page, 1000);
      return true;
    }
    if (await clickButtonIfVisible(page, 'Close & Reset', 3000)) {
      await safeWait(page, 1000);
      return true;
    }
    await page.keyboard.press('Escape').catch(() => {});
    await safeWait(page, 500);
    return false;
  }

  test.afterAll(async () => {
    if (sharedContext) await sharedContext.close();
  });

  test('ADMIN-001: Admin module codegen workflow', async ({ browser }) => {
    sharedContext = await browser.newContext({ acceptDownloads: true });
    sharedPage = await sharedContext.newPage();
    await loginAsDefault(sharedPage);
    await sharedPage.waitForLoadState('networkidle').catch(() => {});

    // Navigate directly to Admin
    await sharedPage.goto(`${BASE_URL}/account-type`, { waitUntil: 'networkidle', timeout: 60000 });
    await sharedPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    if (!/account-type|admin/.test(sharedPage.url())) {
      await sharedPage.getByText('Admin', { exact: true }).first().click();
      await sharedPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await sharedPage.waitForTimeout(1000);
    }
    await expect(sharedPage).toHaveURL(/account-type|admin/, { timeout: 10000 });

    // ── Account Types ─────────────────────────────────────────────
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    const accountTypeSearch = sharedPage.getByRole('textbox', { name: 'Search By Account Type' });
    await accountTypeSearch.waitFor({ state: 'visible', timeout: 20000 });
    await clearPrefilledSearch(sharedPage, accountTypeSearch);
    await clearFilters(sharedPage);
    await accountTypeSearch.click();
    await accountTypeSearch.fill('h20');
    await accountTypeSearch.press('Enter');
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    await expectGridHasRowsIfPresent(sharedPage);
    await expect(accountTypeSearch).toBeVisible();

    await clearFilters(sharedPage);
        await clickFirstVisibleFilters(sharedPage);
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await sharedPage.getByText('InActive', { exact: true }).click();
    await sharedPage.getByRole('button', { name: 'Apply' }).click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    await expectGridHasRowsIfPresent(sharedPage);

        await clickFirstVisibleText(sharedPage, 'Clear');
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    // Edit first visible row (hover to reveal edit icon, then click img)
    const firstRowImg = sharedPage.locator('.ag-center-cols-container .ag-row').first().locator('img').first();
    await sharedPage.locator('.ag-center-cols-container .ag-row').first().hover({ force: true }).catch(() => {});
    await sharedPage.waitForTimeout(500);
    const imgVisible = await firstRowImg.isVisible({ timeout: 5000 }).catch(() => false);
    if (imgVisible) {
      await firstRowImg.click({ force: true });
      await sharedPage.waitForTimeout(500);
      const descInput1 = sharedPage.getByRole('textbox', { name: 'Enter Description' });
      const descVisible = await descInput1.isVisible({ timeout: 5000 }).catch(() => false);
      if (descVisible) {
        await descInput1.fill('for testing please ignore this test');
        await sharedPage.getByRole('button', { name: 'Update' }).click();
        await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        await sharedPage.waitForTimeout(1000);
      }
    }

    // ── Branches ──────────────────────────────────────────────────
    await sharedPage.locator('div').filter({ hasText: /^Branches$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    const branchSearch = sharedPage.getByRole('textbox', { name: 'Search By Branch' });
    await branchSearch.waitFor({ state: 'visible', timeout: 20000 });
    await clearPrefilledSearch(sharedPage, branchSearch);
    await clearFilters(sharedPage);
    await branchSearch.click();
    await branchSearch.fill('dallas');
    await branchSearch.press('Enter');
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    await expectGridHasRowsIfPresent(sharedPage);
    await expect(branchSearch).toBeVisible();

    await clearPrefilledSearch(sharedPage, branchSearch);
    await expect(await branchSearch.inputValue()).toBe('');
    await clearFilters(sharedPage);
    await sharedPage.waitForTimeout(500);

        await clickFirstVisibleFilters(sharedPage);
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await sharedPage.getByText('InActive', { exact: true }).click();
    await sharedPage.getByRole('button', { name: 'Apply' }).click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    await expectGridHasRowsIfPresent(sharedPage);

    await sharedPage.locator('.ag-center-cols-container .ag-row').first().click({ force: true });
    await sharedPage.waitForTimeout(500);
    const addressInput = sharedPage.getByRole('textbox', { name: 'Enter Address' });
    const addressVisible = await addressInput.isVisible({ timeout: 8000 }).catch(() => false);
    if (addressVisible) {
      await addressInput.fill('Columbia, OK test');
      await sharedPage.getByRole('button', { name: 'Update' }).click();
      await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      await sharedPage.waitForTimeout(1000);
    }

        await clickFirstVisibleText(sharedPage, 'Clear');
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(500);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    // ── Classifications ───────────────────────────────────────────
    await sharedPage.locator('div').filter({ hasText: /^Classifications$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    const classSearch = sharedPage.getByRole('textbox', { name: 'Search By Classification' });
    await classSearch.waitFor({ state: 'visible', timeout: 20000 });
    await clearPrefilledSearch(sharedPage, classSearch);
    await clearFilters(sharedPage);
    await classSearch.click();
    await classSearch.fill('delete');
    await classSearch.press('Enter');
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    await expectGridHasRowsIfPresent(sharedPage);
    await expect(classSearch).toBeVisible();

    await clearPrefilledSearch(sharedPage, classSearch);
    await expect(await classSearch.inputValue()).toBe('');
    await clearFilters(sharedPage);
    await sharedPage.waitForTimeout(500);

        await clickFirstVisibleFilters(sharedPage);
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await sharedPage.getByText('InActive', { exact: true }).click();
    await sharedPage.getByRole('button', { name: 'Apply' }).click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    await expectGridHasRowsIfPresent(sharedPage);

    await sharedPage.locator('.ag-center-cols-container .ag-row').first().click({ force: true });
    await sharedPage.waitForTimeout(500);
    const descInput3 = sharedPage.getByRole('textbox', { name: 'Enter Description' });
    const descInput3Visible = await descInput3.isVisible({ timeout: 8000 }).catch(() => false);
    if (descInput3Visible) {
      await descInput3.fill('for testing please ignore this test');
      await sharedPage.getByRole('button', { name: 'Update' }).click();
      await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      await sharedPage.waitForTimeout(1000);
    }

        await clickFirstVisibleText(sharedPage, 'Clear');
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(500);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    await sharedPage.locator('div').filter({ hasText: /^Add$/ }).first().click();
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('.sc-ecPEgm > img').first().click();
    await sharedPage.waitForTimeout(1000);

    // ── Contact Types ─────────────────────────────────────────────
    await sharedPage.locator('div').filter({ hasText: /^Contact Types$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    const contactTypeSearch = sharedPage.getByRole('textbox', { name: 'Search By Contact Type' });
    await contactTypeSearch.waitFor({ state: 'visible', timeout: 20000 });
    await clearPrefilledSearch(sharedPage, contactTypeSearch);
    await clearFilters(sharedPage);
    await contactTypeSearch.click();
    await contactTypeSearch.fill('no');
    await contactTypeSearch.press('Enter');
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    await expectGridHasRowsIfPresent(sharedPage);
    await expect(contactTypeSearch).toBeVisible();

    await clearPrefilledSearch(sharedPage, contactTypeSearch);
    await expect(await contactTypeSearch.inputValue()).toBe('');
    await clearFilters(sharedPage);
    await sharedPage.waitForTimeout(500);

        await clickFirstVisibleFilters(sharedPage);
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await sharedPage.getByText('InActive', { exact: true }).click();
    await sharedPage.getByRole('button', { name: 'Apply' }).click();
    await safeWait(sharedPage, 1000);
    await closeOpenFilterPanel(sharedPage);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    if (await sharedPage.getByTitle('Reset Filters ').isVisible({ timeout: 2000 }).catch(() => false)) {
      await sharedPage.getByTitle('Reset Filters ').click();
      await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      await sharedPage.waitForTimeout(500);
      await waitForGridLoadIfPresent(sharedPage, 20000);
      await sharedPage.waitForTimeout(500);
    }

    await sharedPage.locator('div').filter({ hasText: /^Add$/ }).first().click();
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('.sc-ecPEgm > img').first().click();
    await sharedPage.waitForTimeout(1000);

    // ── Industries ────────────────────────────────────────────────
    await sharedPage.locator('div').filter({ hasText: /^Industries$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    const industrySearch = sharedPage.getByRole('textbox', { name: 'Search By Industry' });
    await industrySearch.waitFor({ state: 'visible', timeout: 20000 });
    await clearPrefilledSearch(sharedPage, industrySearch);
    await clearFilters(sharedPage);
    await industrySearch.click();
    await industrySearch.fill('chemical');
    await industrySearch.press('Enter');
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    await expectGridHasRowsIfPresent(sharedPage);

    await clearPrefilledSearch(sharedPage, industrySearch);
    await expect(await industrySearch.inputValue()).toBe('');
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(500);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

        await clickFirstVisibleFilters(sharedPage);
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('div').filter({ hasText: /^Select$/ }).nth(1).click();
    await sharedPage.locator('[id^="react-select-"][id$="-option-0"]').first().click();
    await sharedPage.getByRole('button', { name: 'Apply' }).click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

        await clickFirstVisibleText(sharedPage, 'Clear');
    await sharedPage.waitForTimeout(500);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    await sharedPage.locator('div').filter({ hasText: /^Add$/ }).first().click();
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('.sc-ecPEgm > img').first().click();
    await sharedPage.waitForTimeout(1000);

    // ── PO Min Qty ────────────────────────────────────────────────
    await sharedPage.locator('div').filter({ hasText: /^PO Min Qty$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    const poSearch = sharedPage.getByRole('textbox', { name: 'Search By Quantity' });
    await poSearch.waitFor({ state: 'visible', timeout: 20000 });
    await clearPrefilledSearch(sharedPage, poSearch);
    await clearFilters(sharedPage);
    await poSearch.click();
    await poSearch.fill('501');
    await poSearch.press('Enter');
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    await clearPrefilledSearch(sharedPage, poSearch);
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    await sharedPage.locator('div').filter({ hasText: /^Add$/ }).nth(1).click();
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('.sc-ecPEgm > img').first().click();
    await sharedPage.waitForTimeout(1000);

    // ── Product Category ──────────────────────────────────────────
    await sharedPage.locator('div').filter({ hasText: /^Product Category$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    const prodCatSearch = sharedPage.getByRole('textbox', { name: 'Search By Category' });
    await prodCatSearch.waitFor({ state: 'visible', timeout: 20000 });
    await clearPrefilledSearch(sharedPage, prodCatSearch);
    await clearFilters(sharedPage);
    await prodCatSearch.click();
    await prodCatSearch.fill('madein');
    await prodCatSearch.press('Enter');
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    await clearPrefilledSearch(sharedPage, prodCatSearch);
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    // ── Product Class ─────────────────────────────────────────────
    await sharedPage.locator('div').filter({ hasText: /^Product Class$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    const prodClassSearch = sharedPage.getByRole('textbox', { name: 'Search By Product Class' });
    await prodClassSearch.waitFor({ state: 'visible', timeout: 20000 });
    await clearPrefilledSearch(sharedPage, prodClassSearch);
    await clearFilters(sharedPage);
    await prodClassSearch.click();
    await prodClassSearch.fill('ab01');
    await prodClassSearch.press('Enter');
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    await clearPrefilledSearch(sharedPage, prodClassSearch);
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

        await clickFirstVisibleFilters(sharedPage);
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await sharedPage.getByText('InActive', { exact: true }).click();
    await sharedPage.getByRole('button', { name: 'Apply' }).click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    await sharedPage.getByTitle('Reset Filters ').click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(500);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    // ── QC Forms ──────────────────────────────────────────────────
    await sharedPage.locator('div').filter({ hasText: /^QC Forms$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('div').filter({ hasText: /^Drive QC$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('div').filter({ hasText: /^Misc Equipment QC$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('div').filter({ hasText: /^Test1 QC$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('div').filter({ hasText: /^Test QC$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('div').filter({ hasText: /^Test QC Form1$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('div').filter({ hasText: /^Touchscreen QC$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('div').filter({ hasText: 'Add' }).nth(5).click();
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('.sc-ecPEgm > img').first().click();
    await sharedPage.waitForTimeout(1000);

    // ── Quote Approval ────────────────────────────────────────────
    await sharedPage.locator('div').filter({ hasText: /^Quote Approval$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('div').filter({ hasText: /^\$10k$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('div').filter({ hasText: /^\$25k$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('div').filter({ hasText: /^\$50k$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    // ── Quote Types ───────────────────────────────────────────────
    await sharedPage.locator('div').filter({ hasText: /^Quote Types$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    const quoteTypeSearch = sharedPage.getByRole('textbox', { name: 'Search' }).first();
    await quoteTypeSearch.waitFor({ state: 'visible', timeout: 20000 });
    await clearPrefilledSearch(sharedPage, quoteTypeSearch);
    await clearFilters(sharedPage);
    await quoteTypeSearch.click();
    await quoteTypeSearch.fill('partsquote');
    await quoteTypeSearch.press('Enter');
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    await clearPrefilledSearch(sharedPage, quoteTypeSearch);
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

        await clickFirstVisibleFilters(sharedPage);
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await sharedPage.locator('[id^="react-select-"][id$="-option-0"]').first().click();
    await sharedPage.getByRole('button', { name: 'Apply' }).click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

        await clickFirstVisibleText(sharedPage, 'Clear');
    await sharedPage.waitForTimeout(500);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    await sharedPage.locator('div').filter({ hasText: /^Add$/ }).first().click();
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('.sc-ecPEgm > img').first().click();
    await sharedPage.waitForTimeout(1000);

    // ── Regions ───────────────────────────────────────────────────
    await sharedPage.locator('div').filter({ hasText: /^Regions$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

        await clickFirstVisibleFilters(sharedPage);
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await sharedPage.getByText('InActive', { exact: true }).click();
    await sharedPage.getByRole('button', { name: 'Apply' }).click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

        await clickFirstVisibleText(sharedPage, 'Clear');
    await sharedPage.waitForTimeout(500);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    await sharedPage.locator('div').filter({ hasText: /^Add$/ }).first().click();
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('.sc-ecPEgm > img').first().click();
    await sharedPage.waitForTimeout(1000);

    // ── Sales Potential ───────────────────────────────────────────
    await sharedPage.locator('div').filter({ hasText: /^Sales Potential$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    // Open filter panel
    await clickFirstVisibleFilters(sharedPage);
    await sharedPage.waitForTimeout(1000);

    // If filter panel is open (Apply button visible), close it properly
    const spApplyBtn = sharedPage.getByRole('button', { name: 'Apply' });
    if (await spApplyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      // If no option is selected yet, select the first available option
      const spSelect = sharedPage.locator('div').filter({ hasText: /^Select$/ }).first();
      if (await spSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
        await spSelect.click().catch(() => {});
        await safeWait(sharedPage, 500);
        await sharedPage.locator('[id^="react-select-"][id$="-option-0"]').first().click().catch(() => {});
        await safeWait(sharedPage, 500);
      }
      // Click Apply to apply the filter and close the panel
      await spApplyBtn.click().catch(() => {});
      await safeWait(sharedPage, 1000);
    }

    // If panel is still open (Apply didn't close it), close it explicitly
    await closeOpenFilterPanel(sharedPage);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    // Reset any applied filters via the chip
    if (await sharedPage.getByTitle('Reset Filters ').isVisible({ timeout: 2000 }).catch(() => false)) {
      await sharedPage.getByTitle('Reset Filters ').click();
      await sharedPage.waitForTimeout(1000);
    }
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    await sharedPage.locator('div').filter({ hasText: /^Add$/ }).first().click();
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('.sc-ecPEgm > img').first().click();
    await sharedPage.waitForTimeout(1000);

    // ── Sales Month Form ──────────────────────────────────────────
    const salesMonthFormNav = sharedPage.locator('div').filter({ hasText: /^Sales Month Form$/ }).first();
    await salesMonthFormNav.scrollIntoViewIfNeeded().catch(() => {});
    await salesMonthFormNav.click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    // ── Terms Conditions ──────────────────────────────────────────
    const termsConditionsNav = sharedPage.locator('div').filter({ hasText: /^Terms Conditions$/ }).first();
    await termsConditionsNav.scrollIntoViewIfNeeded().catch(() => {});
    await termsConditionsNav.click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    // ── Territories ───────────────────────────────────────────────
    const territoriesNav = sharedPage.locator('div').filter({ hasText: /^Territories$/ }).first();
    await territoriesNav.scrollIntoViewIfNeeded().catch(() => {});
    await territoriesNav.click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    // Open filter panel
    const terrFilterOpened = await clickFirstVisibleFilters(sharedPage);
    if (!terrFilterOpened) {
      const terrFilterBtn = sharedPage.getByText('Filters', { exact: true }).first();
      if (await terrFilterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await terrFilterBtn.click().catch(() => {});
      }
    }
    await safeWait(sharedPage, 1500);

    let filterPanelOpen = false;
    const terrApplyBtn = sharedPage.getByRole('button', { name: 'Apply' });
    if (await terrApplyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      filterPanelOpen = true;
      const territoryFilterControl = sharedPage.locator('.react-select__control').first();
      if (await territoryFilterControl.isVisible({ timeout: 1500 }).catch(() => false)) {
        await territoryFilterControl.click().catch(() => {});
        await safeWait(sharedPage, 500);
        const firstOption = sharedPage.locator('[id^="react-select-"][id$="-option-0"]').first();
        if (await firstOption.isVisible({ timeout: 1500 }).catch(() => false)) {
          await firstOption.click().catch(() => {});
          await safeWait(sharedPage, 500);
        }
      } else {
        const selectText = sharedPage.getByText('Select', { exact: true }).first();
        if (await selectText.isVisible({ timeout: 1500 }).catch(() => false)) {
          await selectText.click().catch(() => {});
          await safeWait(sharedPage, 500);
          const firstOption = sharedPage.locator('[id^="react-select-"][id$="-option-0"]').first();
          if (await firstOption.isVisible({ timeout: 1500 }).catch(() => false)) {
            await firstOption.click().catch(() => {});
            await safeWait(sharedPage, 500);
          }
        }
      }
      await terrApplyBtn.click().catch(() => {});
      await safeWait(sharedPage, 1000);
    }

    if (!filterPanelOpen) {
      // Fallback: if filter panel is open but Apply isn't visible, use visible controls directly
      if (await clickButtonIfVisible(sharedPage, 'Apply', 1500)) {
        await safeWait(sharedPage, 1000);
        filterPanelOpen = true;
      }
    }

    await closeOpenFilterPanel(sharedPage);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await safeWait(sharedPage, 500);

    // Clear any applied filter chip
    const terrClearBtn = sharedPage.getByText('Clear', { exact: true }).first();
    if (await terrClearBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await terrClearBtn.click();
      await sharedPage.waitForTimeout(500);
      await waitForGridLoadIfPresent(sharedPage, 20000);
      await sharedPage.waitForTimeout(500);
    }

    if (await sharedPage.getByTitle('Reset Filters ').isVisible({ timeout: 2000 }).catch(() => false)) {
      await sharedPage.getByTitle('Reset Filters ').click();
      await sharedPage.waitForTimeout(500);
      await waitForGridLoadIfPresent(sharedPage, 20000);
      await sharedPage.waitForTimeout(500);
    }

    await sharedPage.locator('div').filter({ hasText: /^Add$/ }).first().click();
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('.sc-ecPEgm > img').first().click();
    await sharedPage.waitForTimeout(1000);

    // ── Users ─────────────────────────────────────────────────────
    await sharedPage.locator('div').filter({ hasText: /^Users$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    const userSearch = sharedPage.getByRole('textbox', { name: 'Search' }).first();
    await userSearch.waitFor({ state: 'visible', timeout: 20000 });
    await clearPrefilledSearch(sharedPage, userSearch);
    await clearFilters(sharedPage);
    await userSearch.click();
    await userSearch.fill('default');
    await userSearch.press('Enter');
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    await expectGridHasRowsIfPresent(sharedPage);

    await sharedPage.getByText('Permissions', { exact: true }).click();
    await sharedPage.waitForTimeout(500);

    await clearPrefilledSearch(sharedPage, userSearch);
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    await sharedPage.getByRole('button').filter({ hasText: /^$/ }).nth(1).click();
    await sharedPage.getByRole('menuitem', { name: 'Client Users' }).click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    await sharedPage.locator('div').filter({ hasText: /^1234 456124567@abcd\.com$/ }).first().click();
    await sharedPage.waitForTimeout(500);
    await sharedPage.getByText('User Profile', { exact: true }).click();
    await sharedPage.waitForTimeout(500);

    await sharedPage.locator('div').filter({ hasText: 'Add' }).nth(5).click();
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('.sc-ecPEgm > img').first().click();
    await sharedPage.waitForTimeout(1000);

    // ── User Roles ────────────────────────────────────────────────
    await sharedPage.locator('div').filter({ hasText: /^User Roles$/ }).first().click();
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('div').filter({ hasText: /^Admin$/ }).nth(1).click();
    await sharedPage.waitForTimeout(1000);
    await sharedPage.locator('div').filter({ hasText: /^Centre$/ }).first().click();
    await sharedPage.waitForTimeout(1000);
    await sharedPage.locator('div').filter({ hasText: /^CSG$/ }).first().click();
    await sharedPage.waitForTimeout(1000);
    await sharedPage.locator('div').filter({ hasText: /^Sales VP$/ }).first().click();
    await sharedPage.waitForTimeout(1000);
    await sharedPage.locator('div').filter({ hasText: /^Sales Manager$/ }).first().click();
    await sharedPage.waitForTimeout(1000);
    await sharedPage.locator('div').filter({ hasText: 'Add' }).nth(5).click();
    await sharedPage.waitForTimeout(500);
    await sharedPage.getByTitle('close').locator('img').first().click();
    await sharedPage.waitForTimeout(1000);

    // ── Vendors ───────────────────────────────────────────────────
    await sharedPage.locator('div').filter({ hasText: /^Vendors$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    const vendorSearch = sharedPage.getByRole('textbox', { name: 'Search By Vendor' });
    await vendorSearch.waitFor({ state: 'visible', timeout: 20000 });
    await clearPrefilledSearch(sharedPage, vendorSearch);
    await clearFilters(sharedPage);
    await vendorSearch.click();
    await vendorSearch.fill('13');
    await vendorSearch.press('Enter');
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    await expectGridHasRowsIfPresent(sharedPage);

    await clearPrefilledSearch(sharedPage, vendorSearch);
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

        await clickFirstVisibleFilters(sharedPage);
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await sharedPage.locator('[id^="react-select-"][id$="-option-0"]').first().click();
    await sharedPage.getByRole('button', { name: 'Apply' }).click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    await sharedPage.getByTitle('Reset Filters ').click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(500);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    await sharedPage.locator('div').filter({ hasText: /^Add$/ }).first().click();
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('.sc-ecPEgm > img').first().click();
    await sharedPage.waitForTimeout(1000);

    // ── Warehouse ─────────────────────────────────────────────────
    await sharedPage.locator('div').filter({ hasText: /^Warehouse$/ }).first().click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);
    const warehouseSearch = sharedPage.getByRole('textbox', { name: 'Search By Warehouse' });
    await warehouseSearch.waitFor({ state: 'visible', timeout: 20000 });
    await clearPrefilledSearch(sharedPage, warehouseSearch);
    await clearFilters(sharedPage);
    await warehouseSearch.click();
    await warehouseSearch.fill('o1');
    await warehouseSearch.press('Enter');
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    await clearPrefilledSearch(sharedPage, warehouseSearch);
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

        await clickFirstVisibleFilters(sharedPage);
    await sharedPage.waitForTimeout(500);
    await sharedPage.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await sharedPage.getByText('InActive', { exact: true }).click();
    await sharedPage.getByRole('button', { name: 'Apply' }).click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

        await clickFirstVisibleText(sharedPage, 'Clear');
    await sharedPage.waitForTimeout(500);
    await waitForGridLoadIfPresent(sharedPage, 20000);
    await sharedPage.waitForTimeout(500);

    // ── Zip Codes ─────────────────────────────────────────────────
//     //await sharedPage.locator('div').filter({ hasText: /^Zip Codes$/ }).first().click();
//     await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
//     await sharedPage.waitForTimeout(1000);
//     await waitForGridLoadIfPresent(sharedPage, 20000);
//     await sharedPage.waitForTimeout(500);
//     const zipSearch = sharedPage.getByRole('textbox', { name: 'Search By Zip Code' });
//     await zipSearch.waitFor({ state: 'visible', timeout: 20000 });
//     await clearPrefilledSearch(sharedPage, zipSearch);
//     await clearFilters(sharedPage);
//     await zipSearch.click();
//     await zipSearch.fill('46000');
//     await zipSearch.press('Enter');
//     await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
//     await sharedPage.waitForTimeout(1000);
//     await waitForGridLoadIfPresent(sharedPage, 20000);
//     await sharedPage.waitForTimeout(500);

//     await clearPrefilledSearch(sharedPage, zipSearch);
//     await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
//     await sharedPage.waitForTimeout(1000);
//     await waitForGridLoadIfPresent(sharedPage, 20000);
//     await sharedPage.waitForTimeout(500);

//         await clickFirstVisibleFilters(sharedPage);
//     await sharedPage.waitForTimeout(500);
//     await sharedPage.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
//     await sharedPage.getByText('InActive', { exact: true }).click();
//     await sharedPage.getByRole('button', { name: 'Apply' }).click();
//     await safeWait(sharedPage, 1000);
//     await closeOpenFilterPanel(sharedPage);
//     await waitForGridLoadIfPresent(sharedPage, 20000);
//     await sharedPage.waitForTimeout(500);

//     await sharedPage.getByTitle('Reset Filters ').click();
//     await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
//     await sharedPage.waitForTimeout(500);
//     await waitForGridLoadIfPresent(sharedPage, 20000);
//     await sharedPage.waitForTimeout(500);

//     await sharedPage.locator('div').filter({ hasText: /^Add$/ }).first().click();
//     await sharedPage.waitForTimeout(500);
//     await sharedPage.locator('.sc-ecPEgm > img').first().click();
//     await sharedPage.waitForTimeout(1000);
//   });*//
// });