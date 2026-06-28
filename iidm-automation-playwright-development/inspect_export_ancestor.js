const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
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

    // Search 'chump03'
    await page.getByRole('textbox', { name: 'Name / Company Name / Account' }).fill('chump03');
    await page.getByRole('textbox', { name: 'Name / Company Name / Account' }).press('Enter');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);

    // Check all div.save-view.Export-Image elements and their parents
    const divExports = page.locator('div.save-view.Export-Image');
    const count = await divExports.count();
    console.log('div.save-view.Export-Image count:', count);

    for (let i = 0; i < count; i++) {
      const el = divExports.nth(i);
      const bbox = await el.boundingBox();
      const isVisible = await el.isVisible();
      const ownHtml = await el.evaluate(n => n.outerHTML.slice(0, 200));

      // Check ancestors for <a> tags
      const parentInfo = await el.evaluate(n => {
        const ancestors = [];
        let cur = n.parentElement;
        for (let j = 0; j < 5; j++) {
          if (!cur) break;
          ancestors.push({ tag: cur.tagName, class: cur.className.slice(0, 80), href: cur.getAttribute('href') });
          cur = cur.parentElement;
        }
        return ancestors;
      });

      console.log(`\ndiv.save-view.Export-Image[${i}]:`);
      console.log(`  visible=${isVisible} bbox=${JSON.stringify(bbox)}`);
      console.log(`  html=${ownHtml}`);
      console.log(`  parents:`, JSON.stringify(parentInfo, null, 2));
    }

  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await browser.close();
  }
})();
