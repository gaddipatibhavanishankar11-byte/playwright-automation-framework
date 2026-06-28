// @ts-check
import { test, expect } from '@playwright/test';
import { loginAsDefault } from '../../helpers/auth.js';
import { waitForGridLoad } from '../../helpers/grid.js';

/** Wait for network idle + short buffer. */
async function waitForAppReady(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
}

/**
 * Open the react-select that currently shows `currentLabel` and pick `targetLabel`.
 * Uses the aria-label="open" dropdown indicator that React Select renders.
 * @param {import('@playwright/test').Page} page
 * @param {string} currentLabel  - text visible in the control right now (e.g. "Active")
 * @param {string} targetLabel   - option text to click (e.g. "Expired")
 */
async function changeReactSelect(page, currentLabel, targetLabel) {
  // Find the specific react-select control that shows currentLabel
  const control = page.locator('[class$="-control"], [class*="-control"]')
    .filter({ hasText: new RegExp(`^${currentLabel}$`) })
    .first();
  await control.click();
  await page.waitForTimeout(400);
  // Options list appears in a menu div — pick by exact text
  await page.locator('[class*="-option"]').filter({ hasText: new RegExp(`^${targetLabel}$`) }).first().click();
  await page.waitForTimeout(400);
}

/** Assert a download has a valid file extension. */
function expectValidDownload(download) {
  const filename = download.suggestedFilename().toLowerCase();
  expect(filename).toMatch(/\.(csv|xlsx|xls|pdf)$/);
}

test.describe('Pricing Module', () => {
  test.describe.configure({ timeout: 300000 });

  test('PRC-001: Pricing – search, status toggle, filter, export and follow-up workflow', async ({ page }) => {
    // ── 1. Login ──────────────────────────────────────────────────
    await loginAsDefault(page);
    await waitForAppReady(page);

    // ── 2. Navigate to Pricing ────────────────────────────────────
    await page.getByRole('button', { name: 'Pricing' }).click();
    await page.getByRole('menuitem', { name: 'Pricing', exact: true }).click();
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: 'Pricing' })).toBeVisible({ timeout: 30000 });

    // ── 3. Search "wago" in global / left-sidebar search ──────────
    const globalSearch = page.getByRole('textbox', { name: 'Search' }).first();
    await globalSearch.click();
    await globalSearch.fill('wago');
    await globalSearch.press('Enter');
    await waitForAppReady(page);
    await expect(page.locator('text=WAGO CORPORATION').first()).toBeVisible({ timeout: 30000 });

    // ── 4. Search stock code "2000-115" ───────────────────────────
    const stockSearch = page.getByRole('textbox', { name: 'Stock Code / Description' }).first();
    await stockSearch.click();
    await stockSearch.fill('2000-115');
    await stockSearch.press('Enter');
    await page.locator('.new-global-search > div:nth-child(3)').first().click();
    await waitForAppReady(page);
    await waitForGridLoad(page, 60000);

    // ── 5. Wait until data loads and row is displayed ─────────────
    await expect(page.getByRole('gridcell', { name: '2000-115' }).first()).toBeVisible({ timeout: 30000 });

    // ── 6. Change Status: Active → Expired ────────────────────────
    await page.locator('div').filter({ hasText: /^Active$/ }).nth(4).click();
    await page.getByText('Expired', { exact: true }).click();
    await waitForAppReady(page);
    await waitForGridLoad(page, 60000);
    await expect(page.getByRole('gridcell', { name: '2000-115' }).first()).toBeVisible({ timeout: 30000 });

    // ── 7. Change Status: Expired → Active ───────────────────────
    await page.locator('div').filter({ hasText: /^Expired$/ }).first().click();
    await page.getByText('Active', { exact: true }).click();
    await waitForAppReady(page);
    await waitForGridLoad(page, 60000);
    await expect(page.getByRole('gridcell', { name: '2000-115' }).first()).toBeVisible({ timeout: 30000 });

    // ── 8. Clear the stock code search field ─────────────────────
    const clearStockIcon = page.locator('input[value="2000-115"] ~ img, ' +
      'input[value="2000-115"] + img, ' +
      '[class*="clear-indicator"]').first();
    const cleared = await clearStockIcon.isVisible({ timeout: 3000 }).catch(() => false);
    if (cleared) {
      await clearStockIcon.click();
    } else {
      await stockSearch.click({ clickCount: 3 });
      await stockSearch.press('Backspace');
      await stockSearch.press('Enter');
    }
    await page.locator('.new-global-search > div:nth-child(3)').first().click();
    await waitForAppReady(page);
    await waitForGridLoad(page, 60000);
    await expect(page.getByRole('gridcell', { name: '2000-115' }).first()).toBeVisible({ timeout: 30000 });

    // ── 9. Open Filters panel ────────────────────────────────────
    await page.locator('text=Filters').first().click();
    await expect(page.locator('text=Discount Codes').first()).toBeVisible({ timeout: 15000 });

    const openIndicators = page.getByLabel('open');
    const openCount = await openIndicators.count();
    await openIndicators.nth(openCount - 1).click();
    await page.waitForTimeout(600);
    const discountOption = page.locator('[id*="-option-"]').first();
    await discountOption.waitFor({ state: 'visible', timeout: 10000 });
    await discountOption.click();

    await page.getByRole('button', { name: 'Apply' }).click();
    await waitForAppReady(page);
    await waitForGridLoad(page, 60000);

    // ── 10. Clear filter ──────────────────────────────────────────
    await page.getByText('Clear').click();
    await waitForAppReady(page);
    await waitForGridLoad(page, 60000);

    // ── 11. Export and verify download ────────────────────────────
    const exportButton = page.locator('div').filter({ hasText: /^Export$/ }).first();
    await exportButton.waitFor({ state: 'visible', timeout: 30000 });
    await expect(exportButton).toBeEnabled({ timeout: 30000 });
    await exportButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const [pricingDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 120000 }),
      exportButton.click(),
    ]);
    expectValidDownload(pricingDownload);

    // ── 12. Search by customer code and discount code flows ──────
    await page.getByRole('button', { name: 'Pricing' }).click();
    await waitForAppReady(page);
    await page.getByRole('textbox', { name: 'Search', exact: true }).fill('baco001');
    await page.getByRole('textbox', { name: 'Search', exact: true }).press('Enter');
    await waitForAppReady(page);
    await page.getByRole('textbox', { name: 'Search By Discount Code' }).fill('ba01');
    await page.getByRole('textbox', { name: 'Search By Discount Code' }).press('Enter');
    await waitForAppReady(page);
    await page.locator('.new-global-search > div:nth-child(3)').first().click();
    await page.locator('div').filter({ hasText: /^Active$/ }).nth(2).click();
    await page.getByText('Expired', { exact: true }).click();
    await page.locator('div').filter({ hasText: /^Expired$/ }).first().click();
    await page.locator('#react-select-5-option-0').click();
    await page.locator('div').filter({ hasText: /^Filters$/ }).first().click();
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await page.locator('#react-select-7-option-104').click();
    await page.getByRole('button', { name: 'Apply' }).click();
    await waitForAppReady(page);
    await waitForGridLoad(page, 60000);

    // ── 13. Clear and export after discount filter ──────────────
    await page.getByText('Clear').click();
    await waitForAppReady(page);
    await waitForGridLoad(page, 60000);
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120000 }),
      page.locator('div').filter({ hasText: /^Export$/ }).click(),
    ]);
    expectValidDownload(download);

    // ── 14. Customer Name Supplier Date search and apply flows ───
    await page.getByRole('button', { name: 'Pricing' }).click();
    await waitForAppReady(page);
    await page.locator('div').filter({ hasText: /^Search$/ }).nth(2).click();
    await page.getByRole('textbox', { name: 'Customer Name Supplier Date' }).fill('chump');
    await page.getByRole('textbox', { name: 'Customer Name Supplier Date' }).press('Enter');
    await page.getByRole('textbox', { name: 'Customer Name Supplier Date' }).fill('chump03');
    await page.getByRole('textbox', { name: 'Customer Name Supplier Date' }).press('Enter');
    await page.getByRole('button', { name: 'Apply' }).click();
    await waitForAppReady(page);

    await page.getByLabel('clear').click();
    await page.locator('div').filter({ hasText: /^Search$/ }).nth(1).click();
    await page.getByRole('textbox', { name: 'Customer Name Supplier Date' }).fill('chump03');
    await page.locator('#react-select-8-option-0').click();
    await page.getByRole('button', { name: 'Apply' }).click();
    await waitForAppReady(page);

    await page.getByText('Items', { exact: true }).click();
    await page.getByRole('button', { name: 'Cancel' }).first().click();
    await page.getByText('SPA Logs').click();
    await page.getByRole('button', { name: 'Configure' }).click();
    await waitForAppReady(page);
    await page.locator('.Back-main').click();

    // ── 15. Import buy-side data download ───────────────────────
    await page.getByRole('button').filter({ hasText: /^$/ }).nth(2).click();
    await page.getByRole('menuitem', { name: 'Import Buy Side Data' }).click();
    const [download1] = await Promise.all([
      page.waitForEvent('download', { timeout: 120000 }),
      page.locator('.sc-jIGnZt').click(),
    ]);
    expectValidDownload(download1);
    await page.locator('.sc-ecPEgm > img').click();

    // ── 16. Import sell-side data download ──────────────────────
    await page.getByRole('button').filter({ hasText: /^$/ }).nth(2).click();
    await page.getByRole('menuitem', { name: 'Import Sell Side Data' }).click();
    const [download2] = await Promise.all([
      page.waitForEvent('download', { timeout: 120000 }),
      page.locator('.sc-jIGnZt').click(),
    ]);
    expectValidDownload(download2);
    await page.locator('.sc-ecPEgm > img').click();

    // ── 17. Apply customer filter and export items ──────────────
    await page.locator('.drop-height-80px.multi-select.react-select__value-container').click();
    await page.locator('#async-select-example').nth(1).fill('baco');
    await page.locator('#react-select-18-option-0').click();
    await page.getByRole('button', { name: 'Apply' }).click();
    await waitForAppReady(page);

    await page.getByRole('tab', { name: 'Items' }).click();
    await page.locator('div').filter({ hasText: /^Export$/ }).click();
    await page.getByRole('button', { name: 'Okay' }).click();
    await waitForAppReady(page);

    // ── 18. Imports and final exports ───────────────────────────
    await page.locator('div').filter({ hasText: /^Pricing$/ }).click();
    await waitForAppReady(page);
    await page.getByTitle('Import').click();
    const [download3] = await Promise.all([
      page.waitForEvent('download', { timeout: 120000 }),
      page.locator('.sc-jIGnZt').first().click(),
    ]);
    expectValidDownload(download3);

    const [download4] = await Promise.all([
      page.waitForEvent('download', { timeout: 120000 }),
      page.locator('div:nth-child(2) > .sc-cmaqmh > .sc-jIGnZt').click(),
    ]);
    expectValidDownload(download4);

    await page.locator('.select-width > .css-sjtnp2 > .pi-select-wrapper > .css-5a7vsu-container > .react-select__control > .react-select__value-container').click();
    await page.locator('div').filter({ hasText: /^Search$/ }).nth(2).click();
    await page.locator('.sc-ecPEgm > img').click();
  });
});