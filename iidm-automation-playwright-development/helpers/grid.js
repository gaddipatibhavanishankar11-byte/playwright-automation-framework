// @ts-check

/**
 * Wait for the grid to load data rows.
 * Uses state: 'attached' because AG Grid uses virtual scrolling with
 * absolute positioning, so rows may not pass Playwright's visibility check.
 */
export async function waitForGridLoad(page, timeout = 30000) {
  await page.waitForLoadState('networkidle', { timeout: Math.min(timeout, 10000) }).catch(() => {});
  await page.waitForSelector('.ag-center-cols-container', {
    state: 'attached',
    timeout,
  });

  const loadingOverlay = page.locator('.ag-overlay-loading-center');
  await loadingOverlay.waitFor({ state: 'hidden', timeout }).catch(() => {});

  const visibleRows = await page.locator('.ag-center-cols-container .ag-row:not(.ag-row-loading)').count().catch(() => 0);
  if (visibleRows > 0) {
    return;
  }

  const noData = page.locator('text=/no rows|no data|no records/i').first();
  if (await noData.isVisible().catch(() => false)) {
    return;
  }

  await page.waitForTimeout(1000);
}

/**
 * Get the number of data rows currently displayed in the grid.
 */
export async function getGridRowCount(page) {
  return await page.locator('.ag-body-viewport .ag-row').count();
}

/**
 * Click a specific data row in the grid by its index.
 * AG Grid has multiple row containers (left-pinned, center, right-pinned),
 * so we target only the center viewport to avoid strict mode violations.
 */
export async function clickGridRow(page, rowIndex = 0) {
  await page.locator(`.ag-center-cols-container .ag-row[row-index="${rowIndex}"]`).click({ force: true });
}

/**
 * Get the text content of a specific cell in the grid.
 */
export async function getGridCellValue(page, rowIndex, colId) {
  return await page.locator(
    `.ag-row[row-index="${rowIndex}"] [col-id="${colId}"]`
  ).textContent();
}

/**
 * Sort a grid column by clicking its header.
 */
export async function sortGridColumn(page, colId) {
  await page.locator(`.ag-header-cell[col-id="${colId}"]`).click();
}

/**
 * Check if the grid has loaded with at least one data row.
 */
export async function isGridLoaded(page, timeout = 15000) {
  try {
    await page.locator('.ag-body-viewport .ag-row').first().waitFor({ state: 'attached', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all visible column header names from the grid.
 */
export async function getGridColumnHeaders(page) {
  const headers = await page.locator('.ag-header-cell-text').allTextContents();
  return headers.filter(h => h.trim().length > 0);
}
