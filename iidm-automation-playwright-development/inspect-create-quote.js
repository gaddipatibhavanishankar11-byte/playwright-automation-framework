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

  // Click Create Quote
  await page.getByText('Create Quote', { exact: true }).click();
  await page.waitForTimeout(3000);

  // == Search company "chump03" ==
  console.log('=== SEARCH COMPANY ===');
  await page.getByText('Search By Account ID or Company Name').click();
  await page.waitForTimeout(1000);
  await page.locator('#async-select-example').pressSequentially('chump03', { delay: 150 });
  await page.waitForTimeout(5000);

  await page.screenshot({ path: 'test-results/step1-company-search.png', fullPage: true });
  const opts = await page.locator('[class*="react-select__option"]').allTextContents();
  console.log('Options:', JSON.stringify(opts));

  // Select "Chump Change Automation 23" (has CHUMP03)
  const target = page.locator('[class*="react-select__option"]').filter({ hasText: 'Chump Change Automation 23' }).first();
  const found = await target.count();
  console.log('Target option found:', found);
  if (found > 0) {
    await target.click();
  } else {
    // Fallback: click first option
    await page.locator('[class*="react-select__option"]').first().click();
  }
  await page.waitForTimeout(2000);

  // Verify selected
  const selected = await page.locator('[class*="react-select__single-value"]').allTextContents();
  console.log('Selected:', JSON.stringify(selected));

  // == Fill project name ==
  await page.locator('input[name="project_name"]').fill('test');
  await page.waitForTimeout(1000);

  // == Select Quote Type "Parts Quote" ==
  // Click placeholder to open dropdown
  const quoteTypePlaceholder = page.locator('[class*="react-select__placeholder"]').filter({ hasText: 'Quote Type' });
  await quoteTypePlaceholder.click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'test-results/step2-quote-type.png', fullPage: true });
  const typeOpts = await page.locator('[class*="react-select__option"]').allTextContents();
  console.log('Quote Type options:', JSON.stringify(typeOpts));

  await page.locator('[class*="react-select__option"]').filter({ hasText: 'Parts Quote' }).click();
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'test-results/step3-before-submit.png', fullPage: true });

  // == Click Create Quote ==
  await page.getByRole('button', { name: 'Create Quote' }).click();
  await page.waitForTimeout(8000);
  await page.waitForLoadState('networkidle').catch(() => {});

  console.log('=== AFTER CREATE ===');
  console.log('URL:', page.url());
  await page.screenshot({ path: 'test-results/step4-after-create.png', fullPage: true });

  // Toasts
  const toasts = await page.locator('[class*="Toastify"], [role="alert"]').allTextContents();
  console.log('Toasts:', JSON.stringify(toasts));

  // Page content
  const headings = await page.locator('h1:visible, h2:visible, h3:visible, h4:visible, h5:visible').allTextContents();
  console.log('Headings:', JSON.stringify(headings));

  const buttons = await page.locator('button:visible').allTextContents();
  console.log('Buttons:', JSON.stringify(buttons));

  const tabs = await page.locator('[role="tab"], .nav-link, .tab').allTextContents();
  console.log('Tabs:', JSON.stringify(tabs));

  // All visible text elements (spans, divs, labels)
  const labels = await page.locator('label:visible').allTextContents();
  console.log('Labels:', JSON.stringify(labels));

  // Check for "Add Items" or similar
  const addItems = await page.getByText(/add item/i).count();
  console.log('Add Items count:', addItems);

  // Any links
  const links = await page.locator('a:visible').allTextContents();
  console.log('Links:', JSON.stringify(links.slice(0, 20)));

  await page.waitForTimeout(2000);
  await browser.close();
})();
