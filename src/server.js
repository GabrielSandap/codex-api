import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { KeyStore, secret, equal } from './store.js';
import { runCodex, codexStatus } from './codex.js';
import { lockDirectory } from './lock.js';

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };
const assets = new Map([
  ['/', ['text/html; charset=utf-8', readFileSync(new URL('../public/index.html', import.meta.url))]],
  ['/i18n.js', ['text/javascript; charset=utf-8', readFileSync(new URL('../public/i18n.js', import.meta.url))]],
  ['/translations.js', ['text/javascript; charset=utf-8', readFileSync(new URL('../public/translations.js', import.meta.url))]],
  ['/logo.svg', ['image/svg+xml', readFileSync(new URL('../public/logo.svg', import.meta.url))]],
  ['/app.js', ['text/javascript; charset=utf-8', readFileSync(new URL('../public/app.js', import.meta.url))]],
  ['/examples.js', ['text/javascript; charset=utf-8', readFileSync(new URL('../public/examples.js', import.meta.url))]],
  ['/key-page.js', ['text/javascript; charset=utf-8', readFileSync(new URL('../public/key-page.js', import.meta.url))]],
  ['/style.css', ['text/css; charset=utf-8', readFileSync(new URL('../public/style.css', import.meta.url))]]
]);

async function body(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) fail(415, "A JSON request body is required.");
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 65536) fail(413, "Request is too large (64 KB maximum).");
    chunks.push(chunk);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch { fail(400, "Invalid JSON."); }
}
const fields = (value, allowed) => {
  const invalid = Object.keys(value).filter(k => !allowed.includes(k));
  if (invalid.length) fail(400, "A parameter is not supported in this version.");
};

function parsePrompt(data, chat) {
  fields(data, chat ? ['model', 'messages', 'stream'] : ['model', 'input', 'stream']);
  if (data.model !== undefined && data.model !== 'codex') fail(400, "The available model is “codex”.");
  if (data.stream !== undefined && data.stream !== false) fail(400, "Streaming is not supported yet. Use stream: false.");
  if (!chat) {
    if (typeof data.input !== 'string' || !data.input.trim()) fail(400, "The input field must contain text.");
    return data.input;
  }
  if (!Array.isArray(data.messages) || !data.messages.length || data.messages.length > 100) fail(400, "Provide between 1 and 100 text messages.");
  for (const message of data.messages) {
    if (!message || typeof message !== 'object' || !['system', 'developer', 'user', 'assistant'].includes(message.role) || typeof message.content !== 'string') fail(400, "Only text messages are supported.");
    fields(message, ['role', 'content']);
  }
  // CLI exposes one prompt, not exact Chat Completions role semantics.
  return 'Reply to the last message in this conversation. Client-provided history:\n' + JSON.stringify(data.messages);
}

export async function createGateway({ dataDir, port = 4317, runner = runCodex, statusProvider = codexStatus } = {}) {
  const unlock = lockDirectory(dataDir);
  let store;
  try { store = new KeyStore(dataDir); } catch (error) { unlock(); throw error; }
  const bootstrap = secret(), session = secret();
  let bootstrapUsed = false, bootstrapDeadline = Date.now() + 10 * 60000, sessionDeadline = 0;
  let origin, host;
  const active = new Map(), rate = new Map();
  const startedAt = new Date().toISOString();
  let statusCache, statusAt = 0;
  const getStatus = async () => {
    if (!statusCache || Date.now() - statusAt > 5000) { statusCache = await statusProvider(); statusAt = Date.now(); }
    return statusCache;
  };
  const server = createServer(async (req, res) => {
    let trackedKey, trackedRoute, trackedUsage, trackedCancelled = false;
    const requestStarted = performance.now();
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const json = (code, value) => { if (!res.destroyed) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); } };
    try {
      if (req.headers.host !== host) fail(403, "Local address not allowed.");
      if (req.headers.origin && req.headers.origin !== origin) fail(403, "Origin not allowed.");
      if (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site'])) fail(403, "Cross-site access denied.");
      const url = new URL(req.url, origin);
      if (url.origin !== origin) fail(403, "Address not allowed.");
      const path = url.pathname;
      if (req.method === 'GET' && assets.has(path)) {
        const [type, content] = assets.get(path);
        res.writeHead(200, { 'Content-Type': type }); res.end(content); return;
      }
      if (path === '/admin/session' && req.method === 'POST') {
        if (req.headers['x-codex-api'] !== '1') fail(403, "Invalid management request.");
        const data = await body(req);
        if (bootstrapUsed || Date.now() > bootstrapDeadline || !equal(data.token, bootstrap)) fail(401, "Sign-in link expired or already used. Restart Codex API.");
        bootstrapUsed = true;
        sessionDeadline = Date.now() + 8 * 60 * 60000;
        res.setHeader('Set-Cookie', `codex_api_session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);
        json(200, { ok: true }); return;
      }
      if (path.startsWith('/admin/')) {
        const cookie = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('codex_api_session='))?.slice('codex_api_session='.length);
        if (!equal(cookie, session) || Date.now() >= sessionDeadline) fail(401, "Open the management link printed in the terminal.");
        if (req.headers['x-codex-api'] !== '1') fail(403, "Invalid management request.");
        if (path === '/admin/state' && req.method === 'GET') {
          json(200, { codex: await getStatus(), keys: store.list(), baseUrl: `${origin}/v1`, activeRequests: active.size, startedAt }); return;
        }
        if (path === '/admin/keys' && req.method === 'POST') {
          const data = await body(req); fields(data, ['name', 'expiresInDays']);
          try { json(201, store.create(data)); } catch (e) { fail(400, e.message); }
          return;
        }
        if (/^\/admin\/keys\/[a-f0-9-]+$/.test(path) && req.method === 'GET') {
          const id = path.split('/').at(-1);
          const detail = store.detail(id);
          if (!detail) fail(404, "Key not found.");
          json(200, { ...detail, codex: await getStatus(), activeRequests: [...active.values()].filter(item => item.keyId === id).length }); return;
        }
        if (/^\/admin\/keys\/[a-f0-9-]+$/.test(path) && req.method === 'DELETE') {
          const id = path.split('/').at(-1);
          if (!store.revoke(id)) fail(404, "Key not found.");
          for (const item of active.values()) if (item.keyId === id) item.controller.abort();
          json(200, { ok: true }); return;
        }
        fail(404, "Route not found.");
      }
      if (path.startsWith('/v1/')) {
        const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
        let key = store.authenticate(token);
        if (!key) fail(401, "Key missing, expired or revoked.");
        if (path === '/v1/models' && req.method === 'GET') {
          json(200, { object: 'list', data: [{ id: 'codex', object: 'model', owned_by: 'local-codex-cli' }] }); return;
        }
        if (req.method !== 'POST' || !['/v1/responses', '/v1/chat/completions'].includes(path)) fail(404, "Route not found.");
        trackedKey = key; trackedRoute = path;
        const data = await body(req);
        const prompt = parsePrompt(data, path.endsWith('/chat/completions'));
        key = store.authenticate(token); // A key may have been revoked while the body was arriving.
        if (!key) fail(401, "Key expired or revoked.");
        const now = Date.now();
        const recent = (rate.get(key.id) || []).filter(time => now - time < 60000);
        if (recent.length >= 10) { res.setHeader('Retry-After', '60'); fail(429, "This key is limited to 10 requests per minute."); }
        if (active.size >= 2) { res.setHeader('Retry-After', '5'); fail(429, "Two requests are already running. Try again shortly."); }
        recent.push(now); rate.set(key.id, recent);
        const id = randomUUID(), controller = new AbortController();
        let finish;
        const finished = new Promise(resolve => { finish = resolve; });
        active.set(id, { controller, keyId: key.id, finished });
        const cancel = () => { if (!res.writableEnded) controller.abort(); };
        res.on('close', cancel);
        const expiry = key.expiresAt ? setTimeout(() => controller.abort(), Math.min(2 ** 31 - 1, Date.parse(key.expiresAt) - now)) : null;
        try {
          const result = await runner(prompt, { signal: controller.signal });
          if (controller.signal.aborted || !store.authenticate(token)) fail(401, "Request cancelled: this key is no longer active.");
          trackedUsage = result.usage;
          const usage = result.usage ? { prompt_tokens: result.usage.input_tokens || 0, completion_tokens: result.usage.output_tokens || 0, total_tokens: (result.usage.input_tokens || 0) + (result.usage.output_tokens || 0) } : undefined;
          if (path.endsWith('/chat/completions')) json(200, { id: `chatcmpl-${id}`, object: 'chat.completion', created: Math.floor(now / 1000), model: 'codex', choices: [{ index: 0, message: { role: 'assistant', content: result.text }, finish_reason: 'stop' }], usage });
          else json(200, { id: `resp_${id}`, object: 'response', created_at: Math.floor(now / 1000), status: 'completed', model: 'codex', output: [{ id: `msg_${id}`, type: 'message', status: 'completed', role: 'assistant', content: [{ type: 'output_text', text: result.text, annotations: [] }] }], output_text: result.text, usage: result.usage ? { input_tokens: usage.prompt_tokens, output_tokens: usage.completion_tokens, total_tokens: usage.total_tokens } : undefined });
        } catch (error) {
          trackedCancelled = controller.signal.aborted;
          if (error instanceof HttpError) throw error;
          fail(502, error.message || "Codex is unavailable.");
        } finally { active.delete(id); clearTimeout(expiry); res.off('close', cancel); finish(); }
        return;
      }
      fail(404, "Route not found.");
    } catch (error) {
      json(error.status || 500, { error: { message: error.status ? error.message : 'Erreur interne du service local.', type: 'gateway_error' } });
    } finally {
      if (trackedKey) {
        try { store.record(trackedKey, { route: trackedRoute, status: res.destroyed && !res.writableEnded ? 499 : res.statusCode, durationMs: Math.round(performance.now() - requestStarted), usage: trackedUsage, cancelled: trackedCancelled }); }
        catch { console.error("Unable to save local metrics for this request."); }
      }
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.maxConnections = 32;
  try { await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); }); }
  catch (error) { unlock(); throw error; }
  host = `127.0.0.1:${server.address().port}`; origin = `http://${host}`;
  return {
    origin, bootstrap, store,
    close: async () => {
      const pending = [...active.values()];
      for (const item of pending) item.controller.abort();
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
      await Promise.allSettled(pending.map(item => item.finished));
      unlock();
    }
  };
}
