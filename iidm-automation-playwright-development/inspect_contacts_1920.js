const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
  // Use 1920x1080 like the test config
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

    // Simulate the test's Organizations flow before Contacts
    await page.goto('https://www.staging-buzzworld-v1.iidm.com/organizations', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Search 'chump03'
    const searchInput = page.getByRole('textbox', { name: 'Name / Company Name / Account' });
    await searchInput.fill('chump03');
    await searchInput.press('Enter');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);

    // Do Organizations export (like the test)
    const exportBtn1 = page.locator('div').filter({ hasText: /^Export$/ }).first();
    console.log('Orgs export visible:', await exportBtn1.isVisible());
    page.once('download', (dl) => console.log('Orgs Download:', dl.suggestedFilename()));
    await exportBtn1.click();
    await page.waitForTimeout(3000);
    console.log('URL after orgs export:', page.url());

    // Open Filters
    await page.locator('div').filter({ hasText: /^Filters$/ }).nth(1).click();
    await page.waitForTimeout(2000);

    // Filter control - click the multi-select
    const filterControl = page.locator('div:nth-child(5) > .css-sjtnp2 > .pi-select-wrapper > .css-5a7vsu-container > .drop-height-80px.multi-select.react-select__control > .drop-height-80px.multi-select.react-select__value-container');
    await filterControl.click().catch(() => {
      console.log('Filter control click failed, trying alternative');
    });
    await page.waitForTimeout(1000);
    await page.getByText('InActive', { exact: true }).click().catch(() => console.log('InActive click failed'));
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Apply' }).click().catch(() => console.log('Apply click failed'));
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);
    await page.getByText('Clear').click().catch(() => console.log('Clear click failed'));
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Navigate directly to Contacts
    await page.goto('https://www.staging-buzzworld-v1.iidm.com/contacts', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    console.log('URL on Contacts:', page.url());

    // Find all Export divs at this viewport
    const exportDivs = page.locator('div').filter({ hasText: /^Export$/ });
    const count = await exportDivs.count();
    console.log('Export div count on Contacts (1920x1080):', count);
    for (let i = 0; i < count; i++) {
      const el = exportDivs.nth(i);
      const bbox = await el.boundingBox();
      const isVisible = await el.isVisible();
      const className = await el.evaluate(n => n.className);
      const html = await el.evaluate(n => n.outerHTML.slice(0, 300));
      console.log(`Export[${i}]: visible=${isVisible} bbox=${JSON.stringify(bbox)} class="${className}" html="${html}"`);
    }

    await page.screenshot({ path: 'inspect_contacts_1920.png', fullPage: false });

    // Search 'multi' on contacts
    const searchInput2 = page.getByRole('textbox', { name: 'Name / Company Name / Account' });
    await searchInput2.fill('multi');
    await searchInput2.press('Enter');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);

    console.log('URL after search:', page.url());

    // Find Export divs after search
    const exportDivs2 = page.locator('div').filter({ hasText: /^Export$/ });
    const count2 = await exportDivs2.count();
    console.log('Export div count after search (1920x1080):', count2);
    for (let i = 0; i < count2; i++) {
      const el = exportDivs2.nth(i);
      const bbox = await el.boundingBox();
      const isVisible = await el.isVisible();
      const className = await el.evaluate(n => n.className);
      console.log(`Export2[${i}]: visible=${isVisible} bbox=${JSON.stringify(bbox)} class="${className}"`);
    }

    await page.screenshot({ path: 'inspect_contacts_after_search_1920.png', fullPage: false });

    // Try clicking export and observe
    let dl3 = null;
    page.once('download', (dl) => {
      dl3 = dl;
      console.log('Contacts Download:', dl.suggestedFilename());
    });
    const exportBtn2 = page.locator('div').filter({ hasText: /^Export$/ }).first();
    await exportBtn2.click();
    await page.waitForTimeout(5000);
    console.log('Contacts download received:', dl3 !== null);
    console.log('URL after contacts export click:', page.url());

    await page.screenshot({ path: 'inspect_contacts_after_export_1920.png', fullPage: false });

  } catch (err) {
    console.error('ERROR:', err.message);
    console.log('URL at error:', page.url());
    await page.screenshot({ path: 'inspect_err_1920.png', fullPage: false }).catch(() => {});
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
})();
