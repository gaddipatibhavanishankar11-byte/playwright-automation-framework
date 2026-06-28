// @ts-check
import { test, expect } from '@playwright/test';
import { login, loginAsDefault, loginAsSales, loginAsCustomer, logout, verifyLoggedIn, getLoginError, BASE_URL, SSO_URL, PORTAL_URL } from '../../helpers/auth.js';
import { users } from '../../fixtures/users.js';
import { getVisibleNavItems, isNavItemVisible, clickNavItem } from '../../helpers/navigation.js';

// All auth tests need generous timeout for SSO redirects
test.describe('Authentication & Permissions', () => {
  test.describe.configure({ timeout: 180000 });

  // AUTH-001: Successful SSO login with valid credentials @smoke
  test('AUTH-001: Successful SSO login with valid credentials', async ({ page }) => {
    // Go to app URL
    await page.goto(BASE_URL + '/quote_for_parts');

    // SSO redirect should happen
    await page.waitForURL('**/Login**', { timeout: 30000 });
    expect(page.url()).toContain('staging-sso-v1.iidm.com');

    // Enter credentials
    await page.getByRole('textbox', { name: 'Email' }).click();
    await page.getByRole('textbox', { name: 'Email' }).pressSequentially(users.default.email, { delay: 50 });
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).pressSequentially(users.default.password, { delay: 50 });
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    // Should redirect to quote_for_parts (default landing page)
    await page.waitForURL('**/quote_for_parts', { timeout: 60000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    // Verify: user is on the app, not SSO
    await verifyLoggedIn(page);
    expect(page.url()).toContain('/quote_for_parts');

    // Wait for quotes page data to fully load and display
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Click profile icon at top right corner
    const profileButton = page.getByRole('button', { name: 'loading' });
    await profileButton.waitFor({ state: 'visible', timeout: 30000 });
    await profileButton.click();
    await page.waitForTimeout(1000);

    // Click Logout from profile menu
    await page.getByRole('menuitem', { name: 'Logout' }).click();

    // Should redirect to SSO login page
    await page.waitForURL('**/Login**', { timeout: 30000 });
    expect(page.url()).toContain('Login');
  });

  // AUTH-002: Login with invalid credentials
  test('AUTH-002: Login with invalid credentials', async ({ page }) => {
    // Go to app URL → SSO redirect
    await page.goto(BASE_URL + '/quote_for_parts');
    await page.waitForURL('**/Login**', { timeout: 30000 });

    // Enter wrong password
    await page.getByRole('textbox', { name: 'Email' }).click();
    await page.getByRole('textbox', { name: 'Email' }).pressSequentially(users.default.email, { delay: 50 });
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).pressSequentially('WrongPassword123!', { delay: 50 });
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    // Error message should be shown
    await page.waitForTimeout(3000);
    const errorText = page.locator('text=Invalid Email or Password');
    await expect(errorText).toBeVisible({ timeout: 10000 });

    // Should NOT be redirected into the app
    expect(page.url()).toContain('staging-sso-v1.iidm.com');
    expect(page.url()).not.toContain('staging-buzzworld');
  });

  // AUTH-003: Session expiry / 401 handling
  test('AUTH-003: Session expiry handling', async ({ page }) => {
    // Login successfully
    await loginAsDefault(page);
    await verifyLoggedIn(page);

    // Wait for page to fully load before clearing session
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Clear all auth state — localStorage, sessionStorage, and cookies
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();
    await page.waitForTimeout(1000);

    // Reload the current page instead of navigating to a new URL
    // This avoids multiple page open/close cycles
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(10000);

    // Should be redirected to SSO login since session is expired
    const url = page.url();
    const redirectedToLogin = url.includes('Login') || url.includes('loading') || url.includes('sso');
    expect(redirectedToLogin).toBeTruthy();
  });

  // AUTH-004: Admin user sees admin menu items and can click Admin & Pricing tabs
  test('AUTH-004: Admin user sees admin menu items', async ({ page }) => {
    // Login as defaultuser (has admin access)
    await loginAsDefault(page);
    await page.waitForTimeout(5000);

    // Verify: Admin and Pricing menu items are visible
    const adminVisible = await isNavItemVisible(page, 'Admin');
    const pricingVisible = await isNavItemVisible(page, 'Pricing');
    expect(adminVisible).toBeTruthy();
    expect(pricingVisible).toBeTruthy();

    // Click Admin tab and verify it loads
    await page.getByText('Admin').first().click();
    await page.waitForTimeout(3000);
    const adminUrl = page.url();
    const onAdminPage = adminUrl.includes('/admin') || adminUrl.includes('/account-type');
    expect(onAdminPage).toBeTruthy();

    // Click Pricing dropdown to open submenu, then click a submenu item
    await page.getByText('Pricing').first().click();
    await page.waitForTimeout(1000);
    // Click "Discount Codes" submenu item to navigate
    await page.getByText('Discount Codes').click();
    await page.waitForTimeout(3000);
    const pricingUrl = page.url();
    const onPricingPage = pricingUrl.includes('/pricing') || pricingUrl.includes('/discount');
    expect(onPricingPage).toBeTruthy();
  });

  // AUTH-005: Sales user sees sales menu items (separate sales credentials)
  test('AUTH-005: Sales user sees sales menu items', async ({ page }) => {
    // Login as sales user: g.bhavanishankar@enspirit.co
    await loginAsSales(page);
    await page.waitForTimeout(8000);

    // Verify: Quotes, Repairs, Jobs visible in the navigation bar
    const quotesVisible = await isNavItemVisible(page, 'Quote');
    const repairsVisible = await isNavItemVisible(page, 'Repair');
    const jobsVisible = await isNavItemVisible(page, 'Job');
    expect(quotesVisible).toBeTruthy();
    expect(repairsVisible).toBeTruthy();
    expect(jobsVisible).toBeTruthy();
  });

  // AUTH-006: Customer portal user sees limited menu
  test('AUTH-006: Customer portal user sees limited menu', async ({ page }) => {
    // Login to customer portal: https://www.staging-portal-v1.iidm.com
    await loginAsCustomer(page, users.customer.email, users.customer.password);

    // Should NOT be on the SSO login page anymore
    const url = page.url();
    const loggedIn = !url.includes('/Login');
    expect(loggedIn).toBeTruthy();

    // Verify: Admin menu should NOT be visible on customer portal
    const adminVisible = await isNavItemVisible(page, 'Admin');
    expect(adminVisible).toBeFalsy();
  });

  // AUTH-007: Logout clears session
  test('AUTH-007: Logout clears session', async ({ page }) => {
    // Login and verify logged in
    await loginAsDefault(page);
    await verifyLoggedIn(page);

    // Wait for page to fully load before attempting logout
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Click profile icon at top right corner
    const profileButton = page.getByRole('button', { name: 'loading' });
    await profileButton.waitFor({ state: 'visible', timeout: 30000 });
    await profileButton.click();
    await page.waitForTimeout(1000);

    // Click Logout from profile menu
    await page.getByRole('menuitem', { name: 'Logout' }).click();

    // Should be redirected to SSO login page
    await page.waitForURL('**/Login**', { timeout: 30000 });
    expect(page.url()).toContain('Login');
    await page.waitForTimeout(3000);

    // Try navigating back to app — should redirect to login again (session is cleared)
    await page.goto(BASE_URL + '/quote_for_parts', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(8000);
    const url = page.url();
    const onLoginOrLoading = url.includes('Login') || url.includes('loading');
    expect(onLoginOrLoading).toBeTruthy();
  });

  // AUTH-008: Role-based landing page
  test('AUTH-008: Role-based landing page', async ({ page }) => {
    // Sales user login → lands on /quote_for_parts
    await loginAsDefault(page);

    // Wait for the quotes page to fully load and display
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    expect(page.url()).toContain('/quote_for_parts');
  });
});
