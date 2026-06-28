import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('https://staging-sso-v1.iidm.com/Login');
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).pressSequentially('defaultuser@enterpi.com', { delay: 50 });
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).pressSequentially('Enspirit@625', { delay: 50 });
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  await page.goto('https://www.sta teging-buzzworld-v1.iidm.com/quote_for_parts', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'debug-after-nav.png', fullPage: true });

  await page.getByText('Parts Purchase').waitFor({ state: 'visible', timeout: 60000 });
  await page.getByText('Parts Purchase').click();
  await page.waitForLoadState('networkidle');

  await page.getByText('Inventory').waitFor({ state: 'visible', timeout: 30000 });
  await page.getByText('Inventory').click();
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'loading' }).waitFor({ state: 'visible', timeout: 30000 });
  await page.getByRole('button', { name: 'loading' }).click();
  await page.getByRole('menuitem', { name: 'Logout' }).click();
});