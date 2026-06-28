import { test, expect } from '@playwright/test';
import { loginAsDefault, logout } from '../../helpers/auth.js';
import { waitForGridLoad } from '../../helpers/grid.js';

test.describe('Repairs Module', () => {
  test.describe.configure({ timeout: 300000 });

  async function openRepairsPage(page) {
    await page.getByText('Repairs').click();
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await expect(page.getByRole('heading', { name: 'Repairs', level: 1 }))
      .toBeVisible({ timeout: 30000 });
    await waitForGridLoad(page, 60000);
    await expect(page.getByText('Create RMA', { exact: true }))
      .toBeVisible({ timeout: 30000 });
  }

  async function clearSearchAndFilters(page) {
    const searchInput = page.locator('input[placeholder*="RMA ID"]').first();
    if (await searchInput.count() > 0) {
      const val = await searchInput.inputValue().catch(() => '');
      if (val.trim()) {
        await searchInput.fill('');
        await page.waitForTimeout(1000);
        await waitForGridLoad(page, 60000).catch(() => {});
      }
    }
    const clearBtn = page.getByText('Clear', { exact: true }).first();
    if (await clearBtn.isVisible().catch(() => false)) {
      await clearBtn.click();
      await page.waitForTimeout(1000);
      await waitForGridLoad(page, 60000).catch(() => {});
    }
  }

  async function applyRepairsStatusFilter(page, status) {
    const clearBtn = page.getByText('Clear', { exact: true }).first();
    if (await clearBtn.isVisible().catch(() => false)) {
      await clearBtn.click();
      await page.waitForTimeout(1000);
      await waitForGridLoad(page, 60000);
    }

    await page.getByText('Filters').click();
    await page.waitForTimeout(2000);
    await page.locator('h3').filter({ hasText: /Filters/ }).waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('div:nth-child(3) > .css-sjtnp2 > .pi-select-wrapper > .css-5a7vsu-container > .drop-height-80px.multi-select.react-select__control > .drop-height-80px.multi-select.react-select__value-container').click();
    await page.waitForTimeout(1000);
    await page.getByText(status, { exact: true }).first().click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Apply' }).click();
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await waitForGridLoad(page, 60000);
  }

  async function clickRepairsStatus(page, status) {
    const statusItem = page.getByText(status, { exact: true }).first();
    await statusItem.waitFor({ state: 'visible', timeout: 30000 });
    await statusItem.click();
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await waitForGridLoad(page, 60000);
  }

  async function clickMarkInProgress(page) {
    let markInProgress = page.getByRole('button', { name: /Mark as In Progress/i });
    if (await markInProgress.count() === 0) {
      markInProgress = page.getByText(/Mark as In Progress/i);
    }
    await expect(markInProgress.first()).toBeVisible({ timeout: 45000 });
    await markInProgress.first().click();
  }

  // REP-001
  test('REP-001: Repairs page loads after login', async ({ page }) => {
    await loginAsDefault(page);
    await openRepairsPage(page);
    await clearSearchAndFilters(page);
    await waitForGridLoad(page, 60000);
    await expect(page.getByRole('heading', { name: 'Repairs', level: 1 })).toBeVisible();
    await expect(page.getByText('Create RMA', { exact: true })).toBeVisible();
    await page.waitForTimeout(5000);
    await logout(page);
  });

  // REP-002
  test('REP-002: Filter repairs by Completed RMA status', async ({ page }) => {
    await loginAsDefault(page);
    await openRepairsPage(page);
    await clearSearchAndFilters(page);

    await applyRepairsStatusFilter(page, 'Completed');

    const clearBtn = page.getByText('Clear', { exact: true }).first();
    await expect(clearBtn).toBeVisible({ timeout: 10000 });
    await clearBtn.click();
    await page.waitForTimeout(3000);
    await waitForGridLoad(page, 60000);
  });

  // REP-003
  test('REP-003: Cycle through all repair statuses', async ({ page }) => {
    await loginAsDefault(page);
    await openRepairsPage(page);
    await clearSearchAndFilters(page);
    await waitForGridLoad(page, 60000);

    const statuses = [
      'Receiving',
      'Check In',
      'Evaluation',
      'Pending Quote',
      'Pending Approval',
      'Repair in progress',
      'QC',
      'Billing',
    ];

    for (const status of statuses) {
      await clickRepairsStatus(page, status);
      await expect(page.locator('.ag-center-cols-container .ag-row:not(.ag-row-loading)').first())
        .toBeVisible({ timeout: 60000 });
    }
  });

  // REP-004
  test('REP-004: Create RMA with company and contact', async ({ page }) => {
    await loginAsDefault(page);
    await openRepairsPage(page);

    await page.locator('div').filter({ hasText: /^Create RMA$/ }).nth(1).click();
    await expect(page.getByRole('heading', { name: 'Create RMA', level: 3 }))
      .toBeVisible({ timeout: 15000 });

    await page.locator('div').filter({ hasText: /^Search By Company Name$/ }).nth(2).click();
    await page.getByRole('textbox', { name: 'Company Name*' }).fill('chump03');
    await expect(page.locator('.react-select__menu')).toBeVisible({ timeout: 15000 });
    await page.locator('.react-select__menu .react-select__option').first().click();

    await page.waitForTimeout(2000);

    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await expect(page.getByText('Ajay Reddy', { exact: true })).toBeVisible({ timeout: 15000 });
    await page.getByText('Ajay Reddy', { exact: true }).click();

    await page.getByRole('button', { name: 'Create' }).nth(1).click();
    await page.waitForURL(/\/repair-request\/[A-Za-z0-9-]+/, { timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(3000);
  });

  // REP-005
  test('REP-005: Create RMA without contact shows validation', async ({ page }) => {
    await loginAsDefault(page);
    await openRepairsPage(page);

    await page.locator('div').filter({ hasText: /^Create RMA$/ }).nth(1).click();
    await expect(page.getByRole('heading', { name: 'Create RMA', level: 3 }))
      .toBeVisible({ timeout: 15000 });

    await page.locator('div').filter({ hasText: /^Search By Company Name$/ }).nth(2).click();
    await page.getByRole('textbox', { name: 'Company Name*' }).fill('chump03');
    await expect(page.locator('.react-select__menu')).toBeVisible({ timeout: 15000 });
    await page.locator('.react-select__menu .react-select__option').first().click();

    await page.waitForTimeout(1500);

    const createButton = page.getByRole('button', { name: 'Create' }).nth(1);
    await expect(createButton).toBeVisible({ timeout: 10000 });

    const createDisabled = await createButton.isDisabled().catch(() => false);
    if (!createDisabled) {
      await createButton.click();
      await page.waitForTimeout(5000);
    }

    await expect(page.getByRole('heading', { name: 'Create RMA', level: 3 })).toBeVisible();
    await expect(page.locator('text=/contact.*required|required.*contact|contact.*is required|select.*contact|missing.*contact/i')).toBeVisible({ timeout: 10000 });
  });

  // REP-006 to REP-020: Full repair lifecycle
  test('REP-006 to REP-020: Full repair lifecycle: create,items,assign,evaluate,quote,order,in-progress,summary,parts,QC,complete,statuses,edit,download', async ({ page }) => {
    test.setTimeout(1800000);

    let repairDetailUrl = '';
    const APP_URL  = 'https://www.staging-buzzworld-v1.iidm.com';
    const EMAIL    = 'defaultuser@enterpi.com';
    const PASSWORD = 'Enspirit@625';

    // LOGIN — navigate to app first, which redirects to SSO
    await page.goto(`${APP_URL}/quote_for_parts`);
    await page.waitForURL('**/Login**', { timeout: 30000 });
    await page.getByRole('textbox', { name: 'Email' }).click();
    await page.getByRole('textbox', { name: 'Email' }).pressSequentially(EMAIL, { delay: 50 });
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).pressSequentially(PASSWORD, { delay: 50 });
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    // After Sign In the app routes through /loading... multiple times before settling.
    // waitForURL(**\/quote_for_parts) times out if the app lands on a different route first.
    // Instead: wait until the URL is on the app domain (not SSO) and is no longer on /loading.
    await page.waitForFunction(
      () => !window.location.href.includes('sso') && !window.location.href.includes('/loading'),
      { timeout: 90000 }
    );
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(5000);

    // OPEN REPAIRS
    await page.getByText('Repairs').click();
    await expect(page.getByRole('heading', { name: 'Repairs', level: 1 })).toBeVisible({ timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // DISPLAY ALL (so each repair item appears as its own row later)
    await page.locator('div').filter({ hasText: 'Display All' }).nth(4).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // CREATE RMA
    await page.getByText('Create RMA').click();
    await expect(page.getByRole('heading', { name: 'Create RMA', level: 3 })).toBeVisible({ timeout: 15000 });

    // Open company wrapper div, type, pick first dropdown option
    await page.locator('div').filter({ hasText: /^Search By Company Name$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.getByRole('textbox', { name: 'Company Name*' }).fill('chump03');
    await expect(page.locator('#react-select-2-option-0')).toBeVisible({ timeout: 15000 });
    await page.locator('#react-select-2-option-0').click();
    await page.waitForTimeout(1000);

    // Contact dropdown
    await page.waitForTimeout(2000);
    const contactControl = page.locator('div.css-sjtnp2', { hasText: 'Contact Name' }).locator('div.react-select__control').first();
    await expect(contactControl).toBeVisible({ timeout: 15000 });
    await contactControl.click();
    await expect(page.locator('div.react-select__menu')).toBeVisible({ timeout: 20000 });
    const ajayOption = page.locator('div.react-select__option', { hasText: 'Ajay Reddy' }).first();
    if (await ajayOption.count() > 0) {
      await ajayOption.click();
    } else {
      const firstOption = page.locator('div.react-select__option').first();
      await expect(firstOption).toBeVisible({ timeout: 20000 });
      await firstOption.click();
    }

    // Create
    await Promise.all([
      page.waitForURL(/\/repair-request\/[A-Za-z0-9-]+/, { timeout: 60000 }),
      page.getByRole('button', { name: 'Create' }).nth(1).click(),
    ]);
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);
    repairDetailUrl = page.url();

    // Capture the RMA number shown on the page (e.g. "315313") for grid navigation later.
    // Scan all heading text and extract the first 5-6 digit number found.
    let rmaNumber = '';
    try {
      const headingTexts = await page.locator('h1,h2,h3,h4,h5').allTextContents();
      for (const text of headingTexts) {
        const match = text?.match(/\b(\d{5,6})\b/);
        if (match) { rmaNumber = match[1]; break; }
      }
      // Broader fallback: scan the whole page body
      if (!rmaNumber) {
        const bodyText = await page.textContent('body');
        const match = bodyText?.match(/\b(\d{5,6})\b/);
        if (match) rmaNumber = match[1];
      }
    } catch { /* keep rmaNumber empty, fallback will click row-index 0 */ }

    // ADD ITEMS
    await page.getByText('Add Items').click();
    await expect(page.getByRole('textbox', { name: 'Search By Part Number' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('textbox', { name: 'Search By Part Number' }).click();
    await page.getByRole('textbox', { name: 'Search By Part Number' }).fill('231-642');
    await page.getByRole('textbox', { name: 'Search By Part Number' }).press('Enter');
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);
    const itemCheckboxes = page.locator('input[type="checkbox"][name^="checkbox"]');
    await expect(itemCheckboxes.first()).toBeVisible({ timeout: 15000 });
    await itemCheckboxes.nth(0).check();
    await itemCheckboxes.nth(1).check();
    await itemCheckboxes.nth(2).check();
    await itemCheckboxes.nth(3).check();
    await page.waitForTimeout(500);
    await page.getByText('Selected Items(4)').click();
    await page.getByRole('button', { name: 'Add Selected 4 Parts' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await expect(page.getByText('Repair Items (4)')).toBeVisible({ timeout: 60000 });
    await page.waitForTimeout(2000);

    // NOTES TO CUSTOMER (Quill editor)
    await page.locator('.ql-editor').click();
    await page.locator('.ql-editor').pressSequentially('test purposes', { delay: 30 });
    await page.locator('.ql-editor').press('Enter');
    await page.locator('.ql-editor').pressSequentially('test purposes', { delay: 30 });
    await page.locator('.ql-editor').press('Enter');
    await page.locator('.ql-editor').pressSequentially('test purposes', { delay: 30 });
    await page.locator('.ql-editor').press('Enter');
    await page.locator('.ql-editor').pressSequentially('test purposes', { delay: 30 });
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // INTERNAL NOTE
    await page.getByRole('button', { name: 'chevron-right' }).first().click();
    await page.waitForTimeout(500);
    await page.getByRole('textbox', { name: 'Type here' }).click();
    await page.getByRole('textbox', { name: 'Type here' }).fill('test');
    await page.getByRole('button', { name: 'loading' }).nth(3).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // OPEN FIRST ITEM DETAIL
    await page.locator('.sc-ecPEgm > img').click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);
    // repairItemUrl will be updated after SO creation via Orders navigation
    let repairItemUrl = page.url();

    // ── ITEM 1: Repairable ────────────────────────────────────────────────

    // Assign Location
    await page.getByText('Assign Location').first().click();
    await page.waitForTimeout(500);
    await page.locator('div:nth-child(4) > .label-text-div > .pi-label-edit-icon > svg').click();
    await page.getByRole('textbox', { name: 'Serial No' }).click();
    await page.getByRole('textbox', { name: 'Serial No' }).fill('123');
    await page.locator('.save-reset-icons > .tick-icon > svg').click();
    await page.waitForTimeout(500);
    await page.getByRole('textbox', { name: 'Storage Location' }).click();
    await page.getByRole('textbox', { name: 'Storage Location' }).fill('123');
    await page.getByRole('button', { name: 'Update Location' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Assign Technician
    await page.getByText('Assign Technician').click();
    await page.waitForTimeout(500);
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await expect(page.locator('#react-select-6-option-0')).toBeVisible({ timeout: 10000 });
    await page.locator('#react-select-6-option-0').click();
    await page.getByRole('button', { name: 'Assign' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Evaluate (Repairable)
    await page.locator('div').filter({ hasText: /^Evaluate Item$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await expect(page.locator('#react-select-7-option-0')).toBeVisible({ timeout: 10000 });
    await page.locator('#react-select-7-option-0').click();
    await page.locator('#react-select-7-option-1').click();
    await page.getByLabel('open').first().click();
    await page.getByRole('textbox', { name: 'Estimated Repair Hrs' }).click();
    await page.getByRole('textbox', { name: 'Estimated Repair Hrs' }).fill('11');
    await page.getByRole('textbox', { name: 'Estimated Parts Cost' }).click();
    await page.getByRole('textbox', { name: 'Estimated Parts Cost' }).fill('11');
    await page.getByRole('textbox', { name: 'Technician Suggested Price' }).click();
    await page.getByRole('textbox', { name: 'Technician Suggested Price' }).fill('11');
    await page.locator('.ql-editor.ql-blank').click();
    await page.locator('.ql-editor.ql-blank').fill('test');
    await page.getByRole('textbox', { name: 'Type here' }).click();
    await page.getByRole('textbox', { name: 'Type here' }).fill('test');
    await page.getByRole('button', { name: 'Update Evaluation' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // ── ITEM 2: Not Repairable ────────────────────────────────────────────

    // Assign Location
    await page.getByText('Assign Location').first().click();
    await page.waitForTimeout(500);
    await page.getByRole('textbox', { name: 'Storage Location' }).click();
    await page.getByRole('textbox', { name: 'Storage Location' }).fill('123');
    await page.locator('div:nth-child(4) > .label-text-div > .pi-label-edit-icon > svg > path').click();
    await page.getByRole('textbox', { name: 'Serial No' }).click();
    await page.getByRole('textbox', { name: 'Serial No' }).fill('123');
    await page.locator('.save-reset-icons > .tick-icon > svg').click();
    await page.getByRole('button', { name: 'Update Location' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Assign Technician
    await page.locator('div').filter({ hasText: /^Assign Technician$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await expect(page.locator('#react-select-9-option-0')).toBeVisible({ timeout: 10000 });
    await page.locator('#react-select-9-option-0').click();
    await page.getByRole('button', { name: 'Assign' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Evaluate (Not Repairable)
    await page.locator('div').filter({ hasText: /^Evaluate Item$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.locator('.sc-iLLODe').click();
    await page.getByText('Not Repairable').click();
    await page.waitForTimeout(500);
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await expect(page.locator('#react-select-10-option-0')).toBeVisible({ timeout: 10000 });
    await page.locator('#react-select-10-option-0').click();
    await page.getByText('Chassis - damage', { exact: true }).click();
    await page.locator('div').filter({ hasText: /^Summary\*$/ }).first().click();
    await page.getByLabel('open').first().click();
    await page.getByRole('button', { name: 'Update Evaluation' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // ── ITEM 3: Repairable-Outsource ──────────────────────────────────────

    // Assign Location
    await page.locator('div').filter({ hasText: /^Assign Location$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.getByRole('textbox', { name: 'Storage Location' }).click();
    await page.getByRole('textbox', { name: 'Storage Location' }).fill('123');
    await page.locator('div:nth-child(4) > .label-text-div > .pi-label-edit-icon > svg').click();
    await page.getByRole('textbox', { name: 'Serial No' }).click();
    await page.getByRole('textbox', { name: 'Serial No' }).fill('123');
    await page.getByTitle('Save Changes').click();
    await page.getByRole('button', { name: 'Update Location' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Assign Technician (search by "dan")
    await page.locator('div').filter({ hasText: /^Assign Technician$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.locator('#react-select-12-input').fill('dan');
    await expect(page.locator('#react-select-12-option-0')).toBeVisible({ timeout: 10000 });
    await page.locator('#react-select-12-option-0').click();
    await page.getByRole('button', { name: 'Assign' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Evaluate (Repairable-Outsource)
    await page.locator('div').filter({ hasText: /^Evaluate Item$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.getByText('Repairable-Outsource').click();
    await page.getByRole('textbox', { name: 'Technician Suggested Price' }).click();
    await page.getByRole('textbox', { name: 'Technician Suggested Price' }).fill('545');
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await page.waitForTimeout(1000);
    await expect(page.getByText('Chassis - corrosion', { exact: true })).toBeVisible({ timeout: 15000 });
    await page.getByText('Chassis - damage', { exact: true }).click();
    await page.getByLabel('open').first().click();
    await page.getByRole('button', { name: 'Update Evaluation' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // DELETE ITEM 4
    await page.getByRole('button', { name: 'delete-icon' }).nth(3).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Yes' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);
    // VALIDATION: item count dropped from 4 to 3
    await expect(page.getByText('Repair Items (3)')).toBeVisible({ timeout: 15000 });

    // ADD ITEMS TO QUOTE (only the first item)
    const quoteCheckbox = page.locator('input[type="checkbox"][name="checkbox0"]');
    await expect(quoteCheckbox).toBeVisible({ timeout: 15000 });
    await quoteCheckbox.check();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Add items to quote' }).click();
    const acceptBtn = page.getByRole('button', { name: 'Accept' });
    await expect(acceptBtn).toBeVisible({ timeout: 10000 });
    await expect(acceptBtn).toBeEnabled({ timeout: 10000 });
    await acceptBtn.click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const approveBtn = page.getByRole('button', { name: 'Approve' }).first();
    await expect(approveBtn).toBeVisible({ timeout: 45000 });
    await page.waitForTimeout(1000);

    // APPROVE QUOTE
    await page.getByRole('button', { name: 'Approve' }).first().click();
    await page.waitForTimeout(1000);
    await expect(page.getByRole('button', { name: 'Approve' }).nth(1)).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Approve' }).nth(1).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(5000);

    // SUBMIT FOR CUSTOMER APPROVAL
    await expect(page.getByRole('button', { name: 'Submit for Customer Approval' })).toBeVisible({ timeout: 45000 });
    await page.getByRole('button', { name: 'Submit for Customer Approval' }).click();
    await page.waitForTimeout(1000);
    await expect(page.getByRole('button', { name: 'Submit', exact: true })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // WON — bring page to front in case a popup shifted focus
    await page.bringToFront();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await expect(page.getByRole('button', { name: 'Won' })).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Won' }).click();
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const proceed = btns.find(b => b.textContent?.trim() === 'Proceed');
      if (proceed) proceed.click();
    });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // RESEND QUOTE (conditional)
    await page.bringToFront();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const resendQuoteCount = await page.getByRole('button', { name: 'Resend Quote' }).count();
    if (resendQuoteCount > 0) {
      // Use JS click to bypass any lingering overlay (same pattern as Proceed)
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent?.trim() === 'Resend Quote');
        if (btn) btn.click();
      });
      await page.waitForTimeout(1000);
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent?.trim() === 'Submit');
        if (btn) btn.click();
      });
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    // WON (conditional second time)
    const wonButton = page.getByRole('button', { name: 'Won' });
    if (await wonButton.count() > 0) {
      await wonButton.click();
      await page.waitForTimeout(1000);
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const proceed = btns.find(b => b.textContent?.trim() === 'Proceed');
        if (proceed) proceed.click();
      });
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    // Dismiss any lingering Approval confirmation modals before creating SO
    await page.waitForTimeout(1000);
    for (let i = 0; i < 5; i++) {
      const proceedCount = await page.getByRole('button', { name: 'Proceed' }).count();
      if (proceedCount === 0) break;
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const proceed = btns.find(b => b.textContent?.trim() === 'Proceed');
        if (proceed) proceed.click();
      });
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1500);
    }

    // CREATE SALES ORDER
    await page.waitForTimeout(2000);
    const createSOBtn = page.locator('div').filter({ hasText: /^Create Sales Order$/ });
    await expect(createSOBtn.first()).toBeVisible({ timeout: 30000 });
    await createSOBtn.nth(2).click();
    await expect(page.getByRole('textbox', { name: 'Enter PO Number' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('textbox', { name: 'Enter PO Number' }).click();
    await page.getByRole('textbox', { name: 'Enter PO Number' }).fill('1234');
    await page.waitForTimeout(1500);
    await page.locator('div').filter({ hasText: /^Select FOB Point$/ }).nth(2).click();
    await page.waitForTimeout(1000);
    await expect(page.getByText('DDP', { exact: true })).toBeVisible({ timeout: 15000 });
    await page.getByText('DDP', { exact: true }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Create' }).nth(1).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // ── POST SALES ORDER: go directly back to the same repair item ──
    // repairItemUrl was captured when the first item was opened during evaluation.
    // Navigate back and reload; wait generously for the React app to fully re-render.
    await page.goto(repairItemUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // MARK AS IN PROGRESS
    await clickMarkInProgress(page);
    await page.waitForTimeout(1500);
    await expect(page.getByRole('button', { name: 'Accept' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Accept' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(5000);

    // After status change the app may redirect — navigate back to repair item to ensure clean state
    await page.goto(repairItemUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // REPAIR SUMMARY — test result / notes
    await page.getByRole('button', { name: 'chevron-right' }).nth(3).click();
    await page.waitForTimeout(1000);
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await page.waitForTimeout(500);
    // Custom checkbox dropdown — click first two visible options by text
    const summaryFirstOption = page.getByText('Bench tested', { exact: true }).first();
    await expect(summaryFirstOption).toBeVisible({ timeout: 10000 });
    await summaryFirstOption.click();
    await page.getByText('Entered parameters', { exact: true }).first().click();
    await page.getByLabel('open').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // REPAIR SUMMARY — labour entries
    await page.getByRole('button', { name: 'chevron-right' }).nth(1).click();
    await page.waitForTimeout(1000);
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await expect(page.getByText('ABEL MORALEZ - 165', { exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByText('ABEL MORALEZ - 165', { exact: true }).click();
    await page.waitForTimeout(500);
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(2).click();
    await expect(page.getByText('2 - ASSEMBLY', { exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByText('2 - ASSEMBLY', { exact: true }).click();
    await page.locator('div:nth-child(5) > .css-1p1fgsa > .css-1s25hsw').click();
    await page.getByRole('textbox', { name: 'Spent Time (Hours)' }).fill('11');
    await page.getByRole('button', { name: 'Add' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await page.locator('div').filter({ hasText: /^2 - ASSEMBLY$/ }).nth(2).click();
    await expect(page.getByText('1 - MATERIAL STAGING', { exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByText('1 - MATERIAL STAGING', { exact: true }).click();
    await page.getByRole('button', { name: 'Add' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // PART PURCHASES — navigate back to repair item first so page is in a clean state,
    // then open the Part Purchases section via its chevron button.
    await page.goto(repairItemUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    await page.getByRole('button', { name: 'chevron-right' }).nth(2).click();

    // Requestor information
    await expect(page.getByText('Requestor information', { exact: true })).toBeVisible({ timeout: 15000 });
    const requestorNext = page.getByRole('button', { name: 'Next' }).first();
    await expect(requestorNext).toBeVisible({ timeout: 15000 });
    await expect(requestorNext).toBeEnabled({ timeout: 15000 });
    await requestorNext.click();

    // Vendor Information
    await expect(page.getByText('Vendor Information', { exact: true })).toBeVisible({ timeout: 15000 });
    await page.locator('div').filter({ hasText: /^Search Vendor$/ }).nth(2).click();
    await page.waitForTimeout(500);
    const vendorSearchInput = page.getByRole('textbox', { name: /Date Requested\* Vendor Name\*|Vendor Name\*/i }).first();
    if (await vendorSearchInput.count() > 0) {
      await vendorSearchInput.fill('wago001');
    } else {
      await page.keyboard.type('wago001', { delay: 80 });
    }
    const vendorMenu = page.locator('.react-select__menu');
    await expect(vendorMenu).toBeVisible({ timeout: 30000 });
    const vendorOption = vendorMenu.locator('div.react-select__option', { hasText: 'WAGO CORPORATION' }).first();
    await expect(vendorOption).toBeVisible({ timeout: 30000 });
    await vendorOption.click();
    const vendorNext = page.getByRole('button', { name: 'Next' }).first();
    await expect(vendorNext).toBeVisible({ timeout: 15000 });
    await expect(vendorNext).toBeEnabled({ timeout: 15000 });
    await vendorNext.click();

    // Item Information
    await expect(page.getByText('Item Information', { exact: true })).toBeVisible({ timeout: 15000 });
    await page.locator('div').filter({ hasText: /^Search Manufacturer$/ }).nth(2).click();
    await page.waitForTimeout(500);
    const manufacturerInput = page.getByRole('textbox', { name: /Search Manufacturer/i }).first();
    if (await manufacturerInput.count() > 0) {
      await manufacturerInput.fill('WAGO001');
    } else {
      await page.locator('#async-select-example').nth(2).fill('WAGO001');
    }
    const manufacturerMenu = page.locator('.react-select__menu');
    await expect(manufacturerMenu).toBeVisible({ timeout: 30000 });
    const itemVendorOption = manufacturerMenu.locator('div.react-select__option', { hasText: 'WAGO CORPORATION' }).first();
    await expect(itemVendorOption).toBeVisible({ timeout: 30000 });
    await itemVendorOption.click();
    await page.getByRole('textbox', { name: 'Enter Quantity' }).click();
    await page.getByRole('textbox', { name: 'Enter Quantity' }).fill('1');
    await page.getByRole('textbox', { name: 'Enter Cost' }).click();
    await page.getByRole('textbox', { name: 'Enter Cost' }).fill('1');
    await page.getByRole('textbox', { name: 'Enter Vendor Part Number' }).click();
    await page.getByRole('textbox', { name: 'Enter Vendor Part Number' }).fill('11');
    await page.getByRole('textbox', { name: 'Enter Description' }).fill('TESt');
    await page.getByLabel('Internal Notes').getByRole('button', { name: 'Create' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);
    // VALIDATION: Create redirects to parts purchase detail view
    await expect(page).toHaveURL(/parts-purchase-detail-view/, { timeout: 15000 });

    // After Create, app redirects to the parts purchase detail view.
    // Change status: Requested -> Received and Completed
    // ROOT CAUSE: two .pi-label-edit-icon > svg elements exist — Urgency (DOM index 0)
    // comes before Status (DOM index 1). Hovering 'Status' does not reorder the DOM,
    // so .first() always hits Urgency. FIX: scope the click to the div row that
    // contains exactly the 'Status' label so Urgency's icon is never in scope.
    await page.getByText('Status').click();
    await page.waitForTimeout(500);
    await page.locator('div').filter({ hasText: /^Status$/ }).locator('.pi-label-edit-icon > svg').first().click();
    await page.waitForTimeout(500);
    await page.locator('div').filter({ hasText: /^Requested$/ }).nth(3).click();
    await page.getByText('Received and Completed', { exact: true }).click();
    await page.locator('.save-reset-icons > .tick-icon > svg').click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);
    // VALIDATION: status now shows Received and Completed (use .first() — badge + row both contain the text)
    await expect(page.getByText('Received and Completed', { exact: true }).first()).toBeVisible({ timeout: 10000 });

    // Navigate back to repair item page
    await page.goto(repairItemUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // MARK IN PROGRESS (2nd time)
    await page.getByText('Mark as In Progress').click();
    await page.waitForTimeout(1500);
    await expect(page.getByRole('button', { name: 'Accept' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Accept' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(5000);

    // After status change the app may redirect — navigate back to repair item to ensure clean state
    await page.goto(repairItemUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // ASSIGN TO QC
    await page.locator('div').filter({ hasText: /^Assign to QC$/ }).nth(2).click();
    await page.waitForTimeout(500);
    await page.locator('div').filter({ hasText: /^Select$/ }).nth(1).click();
    await expect(page.locator('.react-select__option').first()).toBeVisible({ timeout: 10000 });
    await page.locator('.react-select__option').first().click();
    await page.getByRole('button', { name: 'Assign' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // Navigate back to repair item after Assign to QC — the modal close triggers a page
    // reload which changes the chevron-right button count, causing nth(4) to hit the wrong
    // section (Edit Item). Navigating back ensures a known clean page state.
    await page.goto(repairItemUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // QC CHECKLIST — locate the chevron by the section title text, not by nth index.
    // This is resilient to page reloads that change the number of visible sections.
    const qcChevron = page.locator('div').filter({ hasText: /^QC Checklist$/ }).getByRole('button', { name: 'chevron-right' }).first();
    const qcChevronCount = await qcChevron.count();
    if (qcChevronCount > 0) {
      await qcChevron.click();
    } else {
      // Fallback: scroll down and try nth(4) if section label not matched
      await page.getByRole('button', { name: 'chevron-right' }).nth(4).click();
    }
    await page.waitForTimeout(1000);
    await page.locator('div').filter({ hasText: /^Select Control$/ }).nth(1).click();
    await expect(page.getByText('Drive QC', { exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByText('Drive QC', { exact: true }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('radio', { name: 'Yes' }).first().check();
    await page.getByRole('radio', { name: 'Yes' }).nth(1).check();
    await page.getByRole('radio', { name: 'Yes' }).nth(2).check();
    await page.getByRole('radio', { name: 'Yes' }).nth(3).check();
    await page.getByText('Status').nth(2).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Pass', { exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByText('Pass', { exact: true }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // Navigate back to repair item before Complete QC — Save can cause a partial reload
    // that removes the Change Status buttons from the DOM.
    await page.goto(repairItemUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // COMPLETE QC — iterate through every 'loading Change Status' button and click the one
    // that shows exactly 'Completed' in its menu (the QC section button).
    // The repair-level buttons show end-of-life options (Recycled/Scrapped etc.), not 'Completed'.
    {
      const csButtons = page.getByRole('button', { name: 'loading Change Status' });
      const total = await csButtons.count();
      for (let i = 0; i < total; i++) {
        await csButtons.nth(i).click();
        await page.waitForTimeout(500);
        const completedItem = page.getByRole('menuitem', { name: 'Completed', exact: true });
        if (await completedItem.isVisible().catch(() => false)) {
          await completedItem.click();
          await page.waitForTimeout(500);
          await page.getByRole('button', { name: 'Accept' }).click();
          await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
          await page.waitForTimeout(3000);
          break;
        }
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }

    // VALIDATION: item 231-642 status is now Completed
    await expect(page.getByText('Completed', { exact: true }).first()).toBeVisible({ timeout: 15000 });

    // Navigate back to the RMA overview page before Edit Quantity —
    // the Edit Quantity codegen selector targets div:nth-child(2) in the repair items list
    // on the RMA overview (repairDetailUrl), NOT the individual item detail (repairItemUrl).
    await page.goto(repairDetailUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // EDIT ITEM QUANTITY
    await page.locator('div:nth-child(2) > .sc-kdIgRK > .sc-la-DkbX > .align-right > .sc-APcvf > div:nth-child(5) > .action-item').click();
    await page.waitForTimeout(1000);
    await page.getByPlaceholder('Quantity').click();
    await page.getByPlaceholder('Quantity').fill('11');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Accept' }).first().click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // DOWNLOAD PDF
    // Use context().waitForEvent('page') instead of page.waitForEvent('popup'):
    // if the PDF opens in the same tab (navigating the main page), waitForEvent('popup')
    // never fires and the main page becomes "Target closed". context() captures both
    // new tabs and popups, using Promise.all so we don't miss the event.
    const [pdfPage] = await Promise.all([
      page.context().waitForEvent('page', { timeout: 30000 }),
      page.getByRole('button', { name: 'chevron-right' }).nth(3).click(),
    ]);
    await pdfPage.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await pdfPage.waitForTimeout(2000);
    await pdfPage.frameLocator('iframe').first().getByRole('button', { name: 'Download' }).click();
  });
});
