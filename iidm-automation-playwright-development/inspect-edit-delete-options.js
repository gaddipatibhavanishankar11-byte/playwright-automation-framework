const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();

  // Login
  await page.goto('https://www.staging-buzzworld-v1.iidm.com/quote_for_parts');
  await page.waitForURL('**/Login**', { timeout: 30000 });
  await page.getByRole('textbox', { name: 'Email' }).pressSequentially('defaultuser@enterpi.com', { delay: 50 });
  await page.getByRole('textbox', { name: 'Password' }).pressSequentially('Enspirit@625', { delay: 50 });
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL('**/quote_for_parts**', { timeout: 60000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Navigate to quote that already has an item (one we created earlier)
  // First search CHUMP to find a quote with items
  const searchInput = page.getByRole('textbox', { name: /Quote ID/i });
  await searchInput.fill('CHUMP');
  await searchInput.press('Enter');
  await page.waitForTimeout(4000);

  // Find a row where Items column > 0 — click it
  // Rows with items have "1" or more in the Items column
  // Try a few rows to find one with items
  let found = false;
  for (let idx = 0; idx < 5 && !found; idx++) {
    const rowText = await page.locator('.ag-center-cols-container .ag-row').nth(idx).textContent().catch(() => '');
    console.log(`Row ${idx} text:`, rowText.substring(0, 100));
    // Check if Items column shows > 0
    if (rowText.match(/\b[1-9]\d*\b/)) {
      await page.locator('.ag-center-cols-container .ag-row').nth(idx).click({ force: true });
      found = true;
    }
  }
  if (!found) {
    // Just click first row
    await page.locator('.ag-center-cols-container .ag-row[row-index="0"]').click({ force: true });
  }

  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle').catch(() => {});
  console.log('Quote detail URL:', page.url());

  // Scroll down to Quote Items section
  await page.evaluate(() => {
    const els = document.querySelectorAll('h4, h5, h3');
    for (const el of els) {
      if (el.textContent.includes('Quote Items')) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
    }
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/quote-detail-with-items.png', fullPage: true });

  const headings = await page.locator('h1, h2, h3, h4, h5').allTextContents();
  console.log('Headings:', JSON.stringify(headings));

  // Find all buttons in page
  const buttons = await page.locator('button:visible').allTextContents();
  console.log('All buttons:', JSON.stringify(buttons));

  // Find edit icons/buttons near Quote Items
  const editBtns = await page.locator('[class*="edit"], [class*="Edit"], [title*="edit" i], [aria-label*="edit" i]').evaluateAll(els =>
    els.filter(e => e.offsetParent).map(e => ({
      tag: e.tagName,
      cls: e.className?.substring?.(0, 80) || '',
      text: e.textContent?.substring(0, 40) || '',
      title: e.title || '',
      ariaLabel: e.getAttribute('aria-label') || ''
    }))
  );
  console.log('Edit-related elements:', JSON.stringify(editBtns, null, 2));

  // Find delete buttons
  const delBtns = await page.locator('[class*="delete"], [class*="Delete"], [title*="delete" i], [aria-label*="delete" i], [class*="trash"], [class*="remove"]').evaluateAll(els =>
    els.filter(e => e.offsetParent).map(e => ({
      tag: e.tagName,
      cls: e.className?.substring?.(0, 80) || '',
      text: e.textContent?.substring(0, 40) || '',
      title: e.title || '',
      ariaLabel: e.getAttribute('aria-label') || ''
    }))
  );
  console.log('Delete-related elements:', JSON.stringify(delBtns, null, 2));

  // Look for any anchor/icon elements in the item rows
  const itemRowArea = await page.locator('text=Quote Items').locator('..').locator('..').innerHTML().catch(() => '');
  console.log('Quote Items section HTML (first 2000):', itemRowArea.substring(0, 2000));

  // Check for tabs (Options tab)
  const tabs = await page.locator('[role="tab"], .tab-item, .nav-tabs a').allTextContents();
  console.log('Tabs:', JSON.stringify(tabs));

  // Check for links near items
  const allLinks = await page.locator('a:visible, [role="button"]:visible').evaluateAll(els =>
    els.map(e => ({
      text: e.textContent?.substring(0, 40) || '',
      cls: e.className?.substring?.(0, 80) || '',
      href: e.href || ''
    })).filter(e => e.text.trim())
  );
  console.log('All visible links/role-buttons (first 20):', JSON.stringify(allLinks.slice(0, 20), null, 2));

  // Check for action icons (SVG buttons) in item rows
  const svgBtns = await page.locator('svg').evaluateAll(els =>
    els.filter(e => e.offsetParent && e.closest('button, [role="button"], a')).map(e => {
      const parent = e.closest('button, [role="button"], a');
      return {
        parentTag: parent?.tagName,
        parentCls: parent?.className?.substring?.(0, 80) || '',
        parentText: parent?.textContent?.trim().substring(0, 30) || '',
        parentAriaLabel: parent?.getAttribute('aria-label') || '',
        parentTitle: parent?.title || ''
      };
    })
  );
  console.log('SVG buttons (first 15):', JSON.stringify(svgBtns.slice(0, 15), null, 2));

  // Check for "Options" link/button/tab
  const optionsEl = await page.getByText('Options', { exact: true }).count();
  console.log('Options element count:', optionsEl);
  if (optionsEl > 0) {
    const optionsTexts = await page.getByText('Options', { exact: true }).evaluateAll(els =>
      els.map(e => ({ tag: e.tagName, cls: e.className?.substring?.(0, 60) || '', parent: e.parentElement?.tagName || '' }))
    );
    console.log('Options elements:', JSON.stringify(optionsTexts, null, 2));
  }

  await page.waitForTimeout(2000);
  await browser.close();
})();
