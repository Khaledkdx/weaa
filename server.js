const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT || 3000);
const reactDir = path.join(__dirname, 'site');
const buildDir = path.join(__dirname, 'build', 'web');
const rootDir = fs.existsSync(path.join(reactDir, 'index.html'))
  ? reactDir
  : fs.existsSync(path.join(buildDir, 'index.html')) ? buildDir : __dirname;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 32768) throw new Error('الطلب كبير جدًا.');
  }
  return JSON.parse(body);
}

async function sendInquiryNotification(inquiry) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFICATION_EMAIL;
  const from = process.env.NOTIFICATION_FROM_EMAIL;
  if (!key || !to || !from) {
    console.warn('Service inquiry email is not configured.');
    return false;
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'طلب خدمات لوجستية جديد - وعاء',
      text: [
        `تاريخ الطلب: ${inquiry.created_at_label}`,
        `الاسم: ${inquiry.name}`,
        `الجوال: ${inquiry.phone}`,
        `التفاصيل:\n${inquiry.details}`,
      ].join('\n\n'),
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  return true;
}

async function submitInquiry(request, response) {
  let inquiry;
  try { inquiry = await readJson(request); }
  catch { json(response, 400, { success: false, message: 'بيانات الطلب غير صالحة.' }); return; }
  if (!inquiry || typeof inquiry.name !== 'string' || !inquiry.name.trim() ||
      !/^\+9665\d{8}$/.test(inquiry.phone) || typeof inquiry.details !== 'string' || !inquiry.details.trim()) {
    json(response, 422, { success: false, message: 'أكمل الاسم والجوال والخدمة المطلوبة.' });
    return;
  }
  const payload = {
    service_slug: 'logistics-inquiry', service_title: 'طلب خدمات لوجستية',
    name: inquiry.name.trim().slice(0, 120), phone: inquiry.phone, email: '',
    details: inquiry.details.slice(0, 10000), status: 'طلب جديد',
    created_at_label: new Date().toLocaleString('en-GB', { timeZone: 'Asia/Riyadh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }),
  };
  try {
    const upstream = await fetch('https://app.swarsafqa.com/api/public/customer-service-requests', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(15000),
    });
    const result = await upstream.json().catch(() => null);
    if (!upstream.ok || result?.success === false) {
      json(response, upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502,
        { success: false, message: result?.message || 'تعذر إرسال الطلب إلى نظام الطلبات.' });
      return;
    }
    try { await sendInquiryNotification(payload); }
    catch (error) { console.error('Service inquiry email failed:', error); }
    json(response, 201, { success: true, code: result?.code || result?.request_code || null });
  } catch (error) {
    console.error('Service inquiry submission failed:', error);
    json(response, 502, { success: false, message: 'تعذر الاتصال بنظام الطلبات. حاول مرة أخرى.' });
  }
}

function safePath(urlPath) {
  const rawPath = urlPath.split('?')[0];
  const compatiblePath = rawPath.startsWith('/weaa/')
    ? rawPath.replace(/^\/weaa/, '')
    : rawPath;
  const decodedPath = decodeURIComponent(compatiblePath);
  const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  return path.join(rootDir, normalizedPath);
}

function serveFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    'Content-Type': mimeTypes[extension] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  if (extension === '.html') {
    const html = fs
      .readFileSync(filePath, 'utf8')
      .replace('<base href="/weaa/">', '<base href="/">')
      .replace('<base href="$FLUTTER_BASE_HREF">', '<base href="/">');
    response.end(html);
    return;
  }

  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer((request, response) => {
  const route = new URL(request.url || '/', 'http://localhost').pathname.replace(/^\/weaa(?=\/)/, '').replace(/\/+$/, '');
  if (route === '/join-us/company-sale-executive') {
    response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  if ((request.url || '').split('?')[0] === '/api/service-inquiry') {
    if (request.method !== 'POST') { json(response, 405, { success: false, message: 'الطريقة غير مدعومة.' }); return; }
    void submitInquiry(request, response);
    return;
  }
  const requestedPath = safePath(request.url || '/');
  const filePath = fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()
    ? requestedPath
    : path.join(rootDir, 'index.html');

  if (!fs.existsSync(filePath)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('WEAA build files were not found.');
    return;
  }

  serveFile(response, filePath);
});

if (require.main === module) {
  server.listen(port, () => {
    console.log(`WEAA static server running on port ${port}`);
    console.log(`Serving files from ${rootDir}`);
  });
}

module.exports = { server };
