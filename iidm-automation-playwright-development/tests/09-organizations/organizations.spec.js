// @ts-check
import { test, expect } from '@playwright/test';
import { loginAsDefault, logout } from '../../helpers/auth.js';
import { clickNavItem } from '../../helpers/navigation.js';
import { waitForGridLoad, getGridRowCount } from '../../helpers/grid.js';

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} searchInput
 */
async function clearSearchAndReload(page, searchInput) {
  const prefill = await searchInput.inputValue().catch(() => '');
  if (!prefill) {
    return;
  }

  const clearBtn = searchInput.locator('button[aria-label="clear"], .search-clear, [title="clear"]').first();
  if (await clearBtn.count()) {
    await clearBtn.click();
  } else {
    await searchInput.click();
    await searchInput.fill('');
    await searchInput.press('Enter');
  }

  await waitForGridLoad(page);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} searchInput
 * @param {string} searchText
 */
async function searchAndReload(page, searchInput, searchText) {
  await searchInput.click();
  await searchInput.fill(searchText);
  await searchInput.press('Enter');
  await waitForGridLoad(page);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function exportAndWait(page) {
  const currentUrl = page.url();
  const exportButton = page.locator('div.save-view.Export-Image').filter({ hasText: 'Export' }).first();
  await exportButton.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForSelector('div.save-view.Export-Image:not(.disable-btns)', { state: 'visible', timeout: 30000 });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60000 }),
    exportButton.click(),
  ]);
  await download.path();
  // Always navigate back — export click sometimes navigates away from the page
  await page.goto(currentUrl, { waitUntil: 'networkidle', timeout: 60000 });
  await waitForGridLoad(page);
  return download;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureContactsPage(page) {
  if (!page.url().includes('/contacts')) {
    await page.goto('https://www.staging-buzzworld-v1.iidm.com/contacts', { waitUntil: 'networkidle', timeout: 60000 });
  }
  await waitForGridLoad(page);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function applyFilterAndReload(page) {
  let filtersButton = page.getByRole('button', { name: 'Filters' }).first();
  if (!(await filtersButton.count())) {
    filtersButton = page.locator('div').filter({ hasText: /^Filters$/ }).first();
  }
  await filtersButton.waitFor({ state: 'visible', timeout: 30000 });
  await filtersButton.click();
  // Wait for filter panel to animate open
  await page.waitForTimeout(1500);

  // Organizations filter: Status is at nth-child(5); Contacts filter: Status is the 2nd dropdown (after Organization)
  const isContacts = page.url().includes('/contacts');
  const filterControl = isContacts
    ? page.locator('.pi-select-wrapper .react-select__value-container').nth(1)
    : page.locator('div:nth-child(5) > .css-sjtnp2 > .pi-select-wrapper > .css-5a7vsu-container > .drop-height-80px.multi-select.react-select__control > .drop-height-80px.multi-select.react-select__value-container');
  await filterControl.waitFor({ state: 'visible', timeout: 30000 });
  await filterControl.click();

  const inactiveOption = page.getByText('InActive', { exact: true });
  await inactiveOption.waitFor({ state: 'visible', timeout: 30000 });
  await inactiveOption.click();

  const applyButton = page.getByRole('button', { name: 'Apply' }).first();
  await applyButton.waitFor({ state: 'visible', timeout: 30000 });
  await applyButton.click();

  // Wait for filter panel to close, then wait for grid to reload with filtered data
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);
  await waitForGridLoad(page);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} searchInput
 */
async function clearFiltersAndReload(page, searchInput) {
  // Organizations uses "Clear" chip visible on page after filter applied
  // Contacts: filter panel closes after Apply, so re-open it and click "Close & Reset"
  const isContacts = page.url().includes('/contacts');
  if (isContacts) {
    let filtersButton = page.getByRole('button', { name: 'Filters' }).first();
    if (!(await filtersButton.count())) {
      filtersButton = page.locator('div').filter({ hasText: /^Filters$/ }).first();
    }
    await filtersButton.waitFor({ state: 'visible', timeout: 30000 });
    await filtersButton.click();
    await page.waitForTimeout(1000);

    let clearButton = page.getByRole('button', { name: 'Close & Reset' }).first();
    if (!(await clearButton.count())) {
      clearButton = page.getByText('Close & Reset', { exact: true }).first();
    }
    await clearButton.waitFor({ state: 'visible', timeout: 30000 });
    await clearButton.click();
  } else {
    const clearButton = page.getByText('Clear', { exact: true }).first();
    await clearButton.waitFor({ state: 'visible', timeout: 30000 });
    await clearButton.click();
  }
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);
  await waitForGridLoad(page);
  await clearSearchAndReload(page, searchInput);
}

/** @type {import('@playwright/test').Page} */
let sharedPage;
/** @type {import('@playwright/test').BrowserContext} */
let sharedContext;

test.describe('Organizations Module', () => {
  test.describe.configure({ timeout: 300000 });

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext({ acceptDownloads: true });
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

  test('ORG-002: Organizations codegen workflow', async () => {
    await sharedPage.goto('https://www.staging-buzzworld-v1.iidm.com/quote_for_parts', { waitUntil: 'networkidle', timeout: 60000 });
    await sharedPage.waitForTimeout(2000);
    await expect(sharedPage).toHaveURL(/quote_for_parts/, { timeout: 10000 });

    await sharedPage.getByRole('button', { name: 'Organizations' }).click();
    await sharedPage.getByRole('menuitem', { name: 'Organizations' }).click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(3000);
    await expect(sharedPage).toHaveURL(/organizations/, { timeout: 10000 });
    await waitForGridLoad(sharedPage, 60000);
    await sharedPage.waitForTimeout(2000);

    const orgSearchInput = sharedPage.getByRole('textbox', { name: 'Name / Company Name / Account' });
    await orgSearchInput.waitFor({ state: 'visible', timeout: 20000 });
    await orgSearchInput.click();
    await orgSearchInput.fill('chump03');
    await orgSearchInput.press('Enter');
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(3000);
    await waitForGridLoad(sharedPage, 60000);
    await sharedPage.waitForTimeout(2000);
    await expect(await getGridRowCount(sharedPage)).toBeGreaterThan(0);
    await expect(sharedPage.locator('text=chump03').first()).toBeVisible({ timeout: 30000 });
    await expect(await orgSearchInput.inputValue()).toBe('chump03');

    await sharedPage.locator('.new-global-search > div:nth-child(3)').click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(3000);
    await waitForGridLoad(sharedPage, 60000);
    await sharedPage.waitForTimeout(2000);
    await expect(await orgSearchInput.inputValue()).toBe('');

    const download = await (async () => {
      const dl = sharedPage.waitForEvent('download', { timeout: 60000 });
      await sharedPage.locator('div').filter({ hasText: /^Export$/ }).click();
      return dl;
    })();
    await expect(download.suggestedFilename()).toBeTruthy();
    // Navigate back to organizations after export to ensure page is in correct state
    await sharedPage.waitForTimeout(2000);
    await sharedPage.goto('https://www.staging-buzzworld-v1.iidm.com/organizations', { waitUntil: 'networkidle', timeout: 60000 });
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(3000);
    await waitForGridLoad(sharedPage, 60000);
    await sharedPage.waitForTimeout(2000);

    const filtersBtn = sharedPage.locator('div').filter({ hasText: /^Filters$/ }).first();
    await filtersBtn.waitFor({ state: 'visible', timeout: 30000 });
    await filtersBtn.click();
    await sharedPage.waitForTimeout(2000);
    const filterControl = sharedPage.locator('div:nth-child(5) > .css-sjtnp2 > .pi-select-wrapper > .css-5a7vsu-container > .drop-height-80px.multi-select.react-select__control');
    await filterControl.waitFor({ state: 'visible', timeout: 30000 });
    await filterControl.click();
    await sharedPage.waitForTimeout(2000);
    const inactiveOption = sharedPage.getByText('InActive', { exact: true });
    await inactiveOption.waitFor({ state: 'visible', timeout: 30000 });
    await inactiveOption.click();
    await sharedPage.waitForTimeout(2000);
    const applyBtn = sharedPage.getByRole('button', { name: 'Apply' });
    await applyBtn.waitFor({ state: 'visible', timeout: 30000 });
    await applyBtn.click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(3000);
    await waitForGridLoad(sharedPage, 60000);
    await sharedPage.waitForTimeout(2000);

    const resetBtn = sharedPage.getByTitle('Reset Filters ');
    await resetBtn.waitFor({ state: 'visible', timeout: 30000 });
    await resetBtn.click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(3000);
    await waitForGridLoad(sharedPage, 60000);
    await sharedPage.waitForTimeout(2000);

    await sharedPage.getByRole('button', { name: 'Organizations' }).click();
    await sharedPage.getByRole('menuitem', { name: 'Contacts' }).click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(3000);
    await expect(sharedPage).toHaveURL(/contacts/, { timeout: 10000 });
    await waitForGridLoad(sharedPage, 60000);
    await sharedPage.waitForTimeout(2000);

    const contactsSearchInput = sharedPage.getByRole('textbox', { name: 'Name / Company Name / Account' });
    await contactsSearchInput.waitFor({ state: 'visible', timeout: 20000 });
    await contactsSearchInput.click();
    await contactsSearchInput.fill('multi');
    await contactsSearchInput.press('Enter');
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(3000);
    await waitForGridLoad(sharedPage, 60000);
    await sharedPage.waitForTimeout(2000);
    await expect(await getGridRowCount(sharedPage)).toBeGreaterThan(0);
    await expect(sharedPage.locator('text=multi').first()).toBeVisible({ timeout: 30000 });
    await expect(await contactsSearchInput.inputValue()).toBe('multi');

    await sharedPage.locator('.new-global-search > div:nth-child(3)').click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(3000);

    await sharedPage.getByRole('button', { name: 'Organizations' }).click();
    await sharedPage.getByRole('menuitem', { name: 'Contacts' }).click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(3000);
    await expect(sharedPage).toHaveURL(/contacts/, { timeout: 10000 });
    await waitForGridLoad(sharedPage, 60000);
    await sharedPage.waitForTimeout(2000);

    const download1 = await (async () => {
      const dl = sharedPage.waitForEvent('download', { timeout: 60000 });
      await sharedPage.locator('div').filter({ hasText: /^Export$/ }).click();
      return dl;
    })();
    await expect(download1.suggestedFilename()).toBeTruthy();
    await sharedPage.getByRole('button', { name: 'Organizations' }).click();
    await sharedPage.getByRole('menuitem', { name: 'Contacts' }).click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(3000);
    await expect(sharedPage).toHaveURL(/contacts/, { timeout: 10000 });
    await waitForGridLoad(sharedPage, 60000);
    await sharedPage.waitForTimeout(2000);

    // Open the Filters panel first — on a fresh Contacts page load the panel is collapsed
    let contactsFiltersBtn = sharedPage.getByRole('button', { name: 'Filters' }).first();
    if (!(await contactsFiltersBtn.count())) {
      contactsFiltersBtn = sharedPage.locator('div').filter({ hasText: /^Filters$/ }).first();
    }
    await contactsFiltersBtn.waitFor({ state: 'visible', timeout: 30000 });
    await contactsFiltersBtn.click();
    await sharedPage.waitForTimeout(2000);

    const searchByOrgBtn = sharedPage.locator('div').filter({ hasText: /^Search By Organization Name$/ }).first();
    await searchByOrgBtn.waitFor({ state: 'visible', timeout: 30000 });
    await searchByOrgBtn.click();
    await sharedPage.waitForTimeout(2000);
    const organizationField = sharedPage.getByRole('textbox', { name: 'Organization' });
    await organizationField.waitFor({ state: 'visible', timeout: 20000 });
    await organizationField.fill('chump03');
    await organizationField.press('Enter');
    await sharedPage.waitForTimeout(2000);
    const orgOption = sharedPage.locator('div').filter({ hasText: /^Chump Change Automation 23CHUMP03453 Yellow Brick Road$/ }).first();
    await orgOption.waitFor({ state: 'visible', timeout: 30000 });
    await orgOption.click();
    await sharedPage.waitForTimeout(2000);
    const applyBtn2 = sharedPage.getByRole('button', { name: 'Apply' });
    await applyBtn2.waitFor({ state: 'visible', timeout: 30000 });
    await applyBtn2.click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(3000);
    await waitForGridLoad(sharedPage, 60000);
    await sharedPage.waitForTimeout(2000);

    const nextPage = sharedPage.getByRole('button', { name: 'Next Page' });
    await expect(nextPage).toBeVisible({ timeout: 20000 });
    await nextPage.click();
    await sharedPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await sharedPage.waitForTimeout(3000);
    await waitForGridLoad(sharedPage, 60000);
    await sharedPage.waitForTimeout(2000);

    await clearFiltersAndReload(sharedPage, contactsSearchInput);
    await expect(await contactsSearchInput.inputValue()).toBe('');
  });
});
