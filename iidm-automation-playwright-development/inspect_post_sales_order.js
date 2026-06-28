/**
 * INSPECTION: What happens on the page immediately after a Sales Order is created?
 * Logs: current URL, all visible links, URL pattern after Create click.
 *
 * Uses an EXISTING repair request that is already in "Won" state so we don't have
 * to re-run the entire flow. If none is found in Won state we just log what we find.
 *
 * Run: node inspect_post_sales_order.js
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      console.log('[NAV]', frame.url());
    }
  });

  try {
    // ── LOGIN ────────────────────────────────────────────────────────────────
    await page.goto('https://www.staging-buzzworld-v1.iidm.com/quote_for_parts');
    await page.waitForURL('**/Login**', { timeout: 30000 });
    await page.getByRole('textbox', { name: 'Email' }).pressSequentially('defaultuser@enterpi.com', { delay: 50 });
    await page.getByRole('textbox', { name: 'Password' }).pressSequentially('Enspirit@625', { delay: 50 });
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.waitForURL('**/quote_for_parts**', { timeout: 60000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    console.log('[OK] Logged in. URL:', page.url());

    // ── OPEN REPAIRS ─────────────────────────────────────────────────────────
    await page.getByText('Repairs').click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);
    console.log('[OK] On Repairs page. URL:', page.url());

    // ── LOOK FOR A REPAIR IN WON STATE ───────────────────────────────────────
    // Try to find a row that contains "Won" to avoid re-running full flow
    const rows = page.locator('.ag-center-cols-container .ag-row');
    const rowCount = await rows.count();
    console.log('[INFO] Repair rows visible:', rowCount);

    let foundWon = false;
    for (let i = 0; i < Math.min(rowCount, 10); i++) {
      const text = await rows.nth(i).textContent().catch(() => '');
      console.log(`  Row ${i}: ${text?.substring(0, 120)}`);
      if (text?.includes('Won') || text?.includes('Sales Order')) {
        console.log(`  -> Row ${i} has Won/Sales Order status, clicking...`);
        await rows.nth(i).click();
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(3000);
        foundWon = true;
        break;
      }
    }

    if (!foundWon) {
      console.log('[INFO] No Won row found in first 10 rows. Opening first repair.');
      await rows.first().click();
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(3000);
    }

    const repairPageUrl = page.url();
    console.log('[INFO] Repair page URL:', repairPageUrl);

    // ── LOG ALL LINKS ON CURRENT PAGE ────────────────────────────────────────
    const allLinks = await page.locator('a[href]').evaluateAll(els =>
      els.map(e => ({ text: e.textContent?.trim().substring(0, 60), href: e.getAttribute('href') }))
        .filter(l => l.text && l.text.length > 0)
    );
    console.log('[INFO] Links on repair page:');
    allLinks.forEach((l, i) => console.log(`  [${i}] "${l.text}" -> ${l.href}`));

    // ── CHECK IF CREATE SALES ORDER IS VISIBLE ───────────────────────────────
    const csoBtn = page.locator('div').filter({ hasText: /^Create Sales Order$/ }).nth(2);
    const csoVisible = await csoBtn.isVisible().catch(() => false);
    console.log('[INFO] "Create Sales Order" button visible:', csoVisible);

    if (csoVisible) {
      console.log('[ACTION] Clicking Create Sales Order...');
      await csoBtn.click();
      await page.waitForTimeout(2000);

      // Fill PO Number
      const poField = page.getByRole('textbox', { name: 'Enter PO Number' });
      if (await poField.isVisible({ timeout: 5000 }).catch(() => false)) {
        await poField.fill('INSPECT123');
        await page.waitForTimeout(1500);

        // Select FOB
        const fobControl = page.locator('div').filter({ hasText: /^Select FOB Point$/ }).nth(2);
        if (await fobControl.isVisible().catch(() => false)) {
          await fobControl.click();
          await page.waitForTimeout(1000);
          const ddpOption = page.getByText('DDP', { exact: true });
          if (await ddpOption.isVisible({ timeout: 5000 }).catch(() => false)) {
            await ddpOption.click();
          } else {
            // Pick first available option
            const firstOpt = page.locator('[class*="react-select__option"]').first();
            if (await firstOpt.isVisible().catch(() => false)) await firstOpt.click();
          }
        }
        await page.waitForTimeout(1000);

        // ── CLICK CREATE ─────────────────────────────────────────────────────
        console.log('[ACTION] Clicking Create (last) button for Sales Order...');
        const urlBefore = page.url();
        console.log('[INFO] URL BEFORE Create click:', urlBefore);

        await page.getByRole('button', { name: 'Create' }).last().click();
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(4000);

        const urlAfter = page.url();
        console.log('[INFO] URL AFTER Create click:', urlAfter);
        console.log('[INFO] URL changed?', urlBefore !== urlAfter);

        // ── LOG PAGE AFTER CREATION ───────────────────────────────────────────
        const pageTitle = await page.title();
        console.log('[INFO] Page title after creation:', pageTitle);

        const linksAfter = await page.locator('a[href]').evaluateAll(els =>
          els.map(e => ({ text: e.textContent?.trim().substring(0, 60), href: e.getAttribute('href') }))
            .filter(l => l.text && l.text.length > 0)
        );
        console.log('[INFO] Links AFTER sales order creation:');
        linksAfter.forEach((l, i) => console.log(`  [${i}] "${l.text}" -> ${l.href}`));

        // Specifically look for digit-only links (job/repair numbers)
        const digitLinks = linksAfter.filter(l => /^\d{5,8}$/.test(l.text || ''));
        console.log('[INFO] Digit-only links (job/repair candidates):');
        digitLinks.forEach((l, i) => console.log(`  [${i}] "${l.text}" -> ${l.href}`));

        // Check for "Jobs" or "Orders" or order number text on page
        const pageText = await page.locator('body').textContent().catch(() => '');
        const orderMatches = pageText?.match(/#\d{10,15}/g) || [];
        console.log('[INFO] Order/Quote number patterns on page:', orderMatches.slice(0, 10));

        // Check toast/notifications
        const toasts = await page.locator('[class*="toast"], [class*="notification"], [class*="alert"]').allTextContents().catch(() => []);
        console.log('[INFO] Toast/notification text:', toasts);

        await page.screenshot({ path: 'test-results/after_sales_order_created.png', fullPage: false });
        console.log('[INFO] Screenshot saved: test-results/after_sales_order_created.png');
      } else {
        console.log('[WARN] PO Number field not found after clicking Create Sales Order');
        await page.screenshot({ path: 'test-results/no_po_field.png' }).catch(() => {});
      }
    } else {
      console.log('[INFO] Create Sales Order not visible. Logging current page state.');
      // This repair might already have a sales order - log what links are visible
      const buttons = await page.locator('button:visible, [role="button"]:visible').allTextContents().catch(() => []);
      console.log('[INFO] Visible buttons:', buttons.slice(0, 20));
    }

    // ── NAVIGATE TO ORDERS AND LOG FIRST 3 ROWS ──────────────────────────────
    console.log('\n[ACTION] Navigating to Orders list...');
    await page.getByText('Orders', { exact: true }).first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);
    console.log('[INFO] Orders page URL:', page.url());

    const orderRows = page.locator('.ag-center-cols-container .ag-row');
    const orderRowCount = await orderRows.count();
    console.log('[INFO] Order rows visible:', orderRowCount);
    for (let i = 0; i < Math.min(orderRowCount, 3); i++) {
      const text = await orderRows.nth(i).textContent().catch(() => '');
      console.log(`  Order Row ${i}: ${text?.substring(0, 200)}`);
    }

    // Click first order row and log what's on the order detail page
    if (orderRowCount > 0) {
      await orderRows.first().click();
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(3000);
      console.log('[INFO] Order detail URL:', page.url());

      const orderDetailLinks = await page.locator('a[href]').evaluateAll(els =>
        els.map(e => ({ text: e.textContent?.trim().substring(0, 60), href: e.getAttribute('href') }))
          .filter(l => l.text && l.text.length > 0)
      );
      console.log('[INFO] Links on Order detail page:');
      orderDetailLinks.forEach((l, i) => console.log(`  [${i}] "${l.text}" -> ${l.href}`));

      const digitLinksOrder = orderDetailLinks.filter(l => /^\d{5,8}$/.test(l.text || ''));
      console.log('[INFO] Digit-only links on order detail (job/repair candidates):');
      digitLinksOrder.forEach((l, i) => console.log(`  [${i}] "${l.text}" -> ${l.href}`));
    }

    console.log('\n[DONE] Inspection complete. Check output above.');
    await page.waitForTimeout(5000);
  } catch (err) {
    console.error('[ERROR]', err.message);
    await page.screenshot({ path: 'test-results/inspect_error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
