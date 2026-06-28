// @ts-check
import { test, expect } from '@playwright/test';
import { loginAsDefault, loginAsSales, BASE_URL } from '../../helpers/auth.js';
import { waitForGridLoad, clickGridRow } from '../../helpers/grid.js';
import path from 'path';

const IMPORT_FILE_PATH = path.resolve('fixtures/Import_quote_items_file.xlsx');

// Shared quote URL + ID captured in QUO-006, reused by QUO-008/009/010/011
let sharedQuoteId = '';
let sharedQuoteUrl = '';

/** @param {import('@playwright/test').Page} page */
async function clickStatusDropdown(page) {
  // Primary: find the div that contains ONLY the Status label and its react-select control.
  // This scopes the click exclusively to the Status section, avoiding Company Name / Quoted By.
  const statusField = page.locator('div').filter({
    has: page.locator('label').filter({ hasText: /^Status$/ })
  }).filter({
    has: page.locator('.react-select__control')
  }).last();

  if (await statusField.isVisible({ timeout: 5000 }).catch(() => false)) {
    await statusField.locator('.react-select__control').first().click();
    return;
  }

  // Fallback: click the Status label then find its adjacent Select
  const statusLabel = page.locator('label').filter({ hasText: 'Status' }).first();
  if (await statusLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
    await statusLabel.click();
    await page.waitForTimeout(500);
    const statusBySelect = page.locator('div').filter({ hasText: /^Select$/ }).nth(5);
    if (await statusBySelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await statusBySelect.click();
      return;
    }
  }

  await page.locator('.drop-height-80px.multi-select.react-select__control').first().click();
}

/** @param {import('@playwright/test').Page} page */
async function openFiltersPanel(page) {
  // If the Filters panel heading is already visible, it is already open — do nothing.
  const filtersHeading = page.locator('h3').filter({ hasText: /^Filters$/ }).first();
  if (await filtersHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
    return;
  }

  const filtersButton = page.locator('div').filter({ hasText: /^Filters$/ }).nth(1);
  if (await filtersButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await filtersButton.click();
  } else {
    await page.locator('div').filter({ hasText: /^Filters$/ }).first().click();
  }
  await page.waitForTimeout(2000);
  await filtersHeading.waitFor({ state: 'visible', timeout: 10000 });
}

/** @param {import('@playwright/test').Page} page */
async function clearQuoteSearchAndFilters(page) {
  const searchBox = page.locator('input[placeholder*="Quote ID"], input[placeholder*="Company Name"]').first();
  if (await searchBox.isVisible({ timeout: 3000 }).catch(() => false)) {
    const currentValue = (await searchBox.inputValue()).trim();
    if (currentValue !== '') {
      await searchBox.fill('');
      await searchBox.press('Enter');
      await page.waitForTimeout(1500);
      await waitForGridLoad(page, 30000);
    }
  }

  // Open the filters panel first so the Clear/Reset button is accessible inside it.
  // getByText('Clear') without the panel open matches wrong elements (multi-select X icons)
  // that are blocked by overlays and cause indefinite retries.
  await openFiltersPanel(page);

  const resetFilters = page.locator('[aria-label="Reset Filters"]');
  const clearButton = page.getByRole('button', { name: 'Clear' }).first();
  if (await resetFilters.isVisible({ timeout: 3000 }).catch(() => false)) {
    await resetFilters.click();
  } else if (await clearButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await clearButton.click();
  }
  await page.waitForTimeout(2500);
  await waitForGridLoad(page, 30000);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} status
 */
async function applyQuoteFilter(page, status) {
  // Step 1: Navigate to All Quotes and clear any prefilled search/filter state.
  await page.getByText('All Quotes', { exact: true }).click();
  await page.waitForTimeout(2000);
  await waitForGridLoad(page, 30000);
  await clearQuoteSearchAndFilters(page);

  // Step 2: Open the Filters panel
  await openFiltersPanel(page);

  // Step 3: Remove any pre-existing status tags (e.g. "Approved ×" left from a prior run)
  // Scoped to the Status section only so we don't accidentally remove Company Name values.
  const statusSection = page.locator('div').filter({
    has: page.locator('label').filter({ hasText: /^Status$/ })
  }).filter({
    has: page.locator('.react-select__control')
  }).last();

  const existingTags = statusSection.locator('.react-select__multi-value__remove');
  const tagCount = await existingTags.count();
  for (let i = 0; i < tagCount; i++) {
    await existingTags.first().click();
    await page.waitForTimeout(300);
  }

  // Step 4: Click the Status dropdown
  await clickStatusDropdown(page);
  await page.waitForTimeout(1500);

  // Step 6: Pick ONLY the requested status — scoped to the open dropdown list
  await page.locator('[class*="react-select__option"]').getByText(status, { exact: true }).first().click();
  await page.waitForTimeout(1000);

  // Step 7: Apply and wait for filtered results
  const applyButton = page.getByRole('button', { name: 'Apply' }).first();
  await expect(applyButton).toBeVisible({ timeout: 10000 });
  await expect(applyButton).toBeEnabled({ timeout: 10000 });
  await applyButton.click();
  await page.waitForTimeout(5000);
  await waitForGridLoad(page, 30000);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openFirstQuote(page, searchTerm = 'chump') {
  // Step 1: Click "All Quotes" in the left sidebar (filter was applied on Parts Quotes)
  await page.getByText('All Quotes', { exact: true }).click();
  await page.waitForTimeout(3000);

  // Step 2: Wait until All Quotes data is fully loaded and displayed
  await waitForGridLoad(page, 30000);
  await page.waitForTimeout(2000);

  // Step 3: Always clear the search field first (force-clear regardless of content)
  const searchBox = page.locator('input[placeholder*="Quote ID"], input[placeholder*="Company Name"]').first();
  await searchBox.waitFor({ state: 'visible', timeout: 10000 });
  const existingValue = await searchBox.inputValue();
  if (existingValue && existingValue.trim() !== '') {
    console.log(`[openFirstQuote] Search field has value "${existingValue}" — clearing before search`);
    await searchBox.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await searchBox.fill('');
    await searchBox.press('Enter');
    await page.waitForTimeout(3000);
    await waitForGridLoad(page, 30000);
    await page.waitForTimeout(1000);
  }

  // Step 4: Type the search term and press Enter
  await searchBox.click();
  await searchBox.fill(searchTerm);
  await searchBox.press('Enter');

  // Step 5: Wait for results to fully load and display
  await page.waitForTimeout(4000);
  await waitForGridLoad(page, 30000);
}

/** @param {import('@playwright/test').Page} page */
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

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} locator
 */
async function clickNavAndWait(page, locator) {
  await locator.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await waitForQuoteGridOrNoData(page, 45000);
  await page.waitForTimeout(1500);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} tabLocator
 */
async function clickTabAndWait(page, tabLocator) {
  await tabLocator.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  const visiblePanel = page.locator('[role="tabpanel"]:not([hidden])').first();
  await visiblePanel.waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1500);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function searchAndSelectCompany(page) {
  await page.getByText('Search By Account ID or Company Name').click();
  await page.waitForTimeout(500);
  await page.locator('#async-select-example').pressSequentially('chump03', { delay: 150 });
  await page.waitForTimeout(4000);
  const companyOption = page.locator('[class*=\"react-select__option\"]').filter({ hasText: /Chump Change Automation/i }).first();
  await companyOption.waitFor({ state: 'visible', timeout: 15000 });
  await companyOption.click();
  await page.waitForTimeout(2000);
}

test.describe('Quotes Module', () => {
  test.describe.configure({ timeout: 300000 });

  // QUO-001: Login, verify grid, paginate, logout
  test('QUO-001: Quotes page loads after login', async ({ page }) => {
    // Login into the application
    await loginAsDefault(page);

    // Wait until the quote page data loads and displays
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    // Click on pagination — button "Next Page" if available
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

    // Now click on profile icon
    const profileButton = page.getByRole('button', { name: 'loading' });
    await profileButton.waitFor({ state: 'visible', timeout: 30000 });
    await profileButton.click();
    await page.waitForTimeout(1000);

    // Click on logout
    await page.getByRole('menuitem', { name: 'Logout' }).click();
    await page.waitForURL('**/Login**', { timeout: 30000 });
  });

  // QUO-002: Login, filter by Status "Approved", apply, clear, verify data restored
  test('QUO-002: Quotes list renders with data', async ({ page }) => {
    // Login into the application
    await loginAsDefault(page);

    // Wait until the quote page data loads and displays
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    // Clear any prefilled search or filter state before opening filters
    await clearQuoteSearchAndFilters(page);
    await openFiltersPanel(page);

    // Status dropdown
    await page.locator('label').filter({ hasText: 'Status' }).first().click();
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(5).waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(5).click();
    await page.waitForTimeout(1000);
    await page.locator('[class*="react-select__option"]').getByText('Approved', { exact: true }).first().click();
    await page.waitForTimeout(1000);

    const applyButton = page.getByRole('button', { name: 'Apply' }).first();
    await expect(applyButton).toBeVisible({ timeout: 10000 });
    await expect(applyButton).toBeEnabled({ timeout: 10000 });
    await applyButton.click();
    await page.waitForTimeout(5000);

    await waitForGridLoad(page, 30000);

    // Reset filters using aria-label or visible Clear text
    const clearBtn = page.locator('[aria-label="Reset Filters"]');
    const clearTextBtn = page.getByRole('button', { name: 'Clear' }).first();
    const clearText = page.getByText('Clear', { exact: true }).first();
    if (await clearBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clearBtn.click();
    } else if (await clearTextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clearTextBtn.click();
    } else if (await clearText.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clearText.click();
    }

    // Wait until previous data is restored
    await page.waitForTimeout(5000);
    await waitForGridLoad(page, 30000);
  });

  // QUO-003: Login, search "CHUMP", verify results, clear search, verify data returns
  test('QUO-003: Navigate to Quotes via top nav', async ({ page }) => {
    // Login into the application
    await loginAsDefault(page);

    // Wait until the quote page data loads and displays
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    // Search in the box "CHUMP"
    const searchInput = page.getByRole('textbox', { name: /Quote ID/i });
    await searchInput.click();
    await searchInput.fill('CHUMP');

    // Press Enter to trigger the search filter
    await searchInput.press('Enter');

    // Wait until filtered data loads and displays
    await page.waitForTimeout(5000);
    await waitForGridLoad(page, 30000);

    // Then clear the "CHUMP" text
    await searchInput.clear();

    // Press Enter to trigger the filter reset
    await searchInput.press('Enter');

    // Previous data will be returned — wait until data loads and displays
    await page.waitForTimeout(5000);
    await waitForGridLoad(page, 30000);
  });

  // QUO-004: Login, sort by Quote ID column (ascending then descending)
  test('QUO-004: Search/filter quotes', async ({ page }) => {
    // Login into the application
    await loginAsDefault(page);

    // Wait until the quote page data loads and displays
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    // Click on "Quote ID" column header to sort ascending
    const quoteIdHeader = page.locator('.ag-header-cell-text').filter({ hasText: 'Quote ID' });
    await quoteIdHeader.click();

    // Wait until sorted data displays
    await page.waitForTimeout(3000);
    await waitForGridLoad(page, 30000);

    // Click again to reverse sort (descending)
    await quoteIdHeader.click();
    await page.waitForTimeout(3000);
    await waitForGridLoad(page, 30000);
  });

  // QUO-005: Login, click a quote row, verify redirect to detail page
  test('QUO-005: Open a quote detail page', async ({ page }) => {
    // Login into the application
    await loginAsDefault(page);

    // Wait until the quote page data loads and displays
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    // Click on first quote row — it will redirect to another page
    await clickGridRow(page, 0);

    // Wait for redirect and for all page data to fully load
    await page.waitForURL('**/quote_for_parts/**', { timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(5000);

    // Verify detail page loaded — Quote Items section is visible
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });
  });

  // QUO-006: Create new quote with company, project name, and Parts Quote type
  test('QUO-006: Create new quote', async ({ page }) => {
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    // Click "Create Quote" panel trigger (generic element, not a button)
    await page.getByText('Create Quote', { exact: true }).click();
    await page.waitForTimeout(3000);

    // Search "chump03" in Company Name async-select
    // Click the placeholder text first to activate the dropdown
    await page.getByText('Search By Account ID or Company Name').click();
    await page.waitForTimeout(500);
    // Type the search term character by character to trigger API
    await page.locator('#async-select-example').pressSequentially('chump03', { delay: 150 });
    await page.waitForTimeout(4000);

    // Wait for dropdown options and select "Chump Change Automation 23"
    await page.locator('[class*="react-select__option"]').filter({ hasText: /Chump Change Automation/i }).first().waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('[class*="react-select__option"]').filter({ hasText: /Chump Change Automation/i }).first().click();
    await page.waitForTimeout(2000);

    // Fill Project Name
    await page.locator('input[name="project_name"]').fill('test');
    await page.waitForTimeout(1000);

    // Select Quote Type "Parts Quote" — click the placeholder to open dropdown
    await page.locator('[class*="react-select__placeholder"]').filter({ hasText: 'Quote Type' }).click();
    await page.waitForTimeout(2000);
    await page.locator('[class*="react-select__option"]').filter({ hasText: 'Parts Quote' }).first().click();
    await page.waitForTimeout(1000);

    // Click the "Create Quote" submit button (bottom of panel)
    const createQuoteButton = page.getByRole('button', { name: 'Create Quote' }).first();
    await expect(createQuoteButton).toBeVisible({ timeout: 15000 });
    await createQuoteButton.click();

    // Wait for redirect to quote detail page, toast, and detail content to load
    await page.waitForURL('**/quote_for_parts/**', { timeout: 45000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);

    const quoteItemsHeader = page.locator('h4').filter({ hasText: /Quote Items/ }).first();
    await quoteItemsHeader.waitFor({ state: 'visible', timeout: 45000 });
    await page.waitForTimeout(2000);

    // Capture the created quote URL and ID for use in QUO-008/009/010/011
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

    // Verify we are on a quote detail URL (/quote_for_parts/<uuid>)
    expect(page.url()).toMatch(/\/quote_for_parts\/.+/);

    // Verify status is OPEN
    await expect(page.locator('[class*="open"]').first()).toBeVisible({ timeout: 15000 });
  });

  // QUO-007: Create new quote without selecting a quote type
  test('QUO-007: Create new quote without quote type', async ({ page }) => {
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    // Click "Create Quote" panel trigger
    await page.getByText('Create Quote', { exact: true }).click();
    await page.waitForTimeout(3000);

    // Search "chump03" in Company Name async-select
    await page.getByText('Search By Account ID or Company Name').click();
    await page.waitForTimeout(500);
    await page.locator('#async-select-example').pressSequentially('chump03', { delay: 150 });
    await page.waitForTimeout(4000);

    // Select "Chump Change Automation 23"
    await page.locator('[class*="react-select__option"]').filter({ hasText: /Chump Change Automation/i }).first().waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('[class*="react-select__option"]').filter({ hasText: /Chump Change Automation/i }).first().click();
    await page.waitForTimeout(2000);

    // Fill Project Name
    await page.locator('input[name="project_name"]').fill('test');
    await page.waitForTimeout(1000);

    // Click "Create Quote" submit button (no quote type selected)
    await page.getByRole('button', { name: 'Create Quote' }).click();
    await page.waitForTimeout(3000);

    // Without Quote Type selected, a validation error should appear
    // The form stays on the same page and shows "Please select Quote Type"
    await expect(page.getByText('Please select Quote Type')).toBeVisible({ timeout: 10000 });
  });

  // QUO-008: Add item to an existing open quote
  test('QUO-008: Add items to quote', async ({ page }) => {
    await loginAsDefault(page);

    // Navigate directly to the quote created by QUO-006 (no grid search needed)
    await page.goto(sharedQuoteUrl);
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    // Scroll down to Quote Items section
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('h4')].find(h => h.textContent.includes('Quote Items'));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await page.waitForTimeout(2000);

    // Click "Add Items" button
    await page.getByText('Add Items', { exact: true }).click();

    // Wait for the Add Items modal to open before typing
    const partSearch = page.getByPlaceholder('Search By Part Number');
    await partSearch.waitFor({ state: 'visible', timeout: 15000 });
    await partSearch.fill('231-642');
    await page.waitForTimeout(3000);

    // Select ALL visible item checkboxes in the search results
    const checkboxes = page.locator('input.repair-item-checkbox');
    await checkboxes.first().waitFor({ state: 'visible', timeout: 10000 });
    const cbCount = await checkboxes.count();
    for (let i = 0; i < cbCount; i++) {
      await checkboxes.nth(i).click({ force: true });
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(1000);

    // Click "Add Selected X Items" button (appears after checkbox selection)
    await page.locator('button').filter({ hasText: /Add Selected/i }).click();
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle').catch(() => {});

    // Verify item was added — "Quote Items (1)" or more heading appears
    await expect(page.locator('h4').filter({ hasText: /Quote Items \(\d+\)/ })).toBeVisible({ timeout: 15000 });
  });

  // QUO-009: Edit item — change quantity and select Source, then save
  test('QUO-009: Edit quote item quantity', async ({ page }) => {
    await loginAsDefault(page);

    // Navigate directly to the quote created by QUO-006
    await page.goto(sharedQuoteUrl);
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    // Scroll to Quote Items section
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('h4')].find(h => h.textContent.includes('Quote Items'));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await page.waitForTimeout(2000);

    // Click the chevron-right button to expand the item edit form
    await page.getByRole('button', { name: 'chevron-right' }).first().click({ force: true });
    await page.waitForTimeout(2000);

    // Change quantity to 5
    await page.getByPlaceholder('Quantity').click();
    await page.getByPlaceholder('Quantity').fill('5');
    await page.waitForTimeout(500);

    // Select Source — open the "Select" dropdown (nth(2) based on DOM order)
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await page.waitForTimeout(2000);
    // Select first available option from the Source dropdown
    await page.locator('[class*="react-select__option"]:visible').first().click();
    await page.waitForTimeout(1000);

    // Click Save
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle').catch(() => {});

    // Verify Quote Items section still visible (data reloaded)
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('h4')].find(h => h.textContent.includes('Quote Items'));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await page.waitForTimeout(2000);
    await expect(page.locator('h4').filter({ hasText: /Quote Items \(\d+\)/ })).toBeVisible({ timeout: 10000 });
  });

  // QUO-010: Delete a quote item — click delete icon beside edit icon, confirm Yes
  test('QUO-010: Delete quote item', async ({ page }) => {
    await loginAsDefault(page);

    // Navigate directly to the quote created by QUO-006
    await page.goto(sharedQuoteUrl);
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    // Scroll to Quote Items section
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('h4')].find(h => h.textContent.includes('Quote Items'));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await page.waitForTimeout(2000);

    // Get item count before deletion
    const headingText = (await page.locator('h4').filter({ hasText: /Quote Items \(\d+\)/ }).textContent().catch(() => 'Quote Items (0)')) ?? 'Quote Items (0)';
    const matchBefore = headingText.match(/\((\d+)\)/);
    const countBefore = matchBefore ? parseInt(matchBefore[1]) : 0;

    // Click the delet-icon button on the item row (nth(1) = item-level delete)
    await page.getByRole('button', { name: 'delet-icon' }).nth(1).scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'delet-icon' }).nth(1).click({ force: true });
    await page.waitForTimeout(2000);

    // Confirm deletion in the #repair-items confirm dialog
    await page.locator('#repair-items').getByRole('button', { name: 'Yes' }).click();
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle').catch(() => {});

    // Scroll back and verify item count decreased
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

  // QUO-011: Add quote option — Duplicate from existing option, select item, add selected
  test('QUO-011: Add quote option', async ({ page }) => {
    await loginAsDefault(page);

    // Navigate directly to the quote created by QUO-006
    await page.goto(sharedQuoteUrl);
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    // Scroll down to Quote Items section
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('h4')].find(h => h.textContent.includes('Quote Items'));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await page.waitForTimeout(2000);

    // Navigate to Option 2 tab if it exists, else stay on current tab
    const option2Tab = page.getByText('Option 2', { exact: true });
    const hasOption2 = await option2Tab.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasOption2) {
      await option2Tab.click();
      await page.waitForTimeout(2000);
    }

    // Click "Add Options" button
    await page.getByRole('button', { name: /Add Options/i }).click({ force: true });
    await page.waitForTimeout(3000);

    // In the Add Option modal, open the "Duplicate from" Select dropdown
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await page.waitForTimeout(2000);

    // Wait for dropdown options and select the first one
    await page.locator('[class*="react-select__option"]:visible').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('[class*="react-select__option"]:visible').first().click();
    await page.waitForTimeout(5000);

    // After selection, items appear in the Add Option modal's tabpanel
    // Use .last() to get the modal's tabpanel (2 tabpanels exist on the page)
    const modalTabpanel = page.getByRole('tabpanel').last();
    await modalTabpanel.waitFor({ state: 'visible', timeout: 15000 });

    // Click first checkbox — use Playwright .click() (not .check() or .evaluate) so React events fire
    const modalCheckbox = modalTabpanel.getByRole('checkbox').first();
    await modalCheckbox.waitFor({ state: 'visible', timeout: 15000 });
    await modalCheckbox.click();
    await page.waitForTimeout(2000);

    // The "Add Items" button is disabled until a checkbox is selected; scope within modal tabpanel
    // After checking, button text may change to "Add Selected X Items"
    const addItemsBtn = modalTabpanel.getByRole('button', { name: /Add (Items|Selected)/i });
    await expect(addItemsBtn).toBeEnabled({ timeout: 10000 });
    await addItemsBtn.click();
    await page.waitForTimeout(6000);
    await page.waitForLoadState('networkidle').catch(() => {});
    // Verify new option tab was created (Option 2 or Option 3)
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('h4')].find(h => h.textContent.includes('Quote Items'));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await page.waitForTimeout(2000);
    await expect(page.locator('h4').filter({ hasText: /Quote Items \(\d+\)/ })).toBeVisible({ timeout: 10000 });
  });

  test('QUO-015: Submit quote for internal submit', async ({ page }) => {
    // Step 1: Login
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    // Step 2: Apply Approved filter (navigates to All Quotes automatically)
    await applyQuoteFilter(page, 'Approved');

    // Step 3: Click the first Approved quote row
    await clickGridRow(page, 0);
    await page.waitForURL(/\/(quote_for_parts|all_quotes|repair_quotes|system_quotes)\/.+/, { timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    // Step 4: Click "Submit for Customer Approval" button on the detail page
    const submitBtn = page.getByRole('button', { name: /Submit for Customer Approval/i }).first();
    await expect(submitBtn).toBeVisible({ timeout: 15000 });
    await submitBtn.click();

    // Step 5: Confirmation opens — click the Submit button
    const confirmSubmitBtn = page.getByRole('button', { name: /^Submit$/i }).first();
    await expect(confirmSubmitBtn).toBeVisible({ timeout: 15000 });
    await confirmSubmitBtn.click();

    // Step 6: Wait for submit to process and detail page to reload
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });
  });

  test('QUO-016: Clone won quote and proceed', async ({ page }) => {
    // Step 1: Login
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    // Step 2: Clear filters, apply Won filter, wait for filtered Parts Quotes data
    await applyQuoteFilter(page, 'Won');
    await page.waitForTimeout(2000);

    // Step 3: Click the first quote row from the filtered Parts Quotes grid
    await clickGridRow(page, 0);
    await page.waitForURL(/\/(quote_for_parts|all_quotes|repair_quotes|system_quotes)\/.+/, { timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    // Step 4: Open the 3-dot kebab menu and click Clone
    const kebabBtn = page.getByRole('button').filter({ hasText: /^$/ }).nth(2);
    await expect(kebabBtn).toBeVisible({ timeout: 15000 });
    await kebabBtn.click();
    await page.waitForTimeout(1500);
    await page.getByRole('menuitem', { name: 'Clone' }).click();

    // Step 5: Select the clone customer and submit
    const cloneModalTitle = page.locator('h3').filter({ hasText: /Clone (Repair|Quote)/i }).first();
    await cloneModalTitle.waitFor({ state: 'visible', timeout: 15000 });

    const cloneModalTrigger = page.locator('div').filter({ hasText: /^Search By Account ID or Company Name$/ }).first();
    const hasCloneSearch = await cloneModalTrigger.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasCloneSearch) {
      // Parts/System Quote clone — search and select company
      await cloneModalTrigger.click();
      await page.locator('#async-select-example').pressSequentially('chump03', { delay: 100 });
      await page.waitForTimeout(3000);
      const cloneCompanyOpt = page.locator('[class*="react-select__option"]').filter({ hasText: /Chump Change/i }).first();
      await cloneCompanyOpt.waitFor({ state: 'visible', timeout: 15000 });
      await cloneCompanyOpt.click();
      await page.waitForTimeout(2000);
    }
    // Repair Quote clone — RMA is pre-filled, nothing extra needed

    // Click Proceed — .last() always targets the modal button, not background dialogs
    await page.getByRole('button', { name: /Proceed/i }).last().click();
    await page.waitForTimeout(3000);
    // Handle any second confirmation dialog
    const secondConfirm16 = page.getByRole('button', { name: /Proceed/i }).last();
    if (await secondConfirm16.isVisible({ timeout: 5000 }).catch(() => false)) {
      await secondConfirm16.click();
    }
    // Use element-based wait instead of URL pattern — repair quotes may have different URL structure
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 60000 });
  });

  test('QUO-017: Mark delivered quote as lost', async ({ page }) => {
    // Step 1: Login
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    // Step 2: Clear filters, apply Delivered to Customer filter, wait for filtered Parts Quotes data
    await applyQuoteFilter(page, 'Delivered to Customer');
    await page.waitForTimeout(2000);

    // Step 3: Click the first quote row from the filtered Parts Quotes grid
    await clickGridRow(page, 0);
    await page.waitForURL(/\/(quote_for_parts|all_quotes|repair_quotes|system_quotes)\/.+/, { timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    // Step 4: Click Lost button
    const lostBtn = page.getByRole('button', { name: /Lost/i }).first();
    await expect(lostBtn).toBeVisible({ timeout: 15000 });
    await lostBtn.click();

    // Step 5: Confirm the Lost action if a confirmation dialog appears
    const confirmLostBtn = page.getByRole('button', { name: /Proceed/i }).first();
    if (await confirmLostBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await confirmLostBtn.click();
    }

    // Step 6: Wait until the quote detail page reloads and shows updated status
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(5000);
    await waitForGridLoad(page, 30000).catch(() => {});
    await page.waitForTimeout(2000);
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/Lost/i).first()).toBeVisible({ timeout: 30000 });
  });

  test('QUO-018: Clone lost quote and proceed with reject', async ({ page }) => {
    // Step 1: Login
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    // Step 2: Clear filters, apply Lost filter, wait for filtered Parts Quotes data
    await applyQuoteFilter(page, 'Lost');
    await page.waitForTimeout(2000);

    // Step 3: Click the first quote row from the filtered Parts Quotes grid
    await clickGridRow(page, 0);
    await page.waitForURL(/\/(quote_for_parts|all_quotes|repair_quotes|system_quotes)\/.+/, { timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    // Step 4: Open the 3-dot kebab menu and click Clone
    const kebabBtn18 = page.getByRole('button').filter({ hasText: /^$/ }).nth(2);
    await expect(kebabBtn18).toBeVisible({ timeout: 15000 });
    await kebabBtn18.click();
    await page.waitForTimeout(1500);
    await page.getByRole('menuitem', { name: 'Clone' }).click();

    // Step 5: Select the clone customer and submit
    const cloneModalTitle = page.locator('h3').filter({ hasText: /Clone (Repair|Quote)/i }).first();
    await cloneModalTitle.waitFor({ state: 'visible', timeout: 15000 });

    const cloneModalTrigger18 = page.locator('div').filter({ hasText: /^Search By Account ID or Company Name$/ }).first();
    const hasCloneSearch = await cloneModalTrigger18.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasCloneSearch) {
      // Parts/System Quote clone — search and select company
      await cloneModalTrigger18.click();
      await page.locator('#async-select-example').pressSequentially('chump03', { delay: 100 });
      await page.waitForTimeout(3000);
      const cloneCompanyOpt18 = page.locator('[class*="react-select__option"]').filter({ hasText: /Chump Change/i }).first();
      await cloneCompanyOpt18.waitFor({ state: 'visible', timeout: 15000 });
      await cloneCompanyOpt18.click();
      await page.waitForTimeout(2000);
    }
    // Repair Quote clone — RMA is pre-filled, nothing extra needed

    // Click Proceed — wait for it to be enabled first (Repair Quote modal may load async)
    const proceedBtn18 = page.getByRole('button', { name: /Proceed/i }).last();
    await expect(proceedBtn18).toBeEnabled({ timeout: 15000 });
    await proceedBtn18.click();
    await page.waitForTimeout(3000);
    // Use element-based wait — Repair Quote URLs differ from Parts Quote URL pattern
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 60000 });
  });

  test('QUO-019: Clone open quote to another company', async ({ page }) => {
    // Step 1: Login
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    // Step 2: Clear existing filters and apply Open filter
    await applyQuoteFilter(page, 'Open');
    await page.waitForTimeout(2000);

    // Step 3: Click the first quote row from the filtered Parts Quotes grid
    await clickGridRow(page, 0);
    await page.waitForURL(/\/(quote_for_parts|all_quotes|repair_quotes|system_quotes)\/.+/, { timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    // Step 4: Open the 3-dot kebab menu and click Clone
    const kebabBtn19 = page.getByRole('button').filter({ hasText: /^$/ }).nth(2);
    await expect(kebabBtn19).toBeVisible({ timeout: 15000 });
    await kebabBtn19.click();
    await page.waitForTimeout(1500);
    await page.getByRole('menuitem', { name: 'Clone' }).click();

    // Step 5: Handle clone modal — Parts quotes show company search, Repair quotes have RMA pre-filled
    const cloneModalTitle19 = page.locator('h3').filter({ hasText: /Clone (Repair|Quote)/i }).first();
    await cloneModalTitle19.waitFor({ state: 'visible', timeout: 15000 });

    const cloneModalTrigger19 = page.locator('div').filter({ hasText: /^Search By Account ID or Company Name$/ }).first();
    const hasCloneSearch19 = await cloneModalTrigger19.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasCloneSearch19) {
      await cloneModalTrigger19.click();
      await page.locator('#async-select-example').pressSequentially('chump03', { delay: 100 });
      await page.waitForTimeout(3000);
      const cloneCompanyOpt19 = page.locator('[class*="react-select__option"]').filter({ hasText: /Chump Change/i }).first();
      await cloneCompanyOpt19.waitFor({ state: 'visible', timeout: 15000 });
      await cloneCompanyOpt19.click();
      await page.waitForTimeout(2000);
    }

    const proceedBtn19 = page.getByRole('button', { name: /Proceed/i }).last();
    await expect(proceedBtn19).toBeEnabled({ timeout: 15000 });
    await proceedBtn19.click();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 60000 });
  });

  test('QUO-020: Revise delivered quote to open', async ({ page }) => {
    // Step 1: Login
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    // Step 2: Clear filters, apply Delivered to Customer filter, wait for data
    await applyQuoteFilter(page, 'Delivered to Customer');
    await page.waitForTimeout(2000);

    // Step 3: Click the first quote row from the filtered Parts Quotes grid
    await clickGridRow(page, 0);
    await page.waitForURL(/\/(quote_for_parts|all_quotes|repair_quotes|system_quotes)\/.+/, { timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    // Step 4: Click Revise Quote button
    const reviseBtn = page.getByRole('button', { name: /Revise Quote/i }).first();
    await expect(reviseBtn).toBeVisible({ timeout: 15000 });
    await reviseBtn.click();

    // Step 5: Confirm revise and wait until detail data reloads and displays
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

  test('QUO-021: Download quote PDF from open quote', async ({ page }) => {
    // Step 1: Login
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    // Step 2: Clear filters, apply Open filter, wait for data
    await applyQuoteFilter(page, 'Open');
    await page.waitForTimeout(2000);

    // Step 3: Click the first quote row from the filtered Parts Quotes grid
    await clickGridRow(page, 0);
    await page.waitForURL(/\/(quote_for_parts|all_quotes|repair_quotes|system_quotes)\/.+/, { timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4').filter({ hasText: /Quote Items/ })).toBeVisible({ timeout: 30000 });

    // Step 4: Open the 3-dot action menu and click Download
    const kebabBtn = page.getByRole('button').filter({ hasText: /^$/ }).nth(2);
    await expect(kebabBtn).toBeVisible({ timeout: 15000 });
    await kebabBtn.click();
    await page.waitForTimeout(1500);
    const downloadMenuItem = page.getByRole('menuitem', { name: /Download/i }).first();
    await expect(downloadMenuItem).toBeVisible({ timeout: 20000 });
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      downloadMenuItem.click(),
    ]);
    await expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('QUO-022: Import quote items from Excel', async ({ page }) => {
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(2000);

    await applyQuoteFilter(page, 'Open');
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

    // Click + Create Sales Order (top-right button) — this opens the PO form modal
    const createSalesOrderBtn = page.locator('div').filter({ hasText: /^Create Sales Order$/ }).first();
    await expect(createSalesOrderBtn).toBeVisible({ timeout: 15000 });
    await createSalesOrderBtn.click();
    await page.waitForTimeout(2000);

    // Fill PO and FOB inside the modal
    await expect(page.getByRole('textbox', { name: 'Enter PO Number' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('textbox', { name: 'Enter PO Number' }).fill('123');
    await page.locator('div').filter({ hasText: /^Select FOB Point$/ }).nth(2).click();
    await page.getByText('FOB FACTORY', { exact: true }).click();
    await page.waitForTimeout(1000);

    // Click "Create" button to submit the PO modal and navigate to sales order
    await page.getByRole('button', { name: 'Create', exact: true }).last().click();
    await page.waitForURL(/orders-detail-view|order|sales-order/, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // Navigate back to Quotes
    await page.getByText('Quotes').first().click();
    await page.waitForURL(/quote_for_parts|all_quotes/, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await expect(page.getByRole('heading', { name: 'Quotes' })).toBeVisible({ timeout: 30000 });
  });

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

  test('QUO-025: Quote detail tabs all load', async ({ page }) => {
    test.setTimeout(300000);
    await loginAsDefault(page);
    await page.waitForLoadState('networkidle');
    await waitForGridLoad(page, 60000);
    await page.waitForTimeout(3000);

    // Filter for Open quotes so the first row always has Add Items / Add Options buttons
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
