import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCodexFailure } from '../src/codex-errors.js';

test('quota message is recognized without exposing raw error contents or guessing a reset', () => {
  const error = classifyCodexFailure([{ type: 'turn.failed', error: { message: "You've hit your usage limit. secret-data; try again at 9 PM" } }]);
  assert.equal(error.code, 'codex_quota_exhausted');
  assert.equal(error.resetsAt, null);
  assert.ok(!error.message.includes('secret-data'));
});
test('structured quota and UTC reset are preserved; malformed dates are ignored', () => {
  const classify = error => classifyCodexFailure([{ type: 'turn.failed', error }]);
  assert.equal(classify({ code: 'usage_limit_reached', resets_at: 2000000000 }).resetsAt, '2033-05-18T03:33:20.000Z');
  assert.equal(classify({ code: 'insufficient_quota', resets_at: '2030-01-01T13:00:00+01:00' }).resetsAt, '2030-01-01T12:00:00.000Z');
  for (const resets_at of ['tomorrow', '2030-01-01T12:00:00', null, {}, 1e99]) assert.equal(classify({ code: 'quota_exceeded', resets_at }).resetsAt, null);
  assert.equal(classify({ message: 'unexpected status 429 Too Many Requests: {"error":{"type":"usage_limit_reached"}}' }).code, 'codex_quota_exhausted');
  assert.equal(classify({ message: JSON.stringify({ error: { type: 'usage_limit_reached', resets_at: 2000000000 } }) }).code, 'codex_quota_exhausted');
});
test('provider throttling is distinct; network errors and model text are not quota signals', () => {
  assert.equal(classifyCodexFailure([{ type: 'error', code: 'rate_limit_exceeded' }]).code, 'codex_rate_limited');
  assert.equal(classifyCodexFailure([{ type: 'turn.failed', error: { message: 'Network timeout' } }]), null);
  assert.equal(classifyCodexFailure([{ type: 'item.completed', item: { type: 'agent_message', text: "You've hit your usage limit." } }]), null);
  assert.equal(classifyCodexFailure([{ type: 'error', message: 'HTTP 429' }]), null);
});
