import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request as httpRequest } from 'node:http';
import { createGateway } from '../src/server.js';
import { buildArgs, codexEnvironment } from '../src/codex.js';

async function setup(t, runner) {
  const dataDir = await mkdtemp(join(tmpdir(), 'codex-api-test-'));
  const app = await createGateway({ dataDir, port: 0, runner: runner || (async prompt => ({ text: `Réponse : ${prompt}`, usage: { input_tokens: 8, output_tokens: 3 } })), statusProvider: async () => ({ installed: true, connected: true, supported: true }) });
  t.after(async () => { await app.close(); await rm(dataDir, { recursive: true, force: true }); });
  const call = async (path, { method = 'GET', data, token, cookie, headers = {} } = {}) => {
    const response = await fetch(app.origin + path, { method, headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(cookie ? { Cookie: cookie } : {}), 'X-Codex-API': '1', ...headers }, body: data ? JSON.stringify(data) : undefined });
    return { response, status: response.status, data: await response.json() };
  };
  const session = await call('/admin/session', { method: 'POST', data: { token: app.bootstrap } });
  const cookie = session.response.headers.get('set-cookie').split(';')[0];
  const create = async (name = 'Test') => (await call('/admin/keys', { method: 'POST', cookie, data: { name, expiresInDays: 1 } })).data;
  return { ...app, dataDir, call, cookie, create };
}

test('une clé donne accès aux réponses et sa révocation bloque immédiatement', async t => {
  const app = await setup(t);
  const { token, key } = await app.create();
  assert.equal((await app.call('/v1/responses', { method: 'POST', data: { input: 'Bonjour' } })).status, 401);
  const reply = await app.call('/v1/responses', { method: 'POST', token, data: { input: 'Bonjour' } });
  assert.equal(reply.status, 200); assert.equal(reply.data.output_text, 'Réponse : Bonjour');
  const state = await app.call('/admin/state', { cookie: app.cookie });
  assert.equal(state.data.keys[0].requests, 1);
  assert.equal(JSON.stringify(state.data).includes(token), false);
  assert.equal('hash' in state.data.keys[0], false);
  assert.equal((await app.call(`/admin/keys/${key.id}`, { method: 'DELETE', cookie: app.cookie })).status, 200);
  assert.equal((await app.call('/v1/models', { token })).status, 401);
  const disk = await readFile(join(app.dataDir, 'keys.json'), 'utf8');
  assert.equal(disk.includes(token), false);
  assert.equal(JSON.parse(disk).keys[0].revokedAt !== null, true);
});

test('admin séparé, jeton initial à usage unique et protection contre autres sites', async t => {
  const app = await setup(t); const { token } = await app.create();
  assert.equal((await app.call('/admin/state', { token })).status, 401);
  assert.equal((await app.call('/admin/session', { method: 'POST', data: { token: app.bootstrap } })).status, 401);
  assert.equal((await app.call('/admin/state', { cookie: app.cookie, headers: { Origin: 'https://attacker.invalid' } })).status, 403);
  const forgedHostStatus = await new Promise(resolve => {
    const req = httpRequest(`${app.origin}/admin/state`, { headers: { Host: 'attacker.invalid', Cookie: app.cookie, 'X-Codex-API': '1' } }, res => { res.resume(); resolve(res.statusCode); });
    req.end();
  });
  assert.equal(forgedHostStatus, 403);
  assert.equal((await app.call('/admin/state', { cookie: app.cookie, headers: { 'X-Codex-API': '' } })).status, 403);
  assert.equal((await app.call('/v1/models', { token, headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await app.call('/admin/keys', { method: 'POST', cookie: app.cookie, data: { name: 'hack', permission: 'write' } })).status, 400);
});

test('validation des options : aucun paramètre client ne peut activer les outils', async t => {
  let runs = 0;
  const app = await setup(t, async () => { runs++; return { text: 'ok' }; }); const { token } = await app.create();
  for (const data of [{ input: 'Hello', tools: [] }, { input: 'Hello', cwd: '/' }, { input: 'Hello', stream: true }, { input: 'Hello', model: '--dangerously-bypass-approvals-and-sandbox' }, { input: '' }]) {
    assert.equal((await app.call('/v1/responses', { method: 'POST', token, data })).status, 400);
  }
  assert.equal(runs, 0);
  const reply = await app.call('/v1/chat/completions', { method: 'POST', token, data: { model: 'codex', messages: [{ role: 'user', content: 'Hello' }], stream: false } });
  assert.equal(reply.data.choices[0].message.content, 'ok'); assert.equal(runs, 1);
});

test('une clé expirée et les corps trop volumineux sont refusés', async t => {
  const app = await setup(t); const { token, key } = await app.create();
  assert.equal((await app.call('/v1/responses', { method: 'POST', token, data: { input: 'a'.repeat(66000) } })).status, 413);
  app.store.keys.find(k => k.id === key.id).expiresAt = new Date(Date.now() - 1000).toISOString();
  assert.equal((await app.call('/v1/models', { token })).status, 401);
});

test('révoquer une clé annule sa demande en cours', async t => {
  let entered; const started = new Promise(r => { entered = r; });
  let aborted = false;
  const app = await setup(t, async (_, { signal }) => {
    entered();
    return new Promise((resolve, reject) => signal.addEventListener('abort', () => { aborted = true; reject(new Error('Cancelled')); }, { once: true }));
  });
  const { token, key } = await app.create();
  const request = app.call('/v1/responses', { method: 'POST', token, data: { input: 'Hello' } });
  await started;
  const running = await app.call(`/admin/keys/${key.id}`, { cookie: app.cookie });
  assert.equal(running.data.activeRequests, 1);
  await app.call(`/admin/keys/${key.id}`, { method: 'DELETE', cookie: app.cookie });
  assert.equal((await request).status, 502); assert.equal(aborted, true);
  const detail = await app.call(`/admin/keys/${key.id}`, { cookie: app.cookie });
  assert.equal(detail.data.analytics.cancelled, 1);
  assert.equal(detail.data.analytics.failed, 0);
});

test('limitation du débit par clé', async t => {
  const app = await setup(t); const { token } = await app.create();
  for (let i = 0; i < 10; i++) assert.equal((await app.call('/v1/responses', { method: 'POST', token, data: { input: 'Hello' } })).status, 200);
  assert.equal((await app.call('/v1/responses', { method: 'POST', token, data: { input: 'Hello' } })).status, 429);
});

test('environnement minimal et profil CLI restrictif', () => {
  const env = codexEnvironment({ PATH: '/bin', HOME: '/home/example', OPENAI_API_KEY: 'not-forwarded', CODEX_THREAD_ID: 'not-forwarded', AWS_SECRET_ACCESS_KEY: 'not-forwarded' });
  assert.deepEqual(env, { PATH: '/bin', HOME: '/home/example', NO_COLOR: '1' });
  const args = buildArgs('/tmp/empty');
  assert.ok(args.includes('--ignore-user-config'));
  assert.ok(args.includes('features.shell_tool=false'));
  assert.ok(args.includes('features.plugins=false'));
  assert.ok(args.includes('features.hooks=false'));
  assert.ok(args.includes('features.code_mode_host=false'));
  assert.ok(args.includes('forced_login_method="chatgpt"'));
  assert.equal(args.includes('--dangerously-bypass-approvals-and-sandbox'), false);
});

test('les clés persistent et une seconde instance ne peut pas utiliser le même stockage', async t => {
  const app = await setup(t); const { token } = await app.create();
  await assert.rejects(createGateway({ dataDir: app.dataDir, port: 0 }), /already using this key directory/);
  await app.close();
  const restarted = await createGateway({ dataDir: app.dataDir, port: 0 });
  try {
    assert.ok(restarted.store.authenticate(token));
    const oldCookie = await fetch(restarted.origin + '/admin/state', { headers: { Cookie: app.cookie, 'X-Codex-API': '1' } });
    assert.equal(oldCookie.status, 401);
  } finally { await restarted.close(); }
});

test('la troisième requête simultanée est refusée sans appeler le moteur', async t => {
  let count = 0;
  const complete = [];
  const app = await setup(t, async () => { count++; return new Promise(resolve => complete.push(() => resolve({ text: 'ok' }))); });
  const { token } = await app.create();
  const one = app.call('/v1/responses', { method: 'POST', token, data: { input: 'one' } });
  const two = app.call('/v1/responses', { method: 'POST', token, data: { input: 'two' } });
  while (count < 2) await new Promise(resolve => setTimeout(resolve, 5));
  const three = await app.call('/v1/responses', { method: 'POST', token, data: { input: 'three' } });
  assert.equal(three.status, 429); assert.equal(count, 2);
  complete.forEach(resolve => resolve());
  assert.equal((await one).status, 200); assert.equal((await two).status, 200);
});

test('analyse par clé : succès, erreurs, tokens et absence de contenu privé', async t => {
  const app = await setup(t); const { token, key } = await app.create();
  assert.equal((await app.call(`/admin/keys/${key.id}`, { token })).status, 401);
  await app.call('/v1/responses', { method: 'POST', token, data: { input: 'PRIVATE_PROMPT_SENTINEL' } });
  await app.call('/v1/responses', { method: 'POST', token, data: { input: 'x', stream: true } });
  const detail = await app.call(`/admin/keys/${key.id}`, { cookie: app.cookie });
  assert.equal(detail.status, 200);
  assert.equal(detail.data.analytics.total, 2);
  assert.equal(detail.data.analytics.succeeded, 1);
  assert.equal(detail.data.analytics.failed, 1);
  assert.equal(detail.data.analytics.inputTokens, 8);
  assert.equal(detail.data.analytics.outputTokens, 3);
  assert.equal(detail.data.analytics.measuredUsage, 1);
  assert.equal(detail.data.analytics.recent[0].status, 400);
  assert.ok(detail.data.analytics.recent[0].durationMs >= 0);
  assert.equal(detail.data.key.requests, 1);
  assert.equal('hash' in detail.data.key, false);
  const disk = await readFile(join(app.dataDir, 'keys.json'), 'utf8');
  assert.equal(disk.includes('PRIVATE_PROMPT_SENTINEL'), false);
  assert.equal(disk.includes(token), false);
});

test('migration historique, rétention bornée et isolation entre clés', async t => {
  const app = await setup(t); const first = await app.create('Ancienne'); const second = await app.create('Nouvelle');
  const key = app.store.keys.find(k => k.id === first.key.id); key.requests = 3;
  assert.equal(app.store.detail(key.id).analytics, null);
  for (let i = 0; i < 105; i++) app.store.record(key, { route: '/v1/responses', status: 200, durationMs: 10 });
  const detail = app.store.detail(key.id);
  assert.equal(detail.analytics.total, 105);
  assert.equal(detail.analytics.historicalSuccesses, 3);
  assert.equal(detail.analytics.recent.length, 100);
  assert.equal(detail.analytics.measuredUsage, 0);
  assert.equal(detail.key.requests, 108);
  assert.equal(app.store.detail(second.key.id).analytics, null);
  await app.close();
  const restarted = await createGateway({ dataDir: app.dataDir, port: 0 });
  try { assert.equal(restarted.store.detail(key.id).analytics.total, 105); }
  finally { await restarted.close(); }
});

test('quota is a safe 429 shared across keys; success clears the notice without revoking keys', async t => {
  const { CodexLimitError } = await import('../src/codex-errors.js');
  let attempts = 0;
  const reset = new Date(Date.now() + 60000).toISOString();
  const app = await setup(t, async () => {
    if (++attempts === 1) throw new CodexLimitError('codex_quota_exhausted', reset);
    return { text: 'Recovered' };
  });
  const first = await app.create('First'), second = await app.create('Second');
  const reply = await app.call('/v1/responses', { method: 'POST', token: first.token, data: { input: 'private prompt' } });
  assert.equal(reply.status, 429);
  assert.equal(reply.data.error.code, 'codex_quota_exhausted');
  assert.equal(reply.data.error.resets_at, reset);
  assert.ok(Number(reply.response.headers.get('retry-after')) > 0);
  const detail = await app.call(`/admin/keys/${first.key.id}`, { cookie: app.cookie });
  assert.equal(detail.data.analytics.recent[0].errorCode, 'codex_quota_exhausted');
  const other = await app.call(`/admin/keys/${second.key.id}`, { cookie: app.cookie });
  assert.equal(other.data.codex.usageLimit.code, 'codex_quota_exhausted');
  assert.equal(other.data.key.status, 'active');
  assert.equal(attempts, 1); // No automatic retry by state polling.
  const success = await app.call('/v1/chat/completions', { method: 'POST', token: second.token, data: { messages: [{ role: 'user', content: 'Retry' }] } });
  assert.equal(success.status, 200);
  assert.equal((await app.call('/admin/state', { cookie: app.cookie })).data.codex.usageLimit, null);
  assert.ok(!(await readFile(join(app.dataDir, 'keys.json'), 'utf8')).includes('private prompt'));
});

test('quota without reset omits Retry-After and generic failures remain 502', async t => {
  const { CodexLimitError } = await import('../src/codex-errors.js');
  let attempts = 0;
  const app = await setup(t, async () => { if (++attempts === 1) throw new CodexLimitError('codex_quota_exhausted'); throw new Error('Connection failed'); });
  const { token } = await app.create();
  const call = () => app.call('/v1/responses', { method: 'POST', token, data: { input: 'Hello' } });
  const limit = await call();
  assert.equal(limit.data.error.resets_at, null);
  assert.equal(limit.response.headers.get('retry-after'), null);
  assert.equal((await call()).status, 502);
});

test('upstream rate limits and gateway throttling expose different codes', async t => {
  const { CodexLimitError } = await import('../src/codex-errors.js');
  const app = await setup(t, async () => { throw new CodexLimitError('codex_rate_limited'); });
  const { token } = await app.create();
  for (let i = 0; i < 10; i++) {
    const reply = await app.call('/v1/responses', { method: 'POST', token, data: { input: 'Hello' } });
    assert.equal(reply.status, 429);
    assert.equal(reply.data.error.code, 'codex_rate_limited');
  }
  const local = await app.call('/v1/responses', { method: 'POST', token, data: { input: 'Hello' } });
  assert.equal(local.status, 429);
  assert.equal(local.data.error.code, 'gateway_rate_limited');
});
