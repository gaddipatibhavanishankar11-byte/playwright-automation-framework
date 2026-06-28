/**
 * Inspect: Orders list and order-detail page link structure
 * Run: node inspect_orders_nav.js
 */
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('framenavigated', f => { if (f === page.mainFrame()) console.log('[NAV]', f.url()); });
  try {
    // Login
    await page.goto('https://www.staging-buzzworld-v1.iidm.com/quote_for_parts');
    await page.waitForURL('**/Login**', { timeout: 30000 });
    await page.getByRole('textbox', { name: 'Email' }).pressSequentially('defaultuser@enterpi.com', { delay: 50 });
    await page.getByRole('textbox', { name: 'Password' }).pressSequentially('Enspirit@625', { delay: 50 });
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.waitForURL('**/quote_for_parts**', { timeout: 60000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    console.log('[OK] Logged in');

    // Go to Orders
    await page.getByText('Orders', { exact: true }).first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(5000);
    console.log('[INFO] Orders URL:', page.url());

    // Wait for rows with retries.  
    let rowCount = 0;
    for (let i = 0; i < 15; i++) {
      rowCount = await page.locator('.ag-center-cols-container .ag-row').count();
      if (rowCount > 0) break;
      await page.waitForTimeout(1000);
    }
    console.log('[INFO] Order rows found:', rowCount);

    // Print first 5 row texts + row-index attributes
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = page.locator('.ag-center-cols-container .ag-row').nth(i);
      const text = await row.textContent().catch(() => '?');
      const rowIdx = await row.getAttribute('row-index').catch(() => '?');
      console.log(`  Row ${i} [row-index=${rowIdx}]: ${text.substring(0, 150).trim()}`);
    }

    // Click first row
    if (rowCount > 0) {
      await page.locator('.ag-center-cols-container .ag-row').first().click();
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(4000);
      const orderDetailUrl = page.url();
      console.log('[INFO] Order detail URL:', orderDetailUrl);

      // All links
      const links = await page.locator('a[href]').evaluateAll(els =>
        els.map(e => ({ text: e.textContent.trim(), href: e.getAttribute('href') })).filter(l => l.text.length > 0)
      );
      console.log('[INFO] All links on order detail:', JSON.stringify(links, null, 2));

      // Digit-only links (potential job/repair IDs)
      const digitLinks = links.filter(l => /^\d{4,8}$/.test(l.text));
      console.log('[INFO] Digit-only links:', JSON.stringify(digitLinks));

      // All visible text on page (first 500 chars)
      const bodyText = await page.locator('body').textContent();
      console.log('[INFO] Page text (first 600 chars):', bodyText.replace(/\s+/g, ' ').substring(0, 600));
    }

  } catch (e) {
    console.error('[ERROR]', e.message);
  } finally {
    await browser.close();
  }
})();
