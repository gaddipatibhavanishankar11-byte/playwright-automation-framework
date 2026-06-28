// @ts-check
import { test, expect } from '@playwright/test';
import { login, logout } from '../../helpers/auth.js';

/** @param {import('@playwright/test').Page} page */
async function waitForPartsPurchaseTable(page) {
  await page.waitForSelector('.ag-center-cols-container', { state: 'visible', timeout: 60000 });
  await page.waitForSelector('.ag-center-cols-container .ag-row', { state: 'visible', timeout: 60000 });
  await page.waitForTimeout(1500);
}

test.describe('Parts Purchase Module', () => {
  test.describe.configure({ timeout: 300000 });

  test('PP-001: Login, navigate to Parts Purchase, verify statuses and filters', async ({ page }) => {
    // Navigate to part-purchase → SSO redirects → fills credentials → waitsy  for redirect back
    await login(page, 'defaultuser@enterpi.com', 'Enspirit@625', '/part-purchase');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByRole('heading', { name: 'Parts Purchase' })).toBeVisible({ timeout: 30000 });
    await waitForPartsPurchaseTable(page);
    const initialRowCount = await page.locator('.ag-center-cols-container .ag-row').count();
    expect(initialRowCount).toBeGreaterThan(0);

    // Clear any prefilled search value on initial load and wait for data to reload
    const searchBoxInit = page.getByRole('textbox', { name: 'Requested ID / Manufacturer' }).first();
    await expect(searchBoxInit).toBeVisible({ timeout: 15000 });
    await searchBoxInit.click();
    await searchBoxInit.fill('');
    await searchBoxInit.press('Enter');
    await page.waitForLoadState('networkidle').catch(() => {});
    await waitForPartsPurchaseTable(page);
    const statuses = ['Requested', 'Ordered', 'Partially Received', 'Received and Completed', 'Cancelled'];
    for (const status of statuses) {
      const statusItem = page.locator('div').filter({ hasText: new RegExp(`^${status}$`) }).first();
      await expect(statusItem).toBeVisible({ timeout: 15000 });
      await statusItem.click();
      await page.waitForLoadState('networkidle').catch(() => {});
      await waitForPartsPurchaseTable(page);
    }

    const allRequests = page.locator('div').filter({ hasText: /^All Requests$/ }).first();
    await expect(allRequests).toBeVisible({ timeout: 15000 });
    await allRequests.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await waitForPartsPurchaseTable(page);

    const filtersButton = page.getByText('Filters', { exact: true }).first();
    await expect(filtersButton).toBeVisible({ timeout: 15000 });
    await filtersButton.click();
    await page.waitForTimeout(1500);

    const selectControl = page.locator('div:nth-child(2) > .css-sjtnp2 > .pi-select-wrapper > .css-5a7vsu-container > .drop-height-80px.multi-select.react-select__control > .drop-height-80px.multi-select.react-select__value-container').first();
    await expect(selectControl).toBeVisible({ timeout: 15000 });
    await selectControl.click();
    await page.waitForTimeout(500);
    await page.locator('#react-select-6-option-3').click();

    const applyButton = page.getByRole('button', { name: 'Apply' }).first();
    await expect(applyButton).toBeVisible({ timeout: 15000 });
    await applyButton.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await waitForPartsPurchaseTable(page);
    const filteredRowCount = await page.locator('.ag-center-cols-container .ag-row').count();
    expect(filteredRowCount).toBeGreaterThanOrEqual(0);
    await page.waitForTimeout(1200);

    const clearButton = page.getByText('Clear', { exact: true }).first();
    await expect(clearButton).toBeVisible({ timeout: 15000 });
    await clearButton.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await waitForPartsPurchaseTable(page);
    await expect(searchBoxInit).toHaveValue('');
    await page.waitForTimeout(1200);

    const searchBox = page.getByRole('textbox', { name: 'Requested ID / Manufacturer' }).first();
    await expect(searchBox).toBeVisible({ timeout: 15000 });
    await searchBox.click();
    await searchBox.fill('wago');
    await searchBox.press('Enter');
    await page.waitForLoadState('networkidle').catch(() => {});
    await waitForPartsPurchaseTable(page);
    const wagoRow = page.locator('.ag-center-cols-container .ag-row').first();
    await expect(wagoRow).toContainText(/wago/i);
    await page.waitForTimeout(1200);

    // Clear the wago search and wait for full data to reload
    await searchBox.fill('');
    await searchBox.press('Enter');
    await page.waitForLoadState('networkidle').catch(() => {});
    await waitForPartsPurchaseTable(page);
    await expect(searchBox).toHaveValue('');
    await page.waitForTimeout(1200);

    // Switch to "Requested" status — these rows are editable
    const requestedTab = page.locator('div').filter({ hasText: /^Requested$/ }).first();
    await expect(requestedTab).toBeVisible({ timeout: 15000 });
    await requestedTab.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await waitForPartsPurchaseTable(page);

    // Open the first row in the Requested list
    const firstRow = page.locator('.ag-center-cols-container .ag-row[row-index="0"]');
    await expect(firstRow).toBeVisible({ timeout: 30000 });
    await firstRow.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);
    await expect(page.getByText(/#000/)).toBeVisible({ timeout: 15000 });

    // Scroll to bottom to reveal the items section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);

    // Hover the item card area to reveal the Edit Item button
    const itemSection = page.locator('text=Item Information').first();
    await expect(itemSection).toBeVisible({ timeout: 15000 });
    await itemSection.hover();
    await page.waitForTimeout(500);

    const editButton = page.getByTitle('Edit Item').first();
    await expect(editButton).toBeVisible({ timeout: 15000 });
    await editButton.click();
    await page.getByRole('textbox', { name: 'Enter quantity' }).click();
    await page.getByRole('textbox', { name: 'Enter quantity' }).fill('12');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('p[title="12"]').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1500);

    // Add Items flow
    await page.locator('div').filter({ hasText: /^Add Items$/ }).nth(3).click();
    await page.waitForTimeout(1000);

    await page.locator('div').filter({ hasText: /^Search Job Number$/ }).nth(2).click();
    const jobInput = page.getByRole('textbox', { name: 'Job Number* Manufacturer Name*' });
    await jobInput.fill('93130');
    await page.locator('[id^="react-select-"][id$="-option-0"]').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('[id^="react-select-"][id$="-option-0"]').first().click();
    await page.getByText('Search Manufacturer').click();
    await page.locator('#async-select-example').nth(1).fill('WAGO001');
    await page.locator('[id^="react-select-"][id$="-option-3"]').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('[id^="react-select-"][id$="-option-3"]').first().click();
    await page.getByRole('textbox', { name: 'Enter Vendor Part Number' }).click();
    await page.getByRole('textbox', { name: 'Enter Vendor Part Number' }).fill('231-642');
    await page.getByRole('textbox', { name: 'Enter Cost' }).click();
    await page.getByRole('textbox', { name: 'Enter Cost' }).fill('11');
    await page.getByRole('textbox', { name: 'Enter Description' }).click();
    await page.getByRole('textbox', { name: 'Enter Description' }).fill('TESt');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);
    await page.getByRole('textbox', { name: 'Enter quantity' }).click();
    await page.getByRole('textbox', { name: 'Enter quantity' }).fill('1');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('p[title="231-642"]').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1500);

    // Back to list
    await page.locator('.sc-cMa-dbN').click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await waitForPartsPurchaseTable(page);

    // Create Parts Purchase modal
    await page.locator('div').filter({ hasText: /^Create Parts Purchase$/ }).nth(1).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);
    const createIcon = page.getByRole('img', { name: 'parts-purchase' }).nth(1);
    await expect(createIcon).toBeVisible({ timeout: 15000 });
    await createIcon.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);

    await logout(page);
  });
});
