import { test, expect } from '@playwright/test';
import { loginAsDefault, logout } from "../../helpers/auth.js";
import { waitForGridLoad } from "../../helpers/grid.js";

const JOBS_URL = "https://www.staging-buzzworld-v1.iidm.com/jobs";

test.describe("Jobs Module", () => {
  test.describe.configure({ timeout: 120000 });

  async function openJobsPage(page) {
    await page.goto(JOBS_URL);
    await page.waitForLoadState("networkidle").catch(() => {});
    await expect(page.getByRole("heading", { name: "Jobs", level: 1 })).toBeVisible({ timeout: 30000 });
    await waitForGridLoad(page, 60000);
    const rowCount = await page.locator(".ag-center-cols-container .ag-row").count();
    if (rowCount > 0) {
      await expect(page.locator(".ag-center-cols-container .ag-row").first()).toBeVisible({ timeout: 60000 });
    } else {
      await expect(page.locator(".ag-center-cols-container")).toBeVisible({ timeout: 60000 });
    }
  }

  test("JOB-001: Jobs page loads with grid data after login", async ({ page }) => {
    await loginAsDefault(page);
    await openJobsPage(page);
    await expect(page.getByRole("heading", { name: "Jobs", level: 1 })).toBeVisible();
    await expect(page.locator(".ag-center-cols-container .ag-row").first()).toBeVisible({ timeout: 30000 });
    await logout(page);
  });

  test("JOB-002: Sort jobs grid by Job ID column", async ({ page }) => {
    await loginAsDefault(page);
    await openJobsPage(page);
    await page.getByText("Job ID").click();
    await waitForGridLoad(page, 60000);
    await expect(page.locator(".ag-center-cols-container .ag-row").first()).toBeVisible({ timeout: 60000 });
    await page.getByText("Job ID").click();
    await waitForGridLoad(page, 60000);
    await expect(page.locator(".ag-center-cols-container .ag-row").first()).toBeVisible({ timeout: 60000 });
    await logout(page);
  });

  test("JOB-003: Click any job ID and verify detail page loads", async ({ page }) => {
    await loginAsDefault(page);
    await openJobsPage(page);
    const firstRow = page.locator('.ag-center-cols-container .ag-row[row-index="0"]');
    await expect(firstRow).toBeVisible({ timeout: 30000 });
    await firstRow.click();
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).not.toMatch(/\/jobs\/?$/);
    await logout(page);
  });

  test("JOB-004: Search job 93176 then clear the filter", async ({ page }) => {
    await loginAsDefault(page);
    await openJobsPage(page);
    const searchInput = page.getByRole("textbox", { name: "Job ID / Sales Order ID" });
    const existingSearchValue = await searchInput.inputValue();
    if (existingSearchValue.trim().length > 0) {
      await searchInput.fill("");
      await searchInput.press("Enter");
      await page.waitForLoadState("networkidle").catch(() => {});
      await waitForGridLoad(page, 60000);
    }
    await searchInput.click();
    await searchInput.fill("93176");
    await searchInput.press("Enter");
    await page.waitForLoadState("networkidle").catch(() => {});
    await waitForGridLoad(page, 60000);
    await expect(page.locator(".ag-center-cols-container .ag-row").first()).toBeVisible({ timeout: 60000 });
    // Clear the search box and wait for all data to reload
    await searchInput.fill("");
    await searchInput.press("Enter");
    await page.waitForLoadState("networkidle").catch(() => {});
    await waitForGridLoad(page, 60000);
    await expect(page.locator(".ag-center-cols-container .ag-row").first()).toBeVisible({ timeout: 60000 });
    await logout(page);
  });

  test("JOB-005: Search job 93176, open detail, and add time entry", async ({ page }) => {
    test.setTimeout(180000);
    await loginAsDefault(page);
    await openJobsPage(page);
    await page.getByRole("textbox", { name: "Job ID / Sales Order ID" }).click();
    await page.getByRole("textbox", { name: "Job ID / Sales Order ID" }).fill("93176");
    await page.getByRole("textbox", { name: "Job ID / Sales Order ID" }).press("Enter");
    await page.waitForLoadState("networkidle").catch(() => {});
    await waitForGridLoad(page, 60000);
    await expect(page.locator(".ag-center-cols-container .ag-row").first()).toBeVisible({ timeout: 60000 });
    await page.getByRole("gridcell", { name: "93176", exact: true }).click();
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(2000);
    await page.getByRole("img", { name: "upload" }).click();
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1500);
    // Open Employee dropdown and select first option
    await page.locator("div").filter({ hasText: /^Select$/ }).nth(2).click();
    await page.waitForTimeout(1500);
    await page.locator(".react-select__option").first().click();
    await page.waitForTimeout(500);
    // Open Activity dropdown and pick MATERIAL STAGING
    await page.locator("div").filter({ hasText: /^Select$/ }).first().click();
    await page.waitForTimeout(1500);
    await page.locator(".react-select__option").filter({ hasText: /MATERIAL STAGING/ }).first().click();
    await page.getByRole("textbox", { name: "Spent Time (Hours)" }).click();
    await page.getByRole("textbox", { name: "Spent Time (Hours)" }).fill("1");
    await page.getByRole("button", { name: "Add" }).click();
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1000);
    await page.locator(".Back-main").click();
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1000);
    await logout(page);
  });

  test("JOB-006: Create a new job using the create job flow", async ({ page }) => {
    test.setTimeout(180000);
    await loginAsDefault(page);
    await openJobsPage(page);
    // Open Create Job modal
    await page.locator('div').filter({ hasText: /^Create Job$/ }).click();
    await expect(page.getByRole('heading', { name: 'Create Job' })).toBeVisible({ timeout: 15000 });
    // Enter Order ID
    const orderIdInput = page.getByPlaceholder('Search Order ID');
    await orderIdInput.click();
    await orderIdInput.fill('254674');
    await page.waitForSelector('.react-select__option', { state: 'visible', timeout: 15000 });
    await page.locator('.react-select__option').first().click();
    // Select Sales Order Line item
    await page.locator('div').filter({ hasText: /^Select An Item$/ }).click();
    await page.getByText('+231-642(1)', { exact: true }).click();
    // Enter Job Description
    await page.getByRole('textbox', { name: 'Enter Job Description' }).fill('test');
    // Fill Warehouse and Sales Order Line
    await page.getByPlaceholder('Warehouse').fill('90');
    await page.getByPlaceholder('Sales Order Line').fill('1');
    // Select Delivery Date
    const deliveryInput = page.getByPlaceholder('MM/DD/YYYY');
    await deliveryInput.click();
    await page.getByRole('gridcell', { name: '29' }).nth(1).click();
    // Create job and wait for the modal to close
    await page.getByRole('button', { name: 'Create Job' }).click();
    await page.getByRole('heading', { name: 'Create Job' }).waitFor({ state: 'hidden', timeout: 30000 });
    await logout(page);
  });
});
