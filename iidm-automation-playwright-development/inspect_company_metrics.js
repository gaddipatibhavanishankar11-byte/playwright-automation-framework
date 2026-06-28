import { test, expect, chromium } from '@playwright/test';
import { login } from './helpers/auth.js';

test('inspect company metrics selectors', async ({ page }) => {

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

await login(page, 'defaultuser@enterpi.com', 'Enspirit@625', '/quote_for_parts');

// Navigate to Company Metrics via Dashboard button
await page.getByRole('button', { name: 'Dashboard' }).click();
await page.waitForTimeout(2000);
await page.getByText('Company Metrics', { exact: true }).click();
await page.waitForLoadState('networkidle').catch(() => {});
await page.waitForTimeout(3000);

await page.getByRole('button', { name: 'Shipments' }).click();
await page.waitForLoadState('networkidle').catch(() => {});
await page.waitForTimeout(2000);

// Get all elements with multi-select in class
const filterHtml = await page.evaluate(() => {
  const allWithMultiSelect = document.querySelectorAll('[class*="multi-select"]');
  const info = [];
  allWithMultiSelect.forEach(el => {
    info.push({ tag: el.tagName, classes: el.className, text: el.textContent?.slice(0, 50) });
  });
  return { count: info.length, elements: info.slice(0, 30) };
});
console.log('multi-select elements:', JSON.stringify(filterHtml, null, 2));

// Get react-select class info
const reactSelectInfo = await page.evaluate(() => {
  const allReactSelect = document.querySelectorAll('[class*="react-select"]');
  const info = [];
  allReactSelect.forEach(el => {
    info.push({ tag: el.tagName, classes: el.className, text: el.textContent?.slice(0, 50) });
  });
  return { count: info.length, elements: info.slice(0, 20) };
});
console.log('react-select elements:', JSON.stringify(reactSelectInfo, null, 2));

// Now click the filter to open dropdown and inspect options
const valueContainer = page.locator('[class*="value-container"]').first();
console.log('value container count:', await valueContainer.count());
await valueContainer.click();
await page.waitForTimeout(1000);

const optionInfo = await page.evaluate(() => {
  const options = document.querySelectorAll('[class*="option"]');
  const info = [];
  options.forEach(el => {
    if (el.textContent?.trim()) {
      info.push({ tag: el.tagName, classes: el.className, text: el.textContent?.trim().slice(0, 80) });
    }
  });
  return info.slice(0, 20);
});
console.log('option elements after clicking:', JSON.stringify(optionInfo, null, 2));

await browser.close();
