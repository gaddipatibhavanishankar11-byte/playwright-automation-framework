// @ts-check
import { expect } from '@playwright/test';

/**
 * Assert a toast/snackbar notification contains the expected message.
 */
export async function expectToast(page, message, timeout = 10000) {
  const toast = page.locator('.toast, .snackbar, [role="alert"], .Toastify__toast');
  await expect(toast).toContainText(message, { timeout });
}

/**
 * Assert the current URL contains a specific path.
 */
export async function expectUrlContains(page, path) {
  expect(page.url()).toContain(path);
}

/**
 * Assert a page heading or title text is visible.
 */
export async function expectPageTitle(page, title) {
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 15000 });
}

/**
 * Assert an element with specific text is visible.
 */
export async function expectVisible(page, text, timeout = 15000) {
  await expect(page.getByText(text).first()).toBeVisible({ timeout });
}

/**
 * Assert an element with specific text is NOT visible.
 */
export async function expectNotVisible(page, text) {
  await expect(page.getByText(text).first()).not.toBeVisible({ timeout: 5000 });
}

/**
 * Assert a modal/dialog is visible.
 */
export async function expectModalVisible(page) {
  await expect(page.locator('[role="dialog"], .modal, .MuiDialog-root')).toBeVisible();
}
