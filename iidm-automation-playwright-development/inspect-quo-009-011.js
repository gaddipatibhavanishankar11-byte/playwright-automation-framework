const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 600 });
  const page = await browser.newPage();

  // Login and go to quotes
  await page.goto('https://www.staging-buzzworld-v1.iidm.com/quote_for_parts');
  await page.waitForURL('**/Login**', { timeout: 30000 });
  await page.getByRole('textbox', { name: 'Email' }).pressSequentially('defaultuser@enterpi.com', { delay: 50 });
  await page.getByRole('textbox', { name: 'Password' }).pressSequentially('Enspirit@625', { delay: 50 });
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL('**/quote_for_parts**', { timeout: 60000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(5000);

  // Open first row with items
  const rows = page.locator('.ag-center-cols-container .ag-row');
  let opened = false;
  for (let i = 0; i < 5; i++) {
    const txt = (await rows.nth(i).textContent().catch(() => '')) ?? '';
    if (/\b[1-9]\b/.test(txt)) {
      await rows.nth(i).click({ force: true });
      opened = true;
      break;
    }
  }
  if (!opened) await rows.nth(0).click({ force: true });
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle').catch(() => {});

  // Scroll to Quote Items
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('h4')].find(h => h.textContent.includes('Quote Items'));
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await page.waitForTimeout(2000);

  // ─── PART 1: INSPECT EDIT FORM ───────────────────────────────────────────
  console.log('\n=== PART 1: INSPECT EDIT FORM ===');

  // Select first item checkbox
  await page.locator('input.repair-item-checkbox').first().click({ force: true });
  await page.waitForTimeout(1000);

  // Click edit icon on the item row (pencil icon with role=button on item)
  // The edit icon on the item row is the small edit icon next to the delete icon
  const editIcons = page.locator('div.edit-item[role="button"]');
  console.log('Edit icon count:', await editIcons.count());
  
  // Click first edit icon
  await editIcons.first().click({ force: true });
  await page.waitForTimeout(3000);

  // Capture all inputs in the edit form
  const editInputs = await page.locator('input:visible').evaluateAll(els => els.map(e => ({
    id: e.id, name: e.name, type: e.type, placeholder: e.placeholder,
    value: e.value, cls: e.className.substring(0, 80)
  })));
  console.log('Edit form inputs:', JSON.stringify(editInputs, null, 2));

  // Capture all visible selects / react-select placeholders
  const selects = await page.locator('[class*="react-select__placeholder"]:visible, [class*="react-select__single-value"]:visible').allTextContents();
  console.log('React-select values/placeholders in form:', JSON.stringify(selects));

  // Capture all visible form labels
  const labels = await page.locator('label:visible').allTextContents();
  console.log('Form labels:', JSON.stringify(labels));

  // Capture all visible buttons
  const btns = await page.locator('button:visible').allTextContents();
  console.log('Buttons:', JSON.stringify(btns));

  // Click Source input if it exists (look for "Source" label or placeholder)
  const sourceLabel = await page.getByText('Source', { exact: true }).isVisible().catch(() => false);
  console.log('Source label visible:', sourceLabel);

  // Try to find any react-select near "Source"
  const sourceSelect = page.locator('[class*="react-select__control"]:visible').first();
  const sourceVisible = await sourceSelect.isVisible().catch(() => false);
  console.log('React-select control visible:', sourceVisible);
  
  if (sourceVisible) {
    await sourceSelect.click();
    await page.waitForTimeout(2000);
    const options = await page.locator('[class*="react-select__option"]:visible').allTextContents();
    console.log('Source dropdown options:', JSON.stringify(options));
    // close without selecting
    await page.keyboard.press('Escape');
  }

  // Close edit form
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);

  // ─── PART 2: INSPECT ADD OPTIONS MODAL ──────────────────────────────────
  console.log('\n=== PART 2: INSPECT ADD OPTIONS MODAL ===');
  
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('h4')].find(h => h.textContent.includes('Quote Items'));
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await page.waitForTimeout(2000);

  // click Add Options
  await page.getByText('Add Options', { exact: true }).click({ force: true });
  await page.waitForTimeout(3000);

  // Capture modal content
  const modalHeading = await page.locator('h4:visible, h3:visible, h2:visible, [class*="modal"] h1, [class*="drawer"] h1').allTextContents();
  console.log('Modal headings:', JSON.stringify(modalHeading));

  const modalInputs = await page.locator('input:visible').evaluateAll(els => els.map(e => ({
    id: e.id, name: e.name, type: e.type, placeholder: e.placeholder,
    cls: e.className.substring(0, 80)
  })));
  console.log('Modal inputs:', JSON.stringify(modalInputs, null, 2));

  const modalBtns = await page.locator('button:visible').allTextContents();
  console.log('Modal buttons:', JSON.stringify(modalBtns));

  const modalText = await page.locator('[class*="modal"], [class*="dialog"], [class*="drawer"], [class*="panel"]').first().textContent().catch(() => 'not found');
  console.log('Modal text (first 400):', modalText?.substring(0, 400));

  // Check "Duplicate from" dropdown
  const dupFrom = page.locator('[class*="react-select__control"]:visible').first();
  const dupVisible = await dupFrom.isVisible().catch(() => false);
  console.log('"Duplicate from" react-select visible:', dupVisible);

  if (dupVisible) {
    await dupFrom.click();
    await page.waitForTimeout(2000);
    const dupOptions = await page.locator('[class*="react-select__option"]:visible').allTextContents();
    console.log('Duplicate from options:', JSON.stringify(dupOptions));

    if (dupOptions.length > 0) {
      // Select first option
      await page.locator('[class*="react-select__option"]:visible').first().click();
      await page.waitForTimeout(3000);

      // Capture what appears after selection
      const afterSelect = await page.locator('input:visible').evaluateAll(els => els.map(e => ({
        id: e.id, name: e.name, type: e.type, placeholder: e.placeholder,
        cls: e.className.substring(0, 80)
      })));
      console.log('Inputs after Duplicate from select:', JSON.stringify(afterSelect, null, 2));

      const afterBtns = await page.locator('button:visible').allTextContents();
      console.log('Buttons after Duplicate from select:', JSON.stringify(afterBtns));

      const checkboxes = await page.locator('input[type="checkbox"]:visible').count();
      console.log('Checkboxes visible after select:', checkboxes);

      const allVisibleText = await page.locator('body').innerText();
      // Search for relevant sections
      const lines = allVisibleText.split('\n').filter(l => l.trim().length > 2).slice(0, 60);
      console.log('Page text (first 60 lines):\n', lines.join('\n'));
    } else {
      console.log('No options in Duplicate from dropdown');
      await page.keyboard.press('Escape');
    }
  }

  // ─── PART 3: DELETE ICON STRUCTURE ──────────────────────────────────────
  console.log('\n=== PART 3: DELETE ICON STRUCTURE ===');
  
  // Close modal first
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  
  const delIcons = await page.locator('div.quote-option-del-icon').evaluateAll(els => els.map((e, i) => ({
    index: i,
    class: e.className,
    role: e.getAttribute('role'),
    ariaLabel: e.getAttribute('aria-label'),
    title: e.getAttribute('title'),
    parentClass: e.parentElement?.className?.substring(0, 80),
    grandParentClass: e.parentElement?.parentElement?.className?.substring(0, 80),
  })));
  console.log('All delete icons:', JSON.stringify(delIcons, null, 2));

  const editItemDivs = await page.locator('div.edit-item').evaluateAll(els => els.map((e, i) => ({
    index: i,
    class: e.className,
    role: e.getAttribute('role'),
    ariaLabel: e.getAttribute('aria-label'),
    parentClass: e.parentElement?.className?.substring(0, 80),
  })));
  console.log('All edit-item divs:', JSON.stringify(editItemDivs, null, 2));

  await page.waitForTimeout(3000);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
