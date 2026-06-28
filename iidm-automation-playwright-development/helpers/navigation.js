// @ts-check
import { BASE_URL } from './auth.js';

/**
 * Navigate to a specific module page. Waits for the page to be interactive.
 */
export async function navigateTo(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
}

/**
 * Click a top-level navigation menu item by its visible text.
 */
export async function clickNavItem(page, menuText) {
  const menuItem = page.getByText(menuText, { exact: true }).first();
  await menuItem.waitFor({ state: 'visible', timeout: 30000 });
  await menuItem.click();
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate directly to the dashboard page.
 */
export async function navigateToDashboard(page) {
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForURL('**/dashboard**', { timeout: 120000 }).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);
}

/**
 * Verify a navigation menu item is visible.
 */
export async function isNavItemVisible(page, menuText) {
  const menuItem = page.getByText(menuText).first();
  return await menuItem.isVisible({ timeout: 10000 }).catch(() => false);
}

/**
 * Get all visible top-level navigation menu item texts.
 * Replace this list with the modules relevant to your own application.
 */
export async function getVisibleNavItems(page) {
  await page.waitForTimeout(3000);
  const navItems = ['Dashboard', 'Admin', 'Reports', 'Settings', 'Users', 'Orders'];
  const visible = [];
  for (const item of navItems) {
    if (await isNavItemVisible(page, item)) {
      visible.push(item);
    }
  }
  return visible;
}
