const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
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

    // Navigate to Organizations then Contacts
    await page.getByRole('button', { name: 'Organizations' }).click();
    await page.getByRole('menuitem', { name: 'Contacts' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);

    console.log('URL on Contacts page:', page.url());

    // Find ALL divs with "Export" text
    const exportDivs = page.locator('div').filter({ hasText: /^Export$/ });
    const exportDivCount = await exportDivs.count();
    console.log('Export div count on Contacts:', exportDivCount);
    for (let i = 0; i < exportDivCount; i++) {
      const el = exportDivs.nth(i);
      const bbox = await el.boundingBox();
      const isVisible = await el.isVisible();
      const tagName = await el.evaluate(n => n.tagName);
      const className = await el.evaluate(n => n.className);
      console.log(`Export[${i}]: tag=${tagName} visible=${isVisible} bbox=${JSON.stringify(bbox)} class="${className}"`);
    }

    // Try searching for 'multi'
    const searchInput = page.getByRole('textbox', { name: 'Name / Company Name / Account' });
    const searchCount = await searchInput.count();
    console.log('Search input count on Contacts:', searchCount);

    if (searchCount) {
      await searchInput.fill('multi');
      await searchInput.press('Enter');
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(5000);

      console.log('URL after search:', page.url());
      const rowsAfter = await page.locator('.ag-center-cols-container .ag-row').count();
      console.log('Rows after search "multi":', rowsAfter);

      // Re-check Export divs after search
      const exportDivs2 = page.locator('div').filter({ hasText: /^Export$/ });
      const exportDiv2Count = await exportDivs2.count();
      console.log('Export div count after search:', exportDiv2Count);
      for (let i = 0; i < exportDiv2Count; i++) {
        const el = exportDivs2.nth(i);
        const bbox = await el.boundingBox();
        const isVisible = await el.isVisible();
        const className = await el.evaluate(n => n.className);
        console.log(`Export2[${i}]: visible=${isVisible} bbox=${JSON.stringify(bbox)} class="${className}"`);
      }

      await page.screenshot({ path: 'inspect_contacts_before_export.png', fullPage: false });

      // Click export and observe
      let downloadReceived = false;
      page.on('download', (dl) => {
        downloadReceived = true;
        console.log('Download received:', dl.suggestedFilename());
      });

      const exportBtn = page.locator('div').filter({ hasText: /^Export$/ }).first();
      await exportBtn.click();
      await page.waitForTimeout(5000);

      console.log('Download received after click:', downloadReceived);
      console.log('URL after export click:', page.url());
      await page.screenshot({ path: 'inspect_contacts_after_export.png', fullPage: false });
    }

  } catch (err) {
    console.error('ERROR:', err.message);
    console.log('URL at error:', page.url());
    await page.screenshot({ path: 'inspect_contacts_error.png', fullPage: false }).catch(() => {});
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
})();
