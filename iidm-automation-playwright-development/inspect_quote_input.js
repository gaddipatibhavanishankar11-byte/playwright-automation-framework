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
    const inputs = await page.locator('input:visible').evaluateAll(els => els.map(e => ({ placeholder: e.placeholder, ariaLabel: e.getAttribute('aria-label'), name: e.name, id: e.id, className: e.className, value: e.value })));
    console.log('visible inputs', inputs);
    const search = page.locator('input').filter({ hasText: '' });
    console.log('search count', await search.count());
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();