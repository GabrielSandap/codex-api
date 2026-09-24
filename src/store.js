import { mkdirSync, readFileSync, writeFileSync, renameSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export const digest = value => createHash('sha256').update(value).digest('hex');
export const secret = () => randomBytes(32).toString('base64url');
export const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b)));

export class KeyStore {
  constructor(directory) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    if (process.platform !== 'win32') chmodSync(directory, 0o700);
    this.file = join(directory, 'keys.json');
    try {
      const data = JSON.parse(readFileSync(this.file, 'utf8'));
      if (data.version !== 1 || !Array.isArray(data.keys)) throw new Error('Invalid key store');
      this.keys = data.keys;
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error("The key file is invalid. It has been preserved without changes.");
      this.keys = [];
    }
  }
  save() {
    const temp = `${this.file}.${randomUUID()}.tmp`;
    writeFileSync(temp, JSON.stringify({ version: 1, keys: this.keys }, null, 2), { mode: 0o600, flag: 'wx' });
    renameSync(temp, this.file);
  }
  public(key) {
    const { hash, analytics, ...metadata } = key;
    return { ...metadata, status: key.revokedAt ? 'revoked' : key.expiresAt && Date.parse(key.expiresAt) <= Date.now() ? 'expired' : 'active' };
  }
  list() { return this.keys.map(k => this.public(k)); }
  detail(id) {
    const key = this.keys.find(k => k.id === id);
    if (!key) return null;
    return { key: this.public(key), analytics: key.analytics ?? null };
  }
  record(key, { route, status, durationMs, usage, cancelled = false }) {
    const now = new Date().toISOString();
    const a = key.analytics ??= { since: now, historicalSuccesses: key.requests, total: 0, succeeded: 0, failed: 0, cancelled: 0, durationMs: 0, inputTokens: 0, outputTokens: 0, measuredUsage: 0, days: {}, recent: [] };
    cancelled ||= status === 499;
    const success = !cancelled && status >= 200 && status < 300;
    a.total++;
    if (success) { a.succeeded++; key.requests++; key.lastUsedAt = now; }
    else if (cancelled) a.cancelled++;
    else a.failed++;
    a.durationMs += durationMs;
    const tokens = usage && Number.isFinite(usage.input_tokens) && Number.isFinite(usage.output_tokens)
      ? { input: Math.max(0, usage.input_tokens), output: Math.max(0, usage.output_tokens) } : null;
    if (tokens) { a.measuredUsage++; a.inputTokens += tokens.input; a.outputTokens += tokens.output; }
    const day = now.slice(0, 10);
    const daily = a.days[day] ??= { total: 0, succeeded: 0, failed: 0, cancelled: 0 };
    daily.total++; daily[success ? 'succeeded' : cancelled ? 'cancelled' : 'failed']++;
    for (const date of Object.keys(a.days).sort().slice(0, -30)) delete a.days[date];
    a.recent.unshift({ at: now, route, status, cancelled, durationMs, tokens });
    a.recent = a.recent.slice(0, 100);
    this.save();
  }
  create({ name, expiresInDays = 30 }) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 60) throw new Error("Give this key a name between 1 and 60 characters.");
    if (![1, 7, 30, 90, null].includes(expiresInDays)) throw new Error("Invalid expiration.");
    if (this.keys.filter(k => this.public(k).status === 'active').length >= 50) throw new Error("The limit of 50 active keys has been reached.");
    const token = `cxl_${secret()}`;
    const key = { id: randomUUID(), name: name.trim(), prefix: token.slice(0, 11), hash: digest(token), permission: 'chat', createdAt: new Date().toISOString(), expiresAt: expiresInDays === null ? null : new Date(Date.now() + expiresInDays * 86400000).toISOString(), revokedAt: null, lastUsedAt: null, requests: 0 };
    this.keys.unshift(key);
    try { this.save(); } catch (error) { this.keys.shift(); throw error; }
    return { key: this.public(key), token };
  }
  authenticate(token) {
    if (typeof token !== 'string' || !/^cxl_[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const hash = digest(token);
    return this.keys.find(k => equal(k.hash, hash) && this.public(k).status === 'active') ?? null;
  }
  revoke(id) {
    const key = this.keys.find(k => k.id === id);
    if (!key) return false;
    key.revokedAt = new Date().toISOString();
    this.save();
    return true;
  }
}
