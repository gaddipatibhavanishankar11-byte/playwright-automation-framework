const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.staging-buzzworld-v1.iidm.com/quote_for_parts');
    await page.waitForURL('**/Login**', { timeout: 30000 });
    await page.getByRole('textbox', { name: 'Email' }).fill('defaultuser@enterpi.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('Enspirit@625');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.waitForURL('**/quote_for_parts**', { timeout: 60000 });
    await page.waitForLoadState('networkidle');

    const search = page.locator('input[placeholder*="Quote ID"], input[placeholder*="Company Name"], input[placeholder*="Sales Person"]').first();
    await search.fill('2026042300004');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);

    console.log('URL:', page.url());
    const rows = await page.locator('.ag-center-cols-container .ag-row').count();
    console.log('Rows:', rows);
    if (rows > 0) {
      await page.locator('.ag-center-cols-container .ag-row').first().click();
      await page.waitForURL(/quote_for_parts|all_quotes|repair_quotes|system_quotes/, { timeout: 30000 });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(5000);
    }

    const buttons = page.locator('div', { hasText: /^Create Sales Order$/ });
    console.log('Create Sales Order count:', await buttons.count());
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const handle = buttons.nth(i);
      const text = await handle.textContent();
      const visible = await handle.isVisible();
      const box = await handle.boundingBox();
      console.log('button', i, { text, visible, box });
    }

    const idx = 2;
    const nthbtn = buttons.nth(idx);
    console.log('nth(2) count:', await nthbtn.count());
    if (await nthbtn.count()) {
      console.log('nth(2) visible', await nthbtn.isVisible());
      console.log('nth(2) text', await nthbtn.textContent());
      const box = await nthbtn.boundingBox();
      console.log('nth(2) box', box);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();