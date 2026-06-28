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
    await page.waitForTimeout(5000);
    await page.getByText('All Quotes', { exact: true }).click();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');
    const search = page.locator('input[placeholder*="Quote ID / Company Name / Sales Person Name / Email / Project Name"]').first();
    await search.fill('2026042300004');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);
    await page.locator('.ag-center-cols-container .ag-row').first().click();
    await page.waitForURL(/quote_for_parts|all_quotes|repair_quotes|system_quotes/, { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    const buttons = page.locator('div', { hasText: /^Create Sales Order$/ });
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const visible = await btn.isVisible();
      console.log('button', i, 'visible', visible);
      if (visible) {
        console.log('trying click index', i);
        await btn.click();
        await page.waitForTimeout(3000);
        const po = await page.locator('input[placeholder="Enter PO Number"]').count();
        console.log('after click, PO field count', po);
        if (po > 0) {
          console.log('success at index', i);
          break;
        }
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();