// @ts-check
import { test, expect } from '@playwright/test';
import { loginAsDefault, logout, BASE_URL } from '../../helpers/auth.js';
import { clickNavItem } from '../../helpers/navigation.js';
import { waitForGridLoad } from '../../helpers/grid.js';

/** @param {import('@playwright/test').Page} page */
async function openOrdersPage(page) {
  await loginAsDefault(page);
  await clickNavItem(page, 'Orders');
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.locator('h1,h2,h3').filter({ hasText: /^Orders$/ }).first()).toBeVisible({ timeout: 30000 });
  await waitForGridLoad(page, 60000);
  await expect(page.locator('.ag-center-cols-container .ag-row').first()).toBeVisible({ timeout: 60000 });
}

/** @param {import('@playwright/test').Page} page */
async function clearOrdersSearch(page) {
  const searchInput = page.locator('input[placeholder*="Order"], input[placeholder*="Search"], input[placeholder*="ID"], input[placeholder*="order"], input[placeholder*="search"], input[placeholder*="id"]').first();
  if (await searchInput.count() === 0) return;
  if (await searchInput.isVisible().catch(() => false)) {
    const currentValue = await searchInput.inputValue().catch(() => '');
    if (currentValue.trim().length > 0) {
      await searchInput.fill('');
      await searchInput.press('Enter');
      await page.waitForLoadState('networkidle').catch(() => {});
      await waitForGridLoad(page, 60000);
    }
  }
}

/** @param {import('@playwright/test').Page} page */
async function openQuotesPage(page) {
  await loginAsDefault(page);
  await clickNavItem(page, 'Quotes');
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.locator('h1,h2,h3').filter({ hasText: /^Quotes$/ }).first()).toBeVisible({ timeout: 30000 });
  await waitForGridLoad(page, 60000);
}

/** @param {import('@playwright/test').Page} page */
async function openRepairQuotesPage(page) {
  await loginAsDefault(page);
  await page.goto(`${BASE_URL}/quote_for_repair`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await waitForGridLoad(page, 60000);
  await expect(page.locator('text=Quotes').first()).toBeVisible({ timeout: 30000 });
}

/** @param {import('@playwright/test').Page} page */
async function clearQuotesFilters(page) {
  const clearButton = page.getByRole('button', { name: /Clear/i }).first();
  if (await clearButton.count() > 0 && await clearButton.isVisible().catch(() => false)) {
    await clearButton.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await waitForGridLoad(page, 60000);
  }
}

test.describe('Orders Module', () => {
  test.describe.configure({ timeout: 180000 });

  test('ORD-001: Login and open Orders page, clear any pre-filled search', async ({ page }) => {
    await openOrdersPage(page);
    await clearOrdersSearch(page);
    const searchInput = page.locator('input[placeholder*="Order"], input[placeholder*="Search"], input[placeholder*="ID"], input[placeholder*="order"], input[placeholder*="search"], input[placeholder*="id"]').first();
    if (await searchInput.count() > 0) {
      expect(await searchInput.inputValue()).toBe('');
    }
    const firstRow = page.locator('.ag-center-cols-container .ag-row').first();
    await expect(firstRow).toBeVisible({ timeout: 60000 });
    const rowCount = await page.locator('.ag-center-cols-container .ag-row').count();
    expect(rowCount).toBeGreaterThan(0);
    await logout(page);
  });

  test('ORD-002: Sort Sales Order column and navigate to next page', async ({ page }) => {
    await openOrdersPage(page);
    const salesOrderHeader = page.locator('.ag-header-cell-text').filter({ hasText: /Sales Order/i }).first();
    await expect(salesOrderHeader).toBeVisible({ timeout: 30000 });

    const firstRowTextBefore = await page.locator('.ag-center-cols-container .ag-row').first().textContent();
    await salesOrderHeader.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(1000);

    const nextPageButton = page.getByRole('button', { name: 'Next Page' });
    const nextEnabled = await nextPageButton.isEnabled().catch(() => false);
    if (nextEnabled) {
      await nextPageButton.click();
      await page.waitForLoadState('networkidle').catch(() => {});
      await waitForGridLoad(page, 60000);
      const firstRowTextAfter = await page.locator('.ag-center-cols-container .ag-row').first().textContent();
      expect(firstRowTextAfter).not.toBe(firstRowTextBefore);
      await expect(page.locator('.ag-center-cols-container .ag-row').first()).toBeVisible({ timeout: 60000 });
      await page.waitForTimeout(1000);
    } else {
      console.log('ORD-002: Next page button not available, page navigation skipped');
    }
    await logout(page);
  });

  test('ORD-003: Search for 254696 and open the order detail view', async ({ page }) => {
    await openOrdersPage(page);
    await clearOrdersSearch(page);

    const searchInput = page.locator('input[placeholder*="Order"], input[placeholder*="Search"], input[placeholder*="ID"], input[placeholder*="order"], input[placeholder*="search"], input[placeholder*="id"]').first();
    await expect(searchInput).toBeVisible({ timeout: 15000 });
    await searchInput.click();
    await page.waitForTimeout(1000);
    await searchInput.fill('254696');
    await page.waitForTimeout(500);
    await searchInput.press('Enter');
    await page.waitForLoadState('networkidle').catch(() => {});
    await waitForGridLoad(page, 60000);
    const resultRow = page.locator('.ag-center-cols-container .ag-row').first();
    await expect(resultRow).toBeVisible({ timeout: 60000 });
    const resultRowCount = await page.locator('.ag-center-cols-container .ag-row').count();
    expect(resultRowCount).toBeGreaterThan(0);
    await page.waitForTimeout(1000);

    await resultRow.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);
    await page.waitForURL(/orders-detail-view|order|sales-order/, { timeout: 30000 });
    await expect(page.locator('text=/Order Details Not Found|404/i')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('Order Details Not Found');
    await logout(page);
  });
});