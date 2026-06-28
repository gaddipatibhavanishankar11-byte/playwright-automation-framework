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
  await page.waitForTimeout(5000);

  // Search for "CHUMP" to find quotes with OPEN status
  console.log('=== FINDING AN OPEN QUOTE ===');
  const searchInput = page.getByRole('textbox', { name: /Quote ID/i });
  await searchInput.fill('CHUMP');
  await searchInput.press('Enter');
  await page.waitForTimeout(5000);

  // Look at statuses in the grid
  const statuses = await page.locator('.ag-center-cols-container .ag-row').evaluateAll(rows => {
    return rows.slice(0, 5).map(r => ({
      text: r.textContent.substring(0, 150),
      rowIndex: r.getAttribute('row-index')
    }));
  });
  console.log('First 5 rows:', JSON.stringify(statuses, null, 2));
  await page.screenshot({ path: 'test-results/inspect-quote-list.png', fullPage: true });

  // Click the first row to open a quote
  await page.locator('.ag-center-cols-container .ag-row[row-index="0"]').click({ force: true });
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle').catch(() => {});

  console.log('=== QUOTE DETAIL PAGE ===');
  console.log('URL:', page.url());

  // Check status
  const status = await page.getByText('OPEN').count();
  console.log('OPEN status visible:', status);

  // Look for Import Items link
  const importItems = await page.getByText('Import Items').count();
  console.log('Import Items visible:', importItems);

  // Scroll down to find Quote Items section
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(2000);

  // Find "Quote Items" heading
  const quoteItemsHeading = await page.getByText(/Quote Items/i).allTextContents();
  console.log('Quote Items heading:', JSON.stringify(quoteItemsHeading));

  await page.screenshot({ path: 'test-results/inspect-quote-detail-scroll.png', fullPage: true });

  // Look for "Add Items" button or link  
  const addItemsText = await page.getByText(/Add Item/i).allTextContents();
  console.log('Add Item texts:', JSON.stringify(addItemsText));

  // Find all buttons/clickable elements near "Quote Items"
  const allBtns = await page.locator('button:visible').allTextContents();
  console.log('All buttons:', JSON.stringify(allBtns));

  // Find all svg icons or action icons that might be "add"
  const icons = await page.locator('[class*="icon"], [class*="Icon"], svg').evaluateAll(els => 
    els.filter(e => e.offsetParent !== null).length
  );
  console.log('Visible icon elements:', icons);

  // Look for any "add" related elements
  const addEls = await page.locator('[class*="add"], [class*="Add"], [title*="add"], [title*="Add"]').evaluateAll(els =>
    els.filter(e => e.offsetParent !== null).map(e => ({
      tag: e.tagName,
      cls: e.className?.substring?.(0, 80) || '',
      text: e.textContent?.substring(0, 50) || '',
      title: e.title || ''
    }))
  );
  console.log('Add-related elements:', JSON.stringify(addEls, null, 2));

  // Scroll down more to see Quote Items table
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/inspect-quote-detail-bottom.png', fullPage: true });

  // Check for expand/collapse or clickable headers
  const quoteSections = await page.locator('h3, h4, h5').allTextContents();
  console.log('Section headings:', JSON.stringify(quoteSections));

  // Look for any items grid inside the detail
  const itemGrid = await page.locator('.ag-body-viewport').count();
  console.log('AG Grid viewports:', itemGrid);

  // Look for + or add icons near Quote Items
  const quoteItemsSection = page.locator('text=Quote Items').locator('..');
  const sectionHTML = await quoteItemsSection.innerHTML().catch(() => 'not found');
  console.log('Quote Items section HTML (first 500):', sectionHTML.substring(0, 500));

  // Try clicking on "Quote Items" heading to see if it reveals add button
  const quoteItemsEl = page.getByText(/Quote Items \(\d+\)/).first();
  const qiExists = await quoteItemsEl.count();
  console.log('Quote Items with count:', qiExists);

  // Look for any link styled as icon near it
  const nearbyLinks = await page.locator('a:visible').evaluateAll(els =>
    els.map(e => ({
      text: e.textContent?.substring(0, 50) || '',
      href: e.href || '',
      cls: e.className?.substring?.(0, 60) || ''
    })).filter(e => e.text || e.href)
  );
  console.log('All visible links:', JSON.stringify(nearbyLinks.slice(0, 15), null, 2));

  // Look for Import Items - this might be the "Add Items" feature
  const importBtn = page.getByText('Import Items');
  if (await importBtn.count() > 0) {
    console.log('=== CLICKING IMPORT ITEMS ===');
    await importBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/inspect-import-items.png', fullPage: true });

    // Capture the import modal/page
    const dialogContent = await page.locator('[role="dialog"], .modal, .ant-modal').first().textContent().catch(() => 'no dialog');
    console.log('Dialog text:', dialogContent.substring(0, 500));

    const inputs = await page.locator('input:visible').evaluateAll(els =>
      els.map(e => ({ type: e.type, placeholder: e.placeholder, id: e.id, name: e.name }))
    );
    console.log('Inputs after import click:', JSON.stringify(inputs, null, 2));

    const btns = await page.locator('button:visible').allTextContents();
    console.log('Buttons after import click:', JSON.stringify(btns));

    // Look for search input for items
    const searchInputs = await page.locator('input[placeholder*="search" i], input[placeholder*="Search" i], input[placeholder*="item" i], input[placeholder*="part" i]').evaluateAll(els =>
      els.map(e => ({ placeholder: e.placeholder, visible: e.offsetParent !== null }))
    );
    console.log('Search inputs:', JSON.stringify(searchInputs));
    
    // Check for checkboxes
    const checkboxes = await page.locator('input[type="checkbox"]:visible').count();
    console.log('Visible checkboxes:', checkboxes);

    // Look for "Add Selected" buttons
    const addSelectedBtns = await page.getByText(/add selected/i).count();
    console.log('Add Selected buttons:', addSelectedBtns);
  }

  await page.waitForTimeout(2000);
  await browser.close();
})();
