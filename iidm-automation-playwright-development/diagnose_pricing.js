const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  try {
    await page.goto('https://staging-sso-v1.iidm.com/Login', { waitUntil: 'networkidle', timeout: 60000 });
    await page.fill('#username', 'defaultuser@enterpi.com');
    await page.fill('#password', 'Enspirit@625');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/quote_for_parts', { timeout: 120000 });
    await page.goto('https://www.staging-buzzworld-v1.iidm.com/pricing', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(8000);
    console.log('page ready', page.url());
    const selector = '.new-global-search > div:nth-child(3)';
    const count = await page.locator(selector).count();
    console.log('search helper count', count);
    const stockSearch = page.locator('input[placeholder*="Stock Code / Description"], input[aria-label*="Stock Code / Description"], input[name*="stock"]');
    console.log('stockSearch count', await stockSearch.count());
    if (await stockSearch.count()) {
      await stockSearch.first().click();
      await stockSearch.first().fill('2000-115');
      await stockSearch.first().press('Enter');
      await page.waitForTimeout(5000);
      console.log('value after type:', await stockSearch.first().inputValue());
      const rowTextCount = await page.locator('text=2000-115').count();
      console.log('text count after search', rowTextCount);
      const firstRow = await page.locator('.ag-center-cols-container .ag-row:not(.ag-row-loading)').first().innerText().catch(() => null);
      console.log('first row innerText', firstRow);
      const gridcellCount = await page.locator('role=gridcell[name="2000-115"]').count();
      console.log('gridcell count', gridcellCount);
    }
  } catch (e) { console.error(e); }
  await browser.close();
})();
