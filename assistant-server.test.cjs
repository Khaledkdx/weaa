const { test } = require('node:test');
const assert = require('node:assert/strict');
const { audioBytes, handleAssistant } = require('./assistant-server.cjs');
test('assembles split SSE audio into a 24kHz mono WAV', async () => {
  const pcm = Buffer.from([1, 0, 2, 0]);
  const wire = `data: ${JSON.stringify({ choices: [{ delta: { audio: { data: pcm.toString('base64') } } }] })}\n\ndata: [DONE]\n\n`;
  const result = await audioBytes({ body: (async function* () { yield Buffer.from(wire.slice(0, 21)); yield Buffer.from(wire.slice(21)); })() });
  assert.equal(result.toString('ascii', 0, 4), 'RIFF');
  assert.equal(result.readUInt32LE(24), 24000);
  assert.deepEqual(result.subarray(44), pcm);
});
test('rejects empty and failed audio streams', async () => {
  await assert.rejects(audioBytes({ body: (async function* () { yield Buffer.from('data: [DONE]\n'); })() }));
  await assert.rejects(audioBytes({ body: (async function* () { yield Buffer.from('data: {"error":{"message":"failure"}}\n'); })() }));
});
test('rejects cross-origin access and non-JSON before calling providers', async () => {
  let status;
  const res = { writeHead: n => { status = n; }, end() {} };
  await handleAssistant({ method: 'POST', headers: { origin: 'https://evil.test', host: 'weaa-sa.com' } }, res, '/api/assistant');
  assert.equal(status, 403);
  await handleAssistant({ method: 'POST', headers: {} }, res, '/api/assistant');
  assert.equal(status, 415);
});
test('transcribes audio as data and never logs or returns the provider key', async () => {
  const { Readable } = require('node:stream');
  const original = global.fetch, key = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = 'test-secret';
  let payload, output, status;
  global.fetch = async (_url, options) => { payload = JSON.parse(options.body); return new Response(JSON.stringify({ choices: [{ message: { content: 'أبي مناديب الداخل' } }] })); };
  try {
    const request = Readable.from([Buffer.from(JSON.stringify({ format: 'webm', data: Buffer.alloc(100).toString('base64') }))]);
    request.method = 'POST'; request.headers = { 'content-type': 'application/json' }; request.socket = { remoteAddress: 'test' };
    await handleAssistant(request, { writeHead: s => { status = s; }, end: data => { output = data; } }, '/api/assistant/transcribe');
    assert.equal(status, 200); assert.equal(JSON.parse(output).text, 'أبي مناديب الداخل');
    assert.equal(payload.messages[1].content[1].input_audio.format, 'webm');
    assert.equal(output.includes('test-secret'), false);
  } finally { global.fetch = original; if (key === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = key; }
});
test('extracts the named fields off a sentence and drops fields that were not asked for', async () => {
  const { Readable } = require('node:stream');
  const original = global.fetch, key = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = 'test-secret';
  let payload, output, status;
  global.fetch = async (_url, options) => { payload = JSON.parse(options.body); return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ values: { 'الاسم': 'خالد محمد', 'رقم الجوال': '0512345678', 'غريب': 'x' } }) } }] })); };
  try {
    const request = Readable.from([Buffer.from(JSON.stringify({ said: 'اسمي خالد محمد ورقمي 0512345678', fields: [{ label: 'الاسم', kind: 'text' }, { label: 'رقم الجوال', kind: 'tel' }] }))]);
    request.method = 'POST'; request.headers = { 'content-type': 'application/json' }; request.socket = { remoteAddress: 'test-extract' };
    await handleAssistant(request, { writeHead: s => { status = s; }, end: data => { output = data; } }, '/api/assistant/extract');
    assert.equal(status, 200);
    assert.deepEqual(JSON.parse(output).values, { 'الاسم': 'خالد محمد', 'رقم الجوال': '0512345678' });
    assert.equal(payload.response_format.type, 'json_object');
    assert.equal(output.includes('test-secret'), false);
  } finally { global.fetch = original; if (key === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = key; }
});
