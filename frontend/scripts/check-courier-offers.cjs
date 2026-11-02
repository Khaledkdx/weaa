// All external requests are intercepted; this check never submits a real applicant.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const output = '/tmp/weaa-courier-offers';
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: 950 }, reducedMotion: 'reduce' });
      await context.addInitScript(theme => localStorage.setItem('weaa-theme', theme), theme);
      const saved = [], upstream = [], errors = [];
      await context.route('**/*.supabase.co/**', route => {
        const request = route.request(), url = new URL(request.url());
        let body = {};
        if (url.pathname.includes('/cms_content')) body = { content: {} };
        else if (request.method() === 'POST' && url.pathname.includes('/join_requests')) saved.push(request.postDataJSON());
        else if (url.pathname.includes('/storage/')) body = { Key: 'mock/file.pdf' };
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      });
      await context.route('https://app.swarsafqa.com/**', route => {
        upstream.push(route.request().method());
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, application_code: 'MOCK-ONLY' }) });
      });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://127.0.0.1:3007/join-us/courier-internal');
      await page.getByLabel(/الاسم \*/).fill('اختبار محلي فقط');
      await page.getByLabel(/رقم التواصل \*/).fill('0500000198');
      await page.getByLabel(/الجنسية \*/).fill('مصر');
      await page.getByLabel(/رقم الهوية \/ الإقامة/).fill('2000000000');
      await page.getByLabel(/عدد مرات نقل الكفالة/).fill('0');
      await page.getByLabel(/انتهاء الهوية/).fill('2030-12-31');
      await page.locator('.city-picker-menu summary').click();
      await page.getByLabel('جدة', { exact: true }).check();
      await page.getByLabel(/المهنة في الإقامة/).fill('سائق');
      await page.getByLabel(/نوع الرخصة/).selectOption('light');
      await page.getByLabel(/قابلية الانتقال/).selectOption('0');
      await page.getByLabel(/هل تملك سيارة/).selectOption('0');
      for (const label of ['الهوية / الإقامة', 'مستندات الإقامة', 'الرخصة', 'الصورة الشخصية', 'مستندات إضافية']) {
        await page.getByLabel(label, { exact: true }).setInputFiles({ name: 'mock.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test only') });
      }
      await page.getByRole('button', { name: 'التالي', exact: true }).click();
      await page.getByRole('heading', { name: /تفاصيل عروض العمل/ }).waitFor();
      assert.equal(upstream.length, 0);
      assert.equal(saved.length, 0);
      await page.getByRole('button', { name: 'إرسال الطلب', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'اختر عرضًا واحدًا على الأقل.' }).waitFor();
      await page.getByRole('checkbox', { name: /العرض الأول: العمل في جدة/ }).check();
      await page.getByRole('checkbox', { name: /العرض الثاني: العمل في الرياض/ }).check();
      const waiting = theme === 'dark';
      if (waiting) {
        await page.getByRole('checkbox', { name: 'لم يعجبني أي من العروض، في انتظار عرض آخر' }).check();
        assert.equal(await page.getByRole('checkbox', { name: /العرض الأول: العمل في جدة/ }).isChecked(), false);
        assert.equal(await page.getByRole('checkbox', { name: /العرض الثاني: العمل في الرياض/ }).isChecked(), false);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.locator('.courier-offers').screenshot({ path: `${output}/${width}-${theme}.png` });
      await page.getByRole('button', { name: 'رجوع', exact: true }).click();
      assert.equal(await page.getByLabel(/رقم الهوية \/ الإقامة/).inputValue(), '2000000000');
      await page.getByRole('button', { name: 'التالي', exact: true }).click();
      assert.equal(await page.getByRole('checkbox', { name: waiting ? 'لم يعجبني أي من العروض، في انتظار عرض آخر' : /العرض الأول: العمل في جدة/ }).isChecked(), true);
      await page.getByRole('button', { name: 'إرسال الطلب', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'وسيتم التواصل معك من فريق عمل وعاء' }).waitFor();
      assert.equal(upstream.length, 1);
      assert.equal(saved.length, 1);
      if (waiting) assert.equal(saved[0].fields['العروض المختارة'], 'لم يعجبني أي من العروض، في انتظار عرض آخر');
      else {
        assert.match(saved[0].fields['العروض المختارة'], /جدة/);
        assert.match(saved[0].fields['العروض المختارة'], /الرياض/);
        assert.match(saved[0].fields['تفاصيل العروض المختارة'], /4,500/);
      }
      assert.equal(Object.keys(saved[0].fields).filter(key => key.startsWith('request_document:')).length, 5);
      assert.deepEqual(errors, []);
      console.log(`PASS ${width} ${theme}`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
