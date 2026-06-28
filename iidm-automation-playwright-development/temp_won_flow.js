const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.staging-buzzworld-v1.iidm.com/quote_for_parts');
    await page.waitForURL('**/Login**', { timeout: 30000 });
    await page.getByRole('textbox', { name: 'Email' }).fill('defaultuser@enterpi.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('Enspirit@625');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.waitForURL('**/quote_for_parts**', { timeout: 60000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Go to All Quotes, filter by Won
    await page.getByText('All Quotes', { exact: true }).click();
    await page.waitForTimeout(3000);
    await page.getByText('Filters').click();
    await page.waitForTimeout(2000);
    await page.locator('div:nth-child(3) > .css-sjtnp2 > .pi-select-wrapper > .css-5a7vsu-container > .drop-height-80px.multi-select.react-select__control > .drop-height-80px.multi-select.react-select__value-container').click();
    await page.waitForTimeout(1500);
    await page.getByText('Won', { exact: true }).first().click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Apply' }).click();
    await page.waitForTimeout(5000);

    const rows = await page.locator('.ag-center-cols-container .ag-row').count();
    console.log('Won rows found:', rows);
    if (rows > 0) {
      await page.locator('.ag-center-cols-container .ag-row').first().click();
      await page.waitForTimeout(5000);
    } else {
      console.log('No Won quotes found');
      return;
    }

    console.log('URL:', page.url());

    // Check for PO Number BEFORE clicking Create Sales Order
    const poBeforeClick = await page.getByRole('textbox', { name: 'Enter PO Number' }).isVisible();
    console.log('PO Number visible BEFORE clicking Create Sales Order:', poBeforeClick);

    // Check div elements matching Create Sales Order
    const csoBtns = page.locator('div').filter({ hasText: /^Create Sales Order$/ });
    const csoCount = await csoBtns.count();
    console.log('Create Sales Order div count:', csoCount);
    for (let i = 0; i < csoCount; i++) {
      const txt = await csoBtns.nth(i).textContent();
      const vis = await csoBtns.nth(i).isVisible();
      console.log(`  div[${i}] text="${txt?.trim()}" visible=${vis}`);
    }

    await page.screenshot({ path: 'test-results/won_before_click.png', fullPage: false });

    // Click index 0
    if (csoCount > 0) {
      console.log('Clicking Create Sales Order btn index 0...');
      await csoBtns.first().click();
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'test-results/won_after_click.png', fullPage: false });

      const poAfter = await page.getByRole('textbox', { name: 'Enter PO Number' }).isVisible();
      console.log('PO Number visible AFTER click:', poAfter);

      const allBtns = await page.locator('button:visible').allTextContents();
      console.log('Visible buttons after click:', JSON.stringify(allBtns));

      const visibleDivs = page.locator('div').filter({ hasText: /^Create Sales Order$/ });
      const divCount2 = await visibleDivs.count();
      console.log('Create Sales Order divs after modal open:', divCount2);
    }

    await page.waitForTimeout(3000);
  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: 'test-results/won_flow_error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
