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

  // Search for CHUMP quotes and open the first one (OPEN status)
  const searchInput = page.getByRole('textbox', { name: /Quote ID/i });
  await searchInput.fill('CHUMP');
  await searchInput.press('Enter');
  await page.waitForTimeout(5000);

  // Click first row (Open quote)
  await page.locator('.ag-center-cols-container .ag-row[row-index="0"]').click({ force: true });
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle').catch(() => {});

  console.log('=== ON QUOTE DETAIL PAGE ===');
  console.log('URL:', page.url());

  // Scroll to Quote Items section
  await page.evaluate(() => {
    const el = document.querySelector('h4');
    const items = [...document.querySelectorAll('h4')].find(h => h.textContent.includes('Quote Items'));
    if (items) items.scrollIntoView();
  });
  await page.waitForTimeout(2000);

  // Click "Add Items" button
  console.log('=== CLICKING ADD ITEMS ===');
  const addItemsBtn = page.getByText('Add Items', { exact: true });
  console.log('Add Items visible:', await addItemsBtn.isVisible());
  await addItemsBtn.click();
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle').catch(() => {});

  console.log('=== AFTER ADD ITEMS CLICK ===');
  console.log('URL:', page.url());
  await page.screenshot({ path: 'test-results/inspect-add-items-page.png', fullPage: true });

  // Capture page structure
  const headings = await page.locator('h1:visible, h2:visible, h3:visible, h4:visible, h5:visible').allTextContents();
  console.log('Headings:', JSON.stringify(headings));

  const buttons = await page.locator('button:visible').allTextContents();
  console.log('Buttons:', JSON.stringify(buttons));

  const inputs = await page.locator('input:visible').evaluateAll(els =>
    els.map(e => ({ type: e.type, placeholder: e.placeholder, id: e.id, name: e.name, cls: e.className.substring(0, 80) }))
  );
  console.log('Inputs:', JSON.stringify(inputs, null, 2));

  // Look for search box for items
  const searchBoxes = await page.locator('input[placeholder*="earch" i], input[placeholder*="art" i], input[placeholder*="tem" i]').evaluateAll(els =>
    els.map(e => ({ placeholder: e.placeholder, visible: e.offsetParent !== null, id: e.id }))
  );
  console.log('Search-like inputs:', JSON.stringify(searchBoxes, null, 2));

  // Check for AG Grid (items table)
  const gridRows = await page.locator('.ag-body-viewport .ag-row').count();
  console.log('Grid rows:', gridRows);

  // Check for checkboxes
  const checkboxes = await page.locator('input[type="checkbox"]:visible').count();
  console.log('Visible checkboxes:', checkboxes);

  // Search in the 2nd input — "Search By Part Number" (first is company search #async-select-example)
  const itemSearch = page.getByPlaceholder('Search By Part Number');
  if (await itemSearch.count() > 0) {
    const placeholder = await itemSearch.getAttribute('placeholder') || '';
    console.log('Correct input placeholder:', placeholder);
    
    // Type the part number
    await itemSearch.fill('231-642');
    await page.waitForTimeout(3000);
    
    // Press Enter to search
    await itemSearch.press('Enter');
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: 'test-results/inspect-item-search-result.png', fullPage: true });

    // Check grid rows after search (AG Grid)
    const rowsAfter = await page.locator('.ag-body-viewport .ag-row').count();
    console.log('Grid rows after search:', rowsAfter);

    // Check checkboxes after search (could be plain table)
    const cbAfter = await page.locator('input[type="checkbox"]:visible').count();
    console.log('Checkboxes after search:', cbAfter);

    // Capture ALL visible checkboxes info
    const allCbs = await page.locator('input[type="checkbox"]:visible').evaluateAll(els =>
      els.map(e => ({
        id: e.id,
        name: e.name,
        cls: e.className.substring(0, 80),
        parentText: e.closest('tr, li, div')?.textContent?.substring(0, 80) || ''
      }))
    );
    console.log('All checkboxes detail:', JSON.stringify(allCbs, null, 2));

    // Capture the table structure
    const tableRows = await page.locator('tr:visible').count();
    console.log('Table rows visible:', tableRows);
    const firstTrText = await page.locator('tr:visible').nth(1).textContent().catch(() => '');
    console.log('First data row text:', firstTrText.substring(0, 150));

    // buttons after search
    const btnsAfterSearch = await page.locator('button:visible').allTextContents();
    console.log('Buttons after search:', JSON.stringify(btnsAfterSearch));

    // === CLICK FIRST ITEM CHECKBOX ===
    if (cbAfter > 0) {
      console.log('=== CLICKING FIRST ITEM CHECKBOX ===');
      // Skip the header checkbox (index 0) if it exists, click first data row checkbox
      const firstDataCb = page.locator('input[type="checkbox"]:visible').nth(1);
      const firstDataCbCount = await firstDataCb.count();
      console.log('Second checkbox (first data row) found:', firstDataCbCount);
      
      if (firstDataCbCount > 0) {
        await firstDataCb.click({ force: true });
      } else {
        // fallback: click very first checkbox
        await page.locator('input[type="checkbox"]:visible').first().click({ force: true });
      }
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/inspect-checkbox-clicked.png', fullPage: true });

      // Check what buttons appear after selecting
      const btnsAfterCb = await page.locator('button:visible').allTextContents();
      console.log('Buttons after checkbox click:', JSON.stringify(btnsAfterCb));

      // Look for "Add Selected Items" button
      const addSelectedCount = await page.getByText(/add selected/i).count();
      console.log('Add Selected Items button count:', addSelectedCount);
      const addSelectedTexts = await page.locator('button:visible, [role="button"]:visible').allTextContents();
      console.log('All clickable buttons:', JSON.stringify(addSelectedTexts));

      // Click "Add Selected Items"
      const addSelectedBtn = page.getByRole('button', { name: /add selected/i })
        .or(page.getByText(/add selected items/i))
        .or(page.locator('button').filter({ hasText: /add selected/i })).first();
      const addSelExists = await addSelectedBtn.count();
      console.log('Add Selected button found:', addSelExists);
      
      if (addSelExists > 0) {
        await addSelectedBtn.click();
        await page.waitForTimeout(5000);
        await page.waitForLoadState('networkidle').catch(() => {});
        console.log('=== AFTER ADD SELECTED ITEMS ===');
        console.log('URL:', page.url());
        await page.screenshot({ path: 'test-results/inspect-after-add-selected.png', fullPage: true });
        const headingsAfter = await page.locator('h1:visible, h2:visible, h3:visible, h4:visible, h5:visible').allTextContents();
        console.log('Headings after:', JSON.stringify(headingsAfter));
      }
    }
  }

  await page.waitForTimeout(2000);
  await browser.close();
})();
