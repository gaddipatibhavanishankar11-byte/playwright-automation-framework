const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.staging-buzzworld-v1.iidm.com/quote_for_parts');
    await page.waitForURL('**/Login**', { timeout: 30000 });
    await page.getByRole('textbox', { name: 'Email' }).fill('defaultuser@enterpi.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('Enspirit@625');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.waitForURL('**/quote_for_parts**', { timeout: 60000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    await page.goto('https://www.staging-buzzworld-v1.iidm.com/organizations', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Check URL
    console.log('URL after goto organizations:', page.url());

    // Check row count before search
    const rowsBefore = await page.locator('.ag-center-cols-container .ag-row').count();
    console.log('Rows before search:', rowsBefore);

    // Search 'chump03'
    const searchInput = page.getByRole('textbox', { name: 'Name / Company Name / Account' });
    await searchInput.fill('chump03');
    await searchInput.press('Enter');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(5000); // Wait longer for data

    const rowsAfterSearch = await page.locator('.ag-center-cols-container .ag-row').count();
    console.log('Rows after search for chump03:', rowsAfterSearch);

    await page.screenshot({ path: 'inspect_orgs_before_export.png', fullPage: false });

    // Now click Export and see what happens
    const exportBtn = page.locator('div').filter({ hasText: /^Export$/ }).first();
    const exportVisible = await exportBtn.isVisible();
    console.log('Export visible:', exportVisible);

    let downloadReceived = false;
    page.on('download', (dl) => {
      downloadReceived = true;
      console.log('Download received:', dl.suggestedFilename());
    });

    await exportBtn.click();
    await page.waitForTimeout(5000);

    console.log('Download received after click:', downloadReceived);
    console.log('URL after export click:', page.url());

    await page.screenshot({ path: 'inspect_orgs_after_export.png', fullPage: false });

  } catch (err) {
    console.error('ERROR:', err.message);
    console.log('URL at error:', page.url());
    await page.screenshot({ path: 'inspect_orgs_export_click_error.png', fullPage: false }).catch(() => {});
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
})();
