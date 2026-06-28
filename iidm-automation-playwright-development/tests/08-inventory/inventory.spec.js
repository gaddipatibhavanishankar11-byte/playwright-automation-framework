// @ts-check
import { test, expect } from '@playwright/test';
import { loginAsDefault, logout } from '../../helpers/auth.js';

/** @type {import('@playwright/test').Page} */
let sharedPage;
/** @type {import('@playwright/test').BrowserContext} */
let sharedContext;

test.describe('Inventory Module', () => {
  test.describe.configure({ timeout: 300000 });

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext();
    sharedPage = await sharedContext.newPage();
    await loginAsDefault(sharedPage);
    await sharedPage.waitForLoadState('networkidle').catch(() => {});
  });

  test.afterAll(async () => {
    if (sharedPage) {
      await logout(sharedPage).catch(() => {});
    }
    if (sharedContext) {
      await sharedContext.close();
    }
  });

  test('INV-001: Inventory page workflow from codegen', async () => {
    await sharedPage.goto('https://www.staging-buzzworld-v1.iidm.com/quote_for_parts', { waitUntil: 'networkidle', timeout: 60000 });
    await sharedPage.waitForTimeout(1000);

    const inventoryNav = sharedPage.getByText('Inventory', { exact: true }).first();
    await inventoryNav.waitFor({ state: 'visible', timeout: 30000 });
    await inventoryNav.click();
    await sharedPage.waitForLoadState('networkidle').catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await expect(sharedPage.getByRole('heading', { name: 'Inventory' })).toBeVisible({ timeout: 30000 });

    await sharedPage.locator('.react-select__value-container').click();
    await sharedPage.waitForTimeout(1000);
    await sharedPage.locator('#async-select-example').fill('231-642');
    await sharedPage.waitForTimeout(1000);
    await sharedPage.getByText('+231-642', { exact: true }).click();
    await sharedPage.waitForLoadState('networkidle').catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await expect(sharedPage.locator('.react-select__single-value')).toHaveText('+231-642');
    await sharedPage.getByLabel('clear').click();
    await sharedPage.waitForTimeout(1000);

    // INV-002: Search By Stock Code
    await sharedPage.getByRole('button', { name: 'Add Stock Code' }).click();
    await sharedPage.waitForTimeout(1000);
    await sharedPage.getByRole('menuitem', { name: 'Single Stock Code' }).click();
    await sharedPage.waitForLoadState('networkidle').catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await expect(sharedPage.getByText('Search By Stock Code', { exact: true })).toBeVisible({ timeout: 15000 });

    await sharedPage.getByText('Search By Stock Code', { exact: true }).click();
    await sharedPage.waitForTimeout(1000);
    const stockCodeContainer = sharedPage.getByRole('region', { name: 'Scrollable content' });
    await stockCodeContainer.locator('#async-select-example').fill('231-642');
    await sharedPage.waitForTimeout(1000);
    await sharedPage.locator('#react-select-3-option-1').click();
    await sharedPage.waitForLoadState('networkidle').catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await expect(stockCodeContainer.locator('.react-select__single-value', { hasText: '231-642' })).toBeVisible({ timeout: 15000 });
    await sharedPage.getByTitle('close').locator('img').click();
    await sharedPage.waitForTimeout(1000);
    await expect(sharedPage.getByRole('button', { name: 'Add Stock Code' })).toBeVisible({ timeout: 15000 });

    // INV-003: Add Stock Code
    await sharedPage.getByRole('button', { name: 'Add Stock Code' }).click();
    await sharedPage.waitForTimeout(1000);
    await sharedPage.getByRole('menuitem', { name: 'Stock Code Import' }).click();
    await sharedPage.waitForLoadState('networkidle').catch(() => {});
    await sharedPage.waitForTimeout(1000);
    const downloadPromise = sharedPage.waitForEvent('download');
    await sharedPage.getByRole('img', { name: 'loading' }).nth(5).click();
    const download = await downloadPromise;
    expect(await download.suggestedFilename()).toBeTruthy();
    await sharedPage.waitForTimeout(1000);
    await sharedPage.getByTitle('close').locator('img').click();
    await sharedPage.waitForTimeout(1000);

    // INV-004: Stock Code Import and download
    await sharedPage.getByRole('button', { name: 'Add Stock Code' }).click();
    await sharedPage.waitForTimeout(1000);
    await sharedPage.getByRole('menuitem', { name: 'BOM Import' }).click();
    await sharedPage.waitForLoadState('networkidle').catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await sharedPage.getByRole('tab', { name: 'Upload' }).click();
    await expect(sharedPage.getByRole('tab', { name: 'Upload' })).toBeVisible({ timeout: 15000 });
    const download1Promise = sharedPage.waitForEvent('download');
    await sharedPage.getByLabel('Upload').getByRole('img', { name: 'loading' }).click();
    const download1 = await download1Promise;
    expect(await download1.suggestedFilename()).toBeTruthy();
    await sharedPage.waitForTimeout(1000);

    // INV-005: BOM Import and download
    await sharedPage.getByRole('img', { name: 'parts-purchase' }).click();
    await sharedPage.waitForLoadState('networkidle').catch(() => {});
    await sharedPage.waitForTimeout(1000);
    await expect(sharedPage.getByText('Parts Purchase')).toBeVisible({ timeout: 30000 });
  });
});
