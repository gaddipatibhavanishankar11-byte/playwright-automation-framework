// @ts-check
import { expect } from '@playwright/test';

// Replace these with your application's actual URLs via environment variables
const BASE_URL = process.env.BASE_URL || 'https://app.example.com';
const SSO_URL = process.env.SSO_URL || 'https://sso.example.com';
const PORTAL_URL = process.env.PORTAL_URL || 'https://portal.example.com';

/**
 * Login via SSO redirect flow.
 * Navigates to the app URL which redirects to SSO, fills credentials, and waits for redirect back.
 */
export async function login(page, email, password, landingPath = '/dashboard') {
  await page.goto(`${BASE_URL}${landingPath}`);

  const currentUrl = page.url();
  if (!currentUrl.includes('/Login') && !currentUrl.includes(SSO_URL)) {
    await page.waitForURL(`**${landingPath}`, { timeout: 60000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    return;
  }

  await page.waitForURL('**/Login**', { timeout: 30000 });

  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).pressSequentially(email, { delay: 50 });
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).pressSequentially(password, { delay: 50 });
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();

  await page.waitForURL(
    url => {
      const href = String(url);
      return href.startsWith(BASE_URL) &&
        !href.includes('/Login') &&
        !href.includes(SSO_URL) &&
        !href.includes('/loading');
    },
    { timeout: 120000 }
  );
  await page.waitForTimeout(5000);
}

/**
 * Login as default/admin user.
 * Credentials are pulled from environment variables — never hardcode real credentials.
 */
export async function loginAsDefault(page) {
  await login(page, process.env.DEFAULT_USER_EMAIL, process.env.DEFAULT_USER_PASSWORD, '/dashboard');
}

/**
 * Login as a sales/secondary role user.
 */
export async function loginAsSales(page) {
  await login(page, process.env.SALES_USER_EMAIL, process.env.SALES_USER_PASSWORD, '/dashboard');
}

/**
 * Login to a separate customer-facing portal.
 */
export async function loginAsCustomer(page, email, password) {
  await page.goto(PORTAL_URL);
  await page.waitForURL('**/Login**', { timeout: 30000 });
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).pressSequentially(email, { delay: 50 });
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).pressSequentially(password, { delay: 50 });
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForTimeout(10000);
}

/**
 * Verify user is logged in by confirming the URL is no longer the SSO login page.
 */
export async function verifyLoggedIn(page) {
  const url = page.url();
  expect(url).not.toContain(SSO_URL);
  expect(url).toContain(BASE_URL);
}

/**
 * Logout from the application via the profile menu.
 */
export async function logout(page) {
  const userButton = page.getByRole('button', { name: 'loading' }).first();
  await userButton.waitFor({ state: 'visible', timeout: 30000 });
  await userButton.click();
  await page.waitForTimeout(1000);

  const logoutButton = page.getByRole('menuitem', { name: 'Logout' }).first();
  if (await logoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await logoutButton.click();
  } else {
    await page.locator('text=Logout').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('text=Logout').first().click();
  }

  await page.waitForURL('**/Login**', { timeout: 30000 });
}

/**
 * Check if a login error message is visible on the SSO login page.
 */
export async function getLoginError(page) {
  const errorLocator = page.locator('text=Invalid Email or Password');
  if (await errorLocator.isVisible({ timeout: 5000 }).catch(() => false)) {
    return await errorLocator.textContent();
  }
  return null;
}

export { BASE_URL, SSO_URL, PORTAL_URL };
