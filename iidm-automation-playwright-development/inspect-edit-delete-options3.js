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

  // Navigate to quote with 1 item
  await page.goto('https://www.staging-buzzworld-v1.iidm.com/quote_for_parts/f84feaa9-753f-4adb-a8f6-247082a752f7');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(4000);

  console.log('=== STEP 1: Scroll to Quote Items ===');
  await page.locator('text=Quote Items').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/e3-step1-scrolled.png', fullPage: false });

  console.log('=== STEP 2: Select item checkbox ===');
  const itemCb = page.locator('input[name="checkbox0"]').first();
  await itemCb.scrollIntoViewIfNeeded();
  await itemCb.click({ force: true });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/e3-step2-selected.png', fullPage: false });

  const btns2 = await page.locator('button:visible').allTextContents();
  console.log('Buttons after checkbox:', JSON.stringify(btns2));
  
  const editCount = await page.locator('[class*="edit-item"]').count();
  console.log('edit-item divs count:', editCount);

  const allEditDivs = await page.locator('[class*="edit-item"]').evaluateAll(els =>
    els.map(e => ({ tag: e.tagName, cls: e.className, role: e.getAttribute('role'), visible: e.offsetParent !== null }))
  );
  console.log('All edit-item divs:', JSON.stringify(allEditDivs, null, 2));

  console.log('=== STEP 3: Click edit-item icon ===');
  await page.locator('[class*="edit-item"]').first().click({ force: true });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/e3-step3-edit-clicked.png', fullPage: false });

  const inputsAfter = await page.locator('input:visible').evaluateAll(els =>
    els.map(e => ({ type: e.type, placeholder: e.placeholder, name: e.name, value: e.value, id: e.id, cls: e.className.substring(0, 60) }))
  );
  console.log('Inputs after edit click:', JSON.stringify(inputsAfter, null, 2));

  const btns3 = await page.locator('button:visible').allTextContents();
  console.log('Buttons after edit click:', JSON.stringify(btns3));

  // Look for: number input, quantity-named input, or input with value "1"
  const numInputs = await page.locator('input[type="number"]:visible').count();
  console.log('Number-type inputs count:', numInputs);

  const qtyByName = await page.locator('input[name*="quantity" i]:visible, input[name*="qty" i]:visible').count();
  console.log('Qty-named inputs count:', qtyByName);

  // Any modals or panels opened?
  const modals = await page.locator('[class*="modal" i]:visible, [class*="drawer" i]:visible, [class*="panel" i]:visible').count();
  console.log('Modal/drawer/panel count:', modals);

  const modalText = await page.locator('[class*="modal" i]:visible').textContent().catch(() => 'none');
  console.log('Modal text snippet:', String(modalText).substring(0, 300));

  await page.waitForTimeout(2000);
  await browser.close();
})();
