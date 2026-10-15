const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { server } = require('./server');

before(() => new Promise(resolve => server.listen(0, resolve)));
after(() => new Promise(resolve => server.close(resolve)));

function post(body) {
  return new Promise((resolve, reject) => {
    const request = http.request({ port: server.address().port, path: '/api/service-inquiry', method: 'POST', headers: { 'Content-Type': 'application/json' } }, response => {
      let content = '';
      response.on('data', chunk => { content += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body: JSON.parse(content) }));
    });
    request.on('error', reject);
    request.end(JSON.stringify(body));
  });
}

const inquiry = {
  name: 'أحمد', phone: '+966512345678', details: 'المدينة: جدة\n\nعقود تشغيلية:\n- باقة كوادر',
  created_at_label: '14/10/2026, 15:00',
};

test('forwards a valid request and emails only after acceptance', async () => {
  const originalFetch = global.fetch;
  const originalEnv = [process.env.RESEND_API_KEY, process.env.NOTIFICATION_EMAIL, process.env.NOTIFICATION_FROM_EMAIL];
  const calls = [];
  process.env.RESEND_API_KEY = 'test-key';
  process.env.NOTIFICATION_EMAIL = 'office@example.com';
  process.env.NOTIFICATION_FROM_EMAIL = 'site@example.com';
  global.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return { ok: true, status: 201, json: async () => ({ success: true, code: 'REQ-1' }) };
  };
  try {
    const response = await post(inquiry);
    assert.equal(response.status, 201);
    assert.equal(response.body.code, 'REQ-1');
    assert.equal(calls[0].url, 'https://app.swarsafqa.com/api/public/customer-service-requests');
    assert.equal(calls[0].body.phone, inquiry.phone);
    assert.match(calls[0].body.created_at_label, /\d{2}\/\d{2}\/\d{4}/);
    assert.equal(calls[1].url, 'https://api.resend.com/emails');
    assert.match(calls[1].body.text, /باقة كوادر/);
  } finally {
    global.fetch = originalFetch;
    for (const [index, key] of ['RESEND_API_KEY', 'NOTIFICATION_EMAIL', 'NOTIFICATION_FROM_EMAIL'].entries()) {
      if (originalEnv[index] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[index];
    }
  }
});

test('does not email when the external request is rejected', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async url => {
    calls.push(url);
    return { ok: false, status: 422, json: async () => ({ success: false, message: 'طلب غير صالح' }) };
  };
  try {
    const response = await post(inquiry);
    assert.equal(response.status, 422);
    assert.equal(response.body.message, 'طلب غير صالح');
    assert.equal(calls.length, 1);
  } finally { global.fetch = originalFetch; }
});

test('rejects missing contact details before calling external services', async () => {
  const response = await post({ ...inquiry, phone: '123' });
  assert.equal(response.status, 422);
});
