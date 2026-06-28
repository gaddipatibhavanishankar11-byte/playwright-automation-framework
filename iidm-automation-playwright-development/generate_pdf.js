const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  try {
    const html = fs.readFileSync('IIDM_Playwright_Interview_Prep.html', 'utf8');
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.pdf({ path: 'IIDM_Playwright_Interview_Prep.pdf', format: 'A4' });
    await browser.close();
    console.log('PDF generated: IIDM_Playwright_Interview_Prep.pdf');
  } catch (err) {
    console.error('Error generating PDF:', err);
    process.exit(1);
  }
})();
