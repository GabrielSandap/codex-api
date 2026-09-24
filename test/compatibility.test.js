import test from 'node:test';
import assert from 'node:assert/strict';
import { supportsVersion, createCompatibilityCheck } from '../src/compatibility.js';

test('minimum version accepts newer stable releases but rejects older and ambiguous versions', () => {
  for (const value of ['codex-cli 0.153.4', 'codex-cli 0.153.5', 'codex-cli 0.154.0', 'codex-cli 1.0.0']) assert.equal(supportsVersion(value), true, value);
  for (const value of ['codex-cli 0.153.3', 'codex-cli 0.99.99', 'codex-cli 0.154.0-beta.1', 'codex-cli latest', '0.153.4']) assert.equal(supportsVersion(value), false, value);
});
test('a newer version must pass the audit, with one shared check per version', async () => {
  let calls = 0;
  const check = createCompatibilityCheck(async () => { calls++; });
  assert.equal(await check('codex-cli 0.153.3'), false);
  assert.equal(calls, 0);
  assert.deepEqual(await Promise.all([check('codex-cli 0.154.0'), check('codex-cli 0.154.0')]), [true, true]);
  assert.equal(calls, 1);
  assert.equal(await check('codex-cli 0.155.0'), true);
  assert.equal(calls, 2);
});
test('failed or unsupported CLI checks never authorize requests', async () => {
  const check = createCompatibilityCheck(async () => { throw new Error('Unexpected tool or unsupported CLI flags'); });
  assert.equal(await check('codex-cli 0.154.0'), false);
  assert.equal(await check('codex-cli 0.154.0'), false);
});
