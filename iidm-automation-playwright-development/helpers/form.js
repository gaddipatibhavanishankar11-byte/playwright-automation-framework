// @ts-check

/**
 * Fill a text input identified by its label.
 */
export async function fillInput(page, label, value) {
  await page.getByLabel(label).fill(value);
}

/**
 * Select an option from a dropdown identified by its label.
 */
export async function selectDropdown(page, label, option) {
  await page.getByLabel(label).click();
  await page.getByRole('option', { name: option }).click();
}

/**
 * Fill a date picker field.
 */
export async function fillDatePicker(page, label, date) {
  const input = page.getByLabel(label);
  await input.click();
  await input.fill(date);
  await page.keyboard.press('Enter');
}

/**
 * Click a submit/save button.
 */
export async function submitForm(page) {
  await page.getByRole('button', { name: /save|submit|create/i }).click();
}

/**
 * Click a specific button by its name.
 */
export async function clickButton(page, name) {
  await page.getByRole('button', { name }).click();
}
