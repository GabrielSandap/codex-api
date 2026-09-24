// Classify only CLI failure events. Never forward their raw messages or inspect model text.
export class CodexLimitError extends Error {
  constructor(code, resetsAt = null) {
    super(code === 'codex_quota_exhausted'
      ? 'Codex usage limit reached. Your API key remains valid. Wait for your account allowance to reset before retrying.'
      : 'Codex is temporarily rate limited. Wait before retrying.');
    this.code = code;
    this.resetsAt = resetsAt;
  }
}
function resetTime(value) {
  let milliseconds;
  if (typeof value === 'number' && Number.isFinite(value)) milliseconds = value * 1000;
  else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || milliseconds < Date.UTC(2020, 0, 1) || milliseconds > Date.UTC(2100, 0, 1)) return null;
  return new Date(milliseconds).toISOString();
}
export function classifyCodexFailure(events) {
  for (const event of [...events].reverse()) {
    if (!['turn.failed', 'error'].includes(event?.type)) continue;
    const detail = event.error && typeof event.error === 'object' ? event.error : event;
    const message = typeof detail.message === 'string' ? detail.message : '';
    // Some CLI versions serialize the provider error as JSON inside message.
    let embedded;
    try { embedded = JSON.parse(message); } catch {
      // HTTP transport errors may wrap a JSON provider body in a status message.
      const start = message.indexOf('{'), end = message.lastIndexOf('}');
      if (/^(?:unexpected status|http)\s+429\b/i.test(message) && start >= 0 && end > start) {
        try { embedded = JSON.parse(message.slice(start, end + 1)); } catch {}
      }
    }
    const provider = embedded?.error && typeof embedded.error === 'object' ? embedded.error : detail;
    const code = provider.code ?? provider.type;
    const text = typeof provider.message === 'string' ? provider.message : message;
    let kind;
    if (['usage_limit_reached', 'insufficient_quota', 'quota_exceeded'].includes(code)
        || /\byou(?:'|’)ve hit your usage limit\b/i.test(text)
        || /^usage limit (?:reached|exceeded)\b/i.test(text)) kind = 'codex_quota_exhausted';
    else if (code === 'rate_limit_exceeded' || /^rate limit (?:reached|exceeded)\b/i.test(text)) kind = 'codex_rate_limited';
    if (kind) return new CodexLimitError(kind, resetTime(provider.resets_at ?? provider.reset_at));
  }
  return null;
}
