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

    await page.goto('https://www.staging-buzzworld-v1.iidm.com/organizations', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Search for 'chump03'
    const searchInput = page.getByRole('textbox', { name: 'Name / Company Name / Account' });
    const searchExists = await searchInput.count();
    console.log('searchInput count:', searchExists);
    if (searchExists) {
      await searchInput.fill('chump03');
      await searchInput.press('Enter');
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(3000);
    }

    // Find ALL divs with "Export" text and log their details
    const exportDivs = page.locator('div').filter({ hasText: /^Export$/ });
    const exportDivCount = await exportDivs.count();
    console.log('Export div count:', exportDivCount);
    for (let i = 0; i < exportDivCount; i++) {
      const el = exportDivs.nth(i);
      const bbox = await el.boundingBox();
      const isVisible = await el.isVisible();
      const tagName = await el.evaluate(n => n.tagName);
      const className = await el.evaluate(n => n.className);
      const outerHTML = await el.evaluate(n => n.outerHTML.slice(0, 200));
      console.log(`Export[${i}]: tag=${tagName} visible=${isVisible} bbox=${JSON.stringify(bbox)} class="${className}" html="${outerHTML}"`);
    }

    // Also check for button with name Export
    const exportButtons = page.getByRole('button', { name: 'Export' });
    const btnCount = await exportButtons.count();
    console.log('Export button count (getByRole button):', btnCount);
    for (let i = 0; i < btnCount; i++) {
      const el = exportButtons.nth(i);
      const bbox = await el.boundingBox();
      const isVisible = await el.isVisible();
      console.log(`ExportBtn[${i}]: visible=${isVisible} bbox=${JSON.stringify(bbox)}`);
    }

    // Check for any element with aria-label Export
    const ariaExport = page.locator('[aria-label="Export"]');
    console.log('aria-label Export count:', await ariaExport.count());

    // Log page URL at the end
    console.log('Current URL:', page.url());

    await page.screenshot({ path: 'inspect_orgs_export.png', fullPage: false });
    console.log('Screenshot saved: inspect_orgs_export.png');

  } catch (err) {
    console.error('ERROR:', err.message);
    console.log('URL at error:', page.url());
    await page.screenshot({ path: 'inspect_orgs_export_error.png', fullPage: false }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
