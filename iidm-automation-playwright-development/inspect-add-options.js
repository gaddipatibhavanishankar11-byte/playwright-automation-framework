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

  // Navigate to quote with items
  await page.goto('https://www.staging-buzzworld-v1.iidm.com/quote_for_parts/f84feaa9-753f-4adb-a8f6-247082a752f7');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(4000);

  // Scroll down to Quote Items section
  await page.locator('text=Quote Items').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  console.log('=== CLICKING ADD OPTIONS ===');
  const addOptionsBtn = page.getByText('Add Options', { exact: true });
  const addOptionsCount = await addOptionsBtn.count();
  console.log('Add Options button count:', addOptionsCount);

  await addOptionsBtn.first().click({ force: true });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/add-options-opened.png', fullPage: false });

  // What inputs appeared?
  const inputsAfter = await page.locator('input:visible, textarea:visible').evaluateAll(els =>
    els.map(e => ({ tag: e.tagName, type: e.type, placeholder: e.placeholder, name: e.name, value: e.value, id: e.id, cls: e.className.substring(0, 60) }))
  );
  console.log('Inputs/Textareas after Add Options click:', JSON.stringify(inputsAfter, null, 2));

  const btns = await page.locator('button:visible').allTextContents();
  console.log('Buttons visible:', JSON.stringify(btns));

  // Any modal/drawer?
  const modals = await page.locator('[role="dialog"]:visible, [class*="modal" i]:visible, [class*="drawer" i][class*="open" i]:visible').evaluateAll(els =>
    els.map(e => ({ tag: e.tagName, cls: e.className.substring(0, 80), role: e.getAttribute('role') }))
  );
  console.log('Modals/Dialogs:', JSON.stringify(modals, null, 2));

  // What's the text in any overlay?
  const overlayText = await page.locator('[role="dialog"]:visible').textContent().catch(() => '');
  if (overlayText) console.log('Dialog text:', overlayText.substring(0, 500));

  // Also check: what new element appeared
  const newPanelOrForm = await page.locator('form:visible, [class*="form" i]:visible').count();
  console.log('Form elements visible:', newPanelOrForm);

  // Look for React-select or other dropdowns
  const selects = await page.locator('[class*="react-select__control"]:visible').count();
  console.log('React-select controls visible:', selects);

  // Look for label texts
  const labels = await page.locator('label:visible').allTextContents();
  console.log('Labels visible:', JSON.stringify(labels));

  await page.waitForTimeout(2000);
  await browser.close();
})();
