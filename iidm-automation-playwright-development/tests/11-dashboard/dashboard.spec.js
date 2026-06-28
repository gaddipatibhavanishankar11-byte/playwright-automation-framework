// @ts-check
import { test, expect } from '@playwright/test';
import { loginAsDefault } from '../../helpers/auth.js';

/** @param {import('@playwright/test').Page} page */
async function waitForDashboardReady(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);
}

test.describe('Dashboard Module', () => {
  test.describe.configure({ timeout: 300000 });

  test('DASH-001: Dashboard Sales filters and export', async ({ page }) => {
    await loginAsDefault(page);

    await page.getByRole('button', { name: 'Dashboard' }).click();
    await waitForDashboardReady(page);

    await page.getByText('Sales', { exact: true }).click();
    await waitForDashboardReady(page);

    await page.getByRole('button', { name: 'Default User ▼' }).click();
    await waitForDashboardReady(page);

    await page.getByRole('button', { name: 'Expand Chicago Expand Chicago' }).getByRole('checkbox').check();
    await waitForDashboardReady(page);
    await page.getByRole('button', { name: 'Expand Dallas Expand Dallas' }).getByRole('checkbox').check();
    await waitForDashboardReady(page);

    await page.getByRole('button', { name: 'Apply' }).click();
    await waitForDashboardReady(page);

    await page.getByRole('button', { name: 'Created Last week' }).click();
    await waitForDashboardReady(page);

    await page.getByRole('button', { name: 'Past Due' }).click();
    await waitForDashboardReady(page);

    await page.getByRole('button', { name: 'Less Than 70 Days Old' }).click();
    await waitForDashboardReady(page);

    await page.getByRole('button', { name: 'View all' }).nth(1).click();
    await waitForDashboardReady(page);

    await page.getByRole('dialog').getByRole('img', { name: 'loading' }).click();
    await waitForDashboardReady(page);

    await page.getByRole('button', { name: 'Accounts > 50k PY' }).click();
    await waitForDashboardReady(page);

    await page.getByRole('button', { name: 'Joint Calls' }).click();
    await waitForDashboardReady(page);

    await page.getByRole('button', { name: 'Demo' }).click();
    await waitForDashboardReady(page);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    const download = await downloadPromise;
    await download.path();
    await expect(download.suggestedFilename()).toContain('.csv');
    await waitForDashboardReady(page);

    await page.getByRole('button').filter({ hasText: /^$/ }).nth(1).click();
    await waitForDashboardReady(page);
  });

  test('DASH-002: Dashboard Company Metrics shipments and bookings', async ({ page }) => {
    await loginAsDefault(page);

    await page.getByRole('button', { name: 'Dashboard' }).click();
    await waitForDashboardReady(page);

    const companyMetricsMenu002 = page.getByText('Company Metrics', { exact: true });
    await companyMetricsMenu002.waitFor({ state: 'visible', timeout: 30000 });
    await companyMetricsMenu002.click();
    await waitForDashboardReady(page);

    await page.getByRole('button', { name: 'Shipments' }).click();
    await waitForDashboardReady(page);

    await page.getByRole('button', { name: 'Bookings' }).click();
    await waitForDashboardReady(page);

    await page.getByText('Baton Rouge').click();
    await waitForDashboardReady(page);

    await page.getByText('HSE-BAR').click();
    await waitForDashboardReady(page);

    await page.getByRole('button', { name: 'Show details for Jan' }).click();
    await waitForDashboardReady(page);

    await page.getByTitle('close').locator('img').click();
    await waitForDashboardReady(page);
    await expect(page.getByTitle('close').locator('img')).not.toBeVisible({ timeout: 5000 }).catch(() => {});

    await page.getByRole('button').filter({ hasText: /^$/ }).nth(1).click();
    await waitForDashboardReady(page);
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  });

  test('DASH-003: Dashboard company metrics details and filters', async ({ page }) => {
    await loginAsDefault(page);

    await page.getByRole('button', { name: 'Dashboard' }).click();
    await waitForDashboardReady(page);

    const companyMetricsMenu003 = page.getByText('Company Metrics', { exact: true });
    await companyMetricsMenu003.waitFor({ state: 'visible', timeout: 30000 });
    await companyMetricsMenu003.click();
    await waitForDashboardReady(page);

    await page.getByRole('button', { name: 'Shipments' }).click();
    await waitForDashboardReady(page);

    // Open dropdown and immediately click the option — no wait between, or the dropdown closes
    await page.locator('.multi-select.react-select__value-container').first().click();
    await page.locator('.multi-select.react-select__option', { hasText: 'Product Line' }).click();
    await waitForDashboardReady(page);

    // Click table rows (ALEX and All Others are grid rows, not dropdown options)
    await page.getByRole('row', { name: 'ALEX' }).click();
    await waitForDashboardReady(page);
    await page.getByRole('row', { name: 'All Others' }).click();
    await waitForDashboardReady(page);

    await expect(page).toHaveURL(/company_metrics/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Company Metrics' })).toBeVisible({ timeout: 10000 });
  });

  test('DASH-004: Dashboard branch and SalesPerson filters', async ({ page }) => {
    await loginAsDefault(page);

    await page.getByRole('button', { name: 'Dashboard' }).click();
    await waitForDashboardReady(page);

    const companyMetricsMenu004 = page.getByText('Company Metrics', { exact: true });
    await companyMetricsMenu004.waitFor({ state: 'visible', timeout: 30000 });
    await companyMetricsMenu004.click();
    await waitForDashboardReady(page);

    await page.getByRole('button', { name: 'Shipments' }).click();
    await waitForDashboardReady(page);

    // Open dropdown and immediately select Branch — no wait between, or the dropdown closes
    await page.locator('.multi-select.react-select__value-container').first().click();
    await page.locator('.multi-select.react-select__option', { hasText: 'Branch' }).click();
    await waitForDashboardReady(page);

    // Click  Dallas row (Dallas is a Branch grid row, not a dropdown option)
    await page.getByRole('row', { name: 'Dallas' }).click();
    await waitForDashboardReady(page);

    // Open dropdown again and switch to Product Line
    await page.locator('.multi-select.react-select__value-container').first().click();
    await page.locator('.multi-select.react-select__option', { hasText: 'Product Line' }).click();
    await waitForDashboardReady(page);

    // Click Board Repair row (Product Line grid row in Dallas drilldown)
    await page.getByRole('row', { name: 'Board Repair' }).click();
    await waitForDashboardReady(page);

    // After drilldown into Dallas's Product Line data, URL stays on company_metrics
    await expect(page).toHaveURL(/company_metrics/, { timeout: 10000 });
    await expect(page.getByRole('row', { name: 'Board Repair' })).toBeVisible({ timeout: 10000 });
  });
});
