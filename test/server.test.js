const test = require('node:test');
const assert = require('node:assert');
const server = require('../server');

let base;
test.before(() => new Promise((r) => server.listen(0, () => { base = `http://localhost:${server.address().port}`; r(); })));
test.after(() => server.close());

test('GET /api/health zwraca ok', async () => {
  const data = await (await fetch(`${base}/api/health`)).json();
  assert.strictEqual(data.status, 'ok');
});

test('POST /api/echo odsyła wiadomość', async () => {
  const res = await fetch(`${base}/api/echo`, { method: 'POST', body: JSON.stringify({ message: 'cześć' }) });
  assert.strictEqual((await res.json()).message, 'cześć');
});

test('POST /api/echo odrzuca pustą wiadomość', async () => {
  const res = await fetch(`${base}/api/echo`, { method: 'POST', body: JSON.stringify({ message: ' ' }) });
  assert.strictEqual(res.status, 400);
});

test('strona główna się ładuje', async () => {
  const res = await fetch(base);
  assert.strictEqual(res.status, 200);
  assert.match(await res.text(), /aitestbed\.pl/);
});

test('blokuje wyjście poza katalog public', async () => {
  const res = await fetch(`${base}/..%2fpackage.json`);
  assert.notStrictEqual(res.status, 200);
});
