import { chromium } from 'playwright';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const {
  SF_INSTANCE_URL,
  SF_COMPANY_ID,
  SF_MDF_ENTITY = 'cust_success_mdf',
} = process.env;

// Prefer UI-specific credentials (SAP IAS often uses a real email + different password
// than the OData API user). Fall back to the API credentials if not set.
const UI_USERNAME = process.env.SF_UI_USERNAME || process.env.SF_USERNAME;
const UI_PASSWORD = process.env.SF_UI_PASSWORD || process.env.SF_PASSWORD;

if (!SF_INSTANCE_URL || !UI_USERNAME || !UI_PASSWORD) {
  console.error('Missing SF_INSTANCE_URL / SF_UI_USERNAME / SF_UI_PASSWORD in backend/.env');
  process.exit(1);
}

const HEADLESS = process.env.HEADLESS === '1';
const SLOW_MO = Number(process.env.SLOW_MO ?? 350);
const SHOTS_DIR = path.resolve(__dirname, 'screenshots');
const STORAGE_STATE = path.resolve(__dirname, '.auth.json');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const FIELDS = [
  { id: 'externalCode', type: 'String', length: 128, required: true,  label: 'Unique ID' },
  { id: 'cust_Name',    type: 'String', length: 255, required: true,  label: 'Name' },
  { id: 'cust_Age',     type: 'Number', length: 3,   required: true,  label: 'Age' },
  { id: 'cust_Gender',  type: 'String', length: 50,  required: false, label: 'Gender' },
];

const log = (msg) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);

async function shot(page, name) {
  const file = path.join(SHOTS_DIR, `${Date.now()}_${name}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch(() => {});
  log(`  📸 ${path.basename(file)}`);
}

(async () => {
  log(`Launching Chromium (headless=${HEADLESS}, slowMo=${SLOW_MO}ms)`);
  const browser = await chromium.launch({ headless: HEADLESS, slowMo: SLOW_MO });
  const haveAuth = fs.existsSync(STORAGE_STATE);
  if (haveAuth) log(`Reusing saved auth state from ${path.basename(STORAGE_STATE)}`);
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: haveAuth ? STORAGE_STATE : undefined,
  });
  const page = await ctx.newPage();

  try {
    // ─── Step 1: Login ────────────────────────────────────────────────
    log(`Navigating to ${SF_INSTANCE_URL}`);
    await page.goto(SF_INSTANCE_URL, { waitUntil: 'domcontentloaded' });
    await shot(page, '01_login_page');

    // Manual login (corporate SSO + MFA can't be safely automated).
    // We wait for an SF-home URL pattern (/start, /sf/, /xi/, etc).
    console.log('\n' + '─'.repeat(70));
    console.log('  👤 PLEASE LOG IN MANUALLY in the open Chromium window.');
    console.log(`     Email:    ${UI_USERNAME}`);
    console.log('     (Use your real Azure AD password + MFA if prompted.)');
    console.log('  The script will continue automatically once SF home loads.');
    console.log('─'.repeat(70) + '\n');

    const homeUrlPatterns = [
      /successfactors\.com\/(sf|xi)\//i,
      /successfactors\.com\/.*\/start(\b|\?)/i,
      /successfactors\.com\/start(\b|\?)/i,
    ];
    const deadline = Date.now() + 10 * 60_000;
    let lastLoggedUrl = '';
    while (Date.now() < deadline) {
      let url = '';
      try { url = page.url(); } catch { /* page may be navigating */ }
      if (url && url !== lastLoggedUrl) {
        log(`  · URL now: ${url}`);
        lastLoggedUrl = url;
      }
      if (homeUrlPatterns.some((re) => re.test(url))) {
        await page.waitForTimeout(2_500);
        break;
      }
      await page.waitForTimeout(2_000);
    }
    if (Date.now() >= deadline) throw new Error('Manual login timed out after 10 minutes');
    log('Detected SF home URL — assuming logged in');

    // Persist auth so subsequent runs skip the login flow
    try {
      await ctx.storageState({ path: STORAGE_STATE });
      log(`Saved auth state → ${path.basename(STORAGE_STATE)}`);
    } catch (e) {
      log(`(Could not save auth state: ${e.message})`);
    }

    // Wait for SF home — look for the global action search bar (the magnifying-glass / search input in the header)
    // SF Fiori uses various selectors; try a few.
    await page.waitForTimeout(8_000);
    await shot(page, '05_after_login');

    // ─── Step 2: Action search → Configure Object Definitions ─────────
    log('Opening action search');
    // Common SF action search: clicking a search icon in the top bar then typing.
    // Try keyboard shortcut "?" or just locate the input.
    const searchOpeners = [
      'input[placeholder*="Search"]',
      'input[aria-label*="Search"]',
      'button[aria-label*="Search"]',
      '[data-qa="actionSearch"]',
    ];
    let searchInput = null;
    for (const sel of searchOpeners) {
      const loc = page.locator(sel).first();
      if (await loc.count()) {
        try {
          await loc.click({ timeout: 3_000 });
          // If it's a button, a search input should now be focused
          searchInput = page.locator('input[placeholder*="Search"], input[aria-label*="Search"], input:focus').first();
          if (await searchInput.count()) break;
        } catch { /* keep trying */ }
      }
    }
    if (!searchInput || !(await searchInput.count())) {
      throw new Error('Could not locate the SF action search input');
    }
    await searchInput.fill('Configure Object Definitions');
    await page.waitForTimeout(1_500);
    await shot(page, '04_action_search_typed');
    // Press Enter or click the first suggestion
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(3_000);
    await shot(page, '05_configure_object_definitions');

    // ─── Step 3: Create New → Object Definition ───────────────────────
    log('Clicking Create New');
    const createNewBtn = page.locator('button:has-text("Create New"), a:has-text("Create New")').first();
    await createNewBtn.click({ timeout: 15_000 });
    await page.waitForTimeout(500);
    const objDefOpt = page.locator('text="Object Definition"').first();
    await objDefOpt.click({ timeout: 10_000 });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(2_000);
    await shot(page, '06_new_object_definition_form');

    // ─── Step 4: Fill object properties ───────────────────────────────
    log('Filling object properties');
    // Field labels in SF: "Code", "Label", "Effective Dating", "API Visibility"
    await fillByLabel(page, 'Code', SF_MDF_ENTITY);
    await fillByLabel(page, 'Label', 'Success MDF Profile');
    await selectByLabel(page, 'Effective Dating', 'None').catch(() => log('  (Effective Dating select not found — may already default to None)'));
    await selectByLabel(page, 'API Visibility', 'Editable');
    await shot(page, '07_object_props_filled');

    // ─── Step 5: Add fields ────────────────────────────────────────────
    log('Adding fields (this is the most fragile part — expect to iterate)');
    for (const f of FIELDS) {
      log(`  + ${f.id}`);
      // Look for "Add" / "Insert New Row" / "+" near the Fields grid
      const addRow = page.locator(
        'button:has-text("Insert New Row"), button:has-text("Add"), button[aria-label*="Add"]'
      ).first();
      await addRow.click({ timeout: 10_000 }).catch(async () => {
        log('  (no Add button found — falling back to scroll & retry)');
        await page.mouse.wheel(0, 400);
        await addRow.click({ timeout: 5_000 });
      });
      await page.waitForTimeout(800);
      // The new row should appear; fill Name + Data Type + Length + Required + Label
      // SF often uses inline editing — selectors here are placeholders and almost certainly need adjusting after first run.
      // We capture screenshots so we can see what showed up.
      await shot(page, `08_field_${f.id}_row_opened`);
      // Attempt by Field Name / Data Type labels in the row dialog (if one opens)
      await fillByLabel(page, 'Field Name', f.id).catch(() => {});
      await selectByLabel(page, 'Data Type', f.type).catch(() => {});
      await fillByLabel(page, 'Maximum Length', String(f.length)).catch(() => {});
      if (f.required) await selectByLabel(page, 'Required', 'Yes').catch(() => {});
      await fillByLabel(page, 'Label', f.label).catch(() => {});
      // Confirm row
      const okBtn = page.locator('button:has-text("Done"), button:has-text("OK"), button:has-text("Save")').first();
      await okBtn.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(500);
    }
    await shot(page, '09_all_fields_added');

    // ─── Step 6: Save the object definition ───────────────────────────
    log('Saving object definition');
    const saveBtn = page.locator('button:has-text("Save")').first();
    await saveBtn.click({ timeout: 10_000 });
    await page.waitForTimeout(5_000);
    await shot(page, '10_after_save');

    // ─── Step 7: Refresh OData metadata ───────────────────────────────
    log('Action search → OData API Metadata Refresh and Export');
    // Re-open action search the same way
    for (const sel of searchOpeners) {
      const loc = page.locator(sel).first();
      if (await loc.count()) { await loc.click().catch(() => {}); break; }
    }
    const refreshSearch = page.locator('input[placeholder*="Search"], input[aria-label*="Search"], input:focus').first();
    await refreshSearch.fill('OData API Metadata Refresh and Export');
    await page.waitForTimeout(1_000);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(2_000);
    await shot(page, '11_metadata_refresh_page');

    const refreshBtn = page.locator('button:has-text("Refresh")').first();
    await refreshBtn.click({ timeout: 10_000 });
    await page.waitForTimeout(5_000);
    await shot(page, '12_metadata_refreshed');

    log('✅ Done — leaving the browser open for 30s so you can verify');
    await page.waitForTimeout(30_000);
  } catch (err) {
    log(`❌ ${err.message}`);
    await shot(page, '99_error');
    if (!HEADLESS) {
      log('Leaving the browser open for 60s so you can inspect…');
      await page.waitForTimeout(60_000);
    }
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

// ─── Helpers ──────────────────────────────────────────────────────────
async function fillByLabel(page, label, value) {
  // Try several common SF label-to-input associations
  const strategies = [
    () => page.getByLabel(label, { exact: false }).first(),
    () => page.locator(`label:has-text("${label}") + input`).first(),
    () => page.locator(`label:has-text("${label}") ~ input`).first(),
    () => page.locator(`xpath=//label[contains(., "${label}")]/following::input[1]`).first(),
  ];
  for (const get of strategies) {
    const el = get();
    if (await el.count().catch(() => 0)) {
      await el.fill(value, { timeout: 3_000 });
      return;
    }
  }
  throw new Error(`Could not find input for label "${label}"`);
}

async function selectByLabel(page, label, value) {
  const strategies = [
    () => page.getByLabel(label, { exact: false }).first(),
    () => page.locator(`label:has-text("${label}") + select`).first(),
    () => page.locator(`xpath=//label[contains(., "${label}")]/following::select[1]`).first(),
  ];
  for (const get of strategies) {
    const el = get();
    if (await el.count().catch(() => 0)) {
      const tag = await el.evaluate((n) => n.tagName.toLowerCase());
      if (tag === 'select') {
        await el.selectOption({ label: value });
      } else {
        await el.click();
        await page.locator(`text="${value}"`).first().click({ timeout: 3_000 });
      }
      return;
    }
  }
  throw new Error(`Could not find select for label "${label}"`);
}
