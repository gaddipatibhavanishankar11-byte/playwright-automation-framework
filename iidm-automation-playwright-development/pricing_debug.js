const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  try {
    await page.goto('https://staging-sso-v1.iidm.com/Login', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
    await page.fill('#username', 'defaultuser@enterpi.com');
    await page.fill('#password', 'Enspirit@625');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/quote_for_parts', { timeout: 120000 });
    await page.goto('https://www.staging-buzzworld-v1.iidm.com/pricing', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
    await page.waitForTimeout(8000);
    console.log('page ready', page.url());
    const stockSearch = page.locator(
      'input[placeholder*="Stock Code / Description"], input[aria-label*="Stock Code / Description"], input[name*="stock"], input[id*="stock"]'
    );
    console.log('stockSearch count', await stockSearch.count());
    if (await stockSearch.count()) {
      await stockSearch.first().click();
      await stockSearch.first().fill('2000-115');
      await stockSearch.first().press('Enter');
      await page.waitForTimeout(6000);
      console.log('stock value', await stockSearch.first().inputValue());
      const rowTextCount = await page.locator('text=2000-115').count();
      console.log('text count after search', rowTextCount);
      const gridRowCount = await page.locator('.ag-center-cols-container .ag-row:not(.ag-row-loading)').count();
      console.log('grid row count', gridRowCount);
      for (let i = 0; i < Math.min(5, gridRowCount); i++) {
        console.log('row', i, await page.locator('.ag-center-cols-container .ag-row:not(.ag-row-loading)').nth(i).innerText());
      }
    }
  } catch (e) {
    console.error(e);
  }
  await browser.close();
})();
