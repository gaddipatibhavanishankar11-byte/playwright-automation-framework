const { chromium } = require('./node_modules/@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const APP_URL = 'https://www.staging-buzzworld-v1.iidm.com';
  const EMAIL = 'defaultuser@enterpi.com';
  const PASSWORD = 'Enspirit@625';
  await page.goto(`${APP_URL}/quote_for_parts`);
  await page.waitForURL('**/Login**', { timeout: 30000 });
  await page.fill('input[name="Email"], input[type="email"]', EMAIL).catch(() => {});
  await page.fill('input[name="Password"], input[type="password"]', PASSWORD).catch(() => {});
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/quote_for_parts', { timeout: 60000 });
  await page.waitForTimeout(5000);
  await page.click('text=Repairs');
  await page.waitForSelector('text=Create RMA', { timeout: 30000 });
  await page.click('text=Create RMA');
  await page.waitForSelector('h3:has-text("Create RMA")', { timeout: 30000 });
  await page.locator('div').filter({ hasText: /^Search By Company Name$/ }).nth(2).click();
  await page.waitForTimeout(500);
  await page.fill('input[name="Company Name*"], input[aria-label="Company Name*"]', 'chump03').catch(() => {});
  await page.waitForTimeout(2000);
  const header = await page.locator('h3:has-text("Create RMA")').first();
  console.log('header count', await header.count());
  if (await header.count()) {
    const drawerHandle = await header.evaluateHandle(node => node.closest('div.side-drawer'));
    const drawer = drawerHandle.asElement();
    if (drawer) {
      const html = await drawer.innerHTML();
      console.log('DRAWER_HTML_START');
      console.log(html.slice(0, 12000));
      console.log('DRAWER_HTML_END');
      await page.screenshot({ path: 'inspect_contact.png', fullPage: false });
      console.log('screenshot saved inspect_contact.png');
      const contactLabel = await drawer.$('text=Contact Name');
      console.log('contact label exists', !!contactLabel);
      if (contactLabel) {
        const labelOuter = await contactLabel.evaluate(n => n.outerHTML);
        console.log('CONTACT_LABEL_OUTER', labelOuter);
        const field = await contactLabel.evaluateHandle(n => n.closest('div'));
        if (field.asElement()) {
          const fieldOuter = await field.asElement().evaluate(n => n.outerHTML);
          console.log('CONTACT_FIELD_OUTER', fieldOuter.slice(0, 1200));
        }
      }
      const modalSelects = await drawer.$$('div:has-text("Select")');
      console.log('drawer select count', modalSelects.length);
      for (let i = 0; i < Math.min(modalSelects.length, 10); i++) {
        const outer = await modalSelects[i].evaluate(n => n.outerHTML);
        console.log('DRAWER_SELECT#' + i + ':', outer.slice(0, 300));
      }
    }
  }
  await browser.close();
})();
