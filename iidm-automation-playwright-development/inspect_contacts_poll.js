const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
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

    // === Orgs flow ===
    await page.goto('https://www.staging-buzzworld-v1.iidm.com/organizations', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    const si = page.getByRole('textbox', { name: 'Name / Company Name / Account' });
    await si.fill('chump03');
    await si.press('Enter');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);

    // Export orgs
    const exportOrgs = page.locator('div').filter({ hasText: /^Export$/ }).first();
    let dl1 = null;
    page.once('download', dl => { dl1 = dl; console.log('Orgs download:', dl.suggestedFilename()); });
    await exportOrgs.click();
    await page.waitForTimeout(3000);
    console.log('Orgs download received:', dl1 !== null);

    // Filters → InActive → Apply → Clear
    await page.locator('div').filter({ hasText: /^Filters$/ }).nth(1).click();
    await page.waitForTimeout(2000);
    const fc = page.locator('div:nth-child(5) > .css-sjtnp2 > .pi-select-wrapper > .css-5a7vsu-container > .drop-height-80px.multi-select.react-select__control > .drop-height-80px.multi-select.react-select__value-container');
    await fc.click().catch(() => {});
    await page.waitForTimeout(1000);
    await page.getByText('InActive', { exact: true }).click().catch(() => console.log('InActive failed'));
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Apply' }).click().catch(() => console.log('Apply failed'));
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);
    await page.getByText('Clear').click().catch(() => console.log('Clear failed'));
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    console.log('URL after filter Clear:', page.url());
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // === Navigate to Contacts (try menu nav) ===
    await page.getByRole('button', { name: 'Organizations' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('menuitem', { name: 'Contacts' }).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);
    console.log('URL on Contacts (menu nav):', page.url());

    // Poll for Export enabled state every second for up to 30 seconds
    for (let i = 0; i < 30; i++) {
      const hasDisable = await page.evaluate(() => {
        const btn = document.querySelector('.save-view.Export-Image');
        if (!btn) return 'NOT_FOUND';
        return btn.classList.contains('disable-btns') ? 'DISABLED' : 'ENABLED';
      });
      console.log(`t+${i}s: Export button state: ${hasDisable}`);
      if (hasDisable === 'ENABLED') break;
      await page.waitForTimeout(1000);
    }

    // Check row count on contacts
    const rows = await page.locator('.ag-center-cols-container .ag-row').count();
    console.log('Contacts rows (before search):', rows);

    // Search 'multi'
    const csi = page.getByRole('textbox', { name: 'Name / Company Name / Account' });
    if (await csi.count() > 0) {
      await csi.fill('multi');
      await csi.press('Enter');
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(3000);

      // Poll again after search
      for (let i = 0; i < 15; i++) {
        const hasDisable = await page.evaluate(() => {
          const btn = document.querySelector('.save-view.Export-Image');
          if (!btn) return 'NOT_FOUND';
          return btn.classList.contains('disable-btns') ? 'DISABLED' : 'ENABLED';
        });
        console.log(`search+${i}s: Export button state: ${hasDisable}`);
        if (hasDisable === 'ENABLED') break;
        await page.waitForTimeout(1000);
      }
    }

    await page.screenshot({ path: 'inspect_contacts_poll.png' });
    console.log('Screenshot saved');
  } catch (err) {
    console.error('ERROR:', err.message);
    await page.screenshot({ path: 'inspect_contacts_poll_err.png' }).catch(() => {});
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
})();
