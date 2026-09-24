# Validation — September 24, 2026

## Current checks

- macOS, Node.js 22.13.0, Codex CLI 0.153.4.
- 11 HTTP/security tests pass: authentication, management separation, Host/Origin, expiry, revocation/cancellation, request validation, rate/concurrency limits, persistence/locking and per-key analytics/privacy/retention.
- JavaScript syntax checks pass.
- Offline CLI tool-manifest audit passes. Only the inert, non-interactive `request_user_input` clarification function remains; no command, file, patch, browser, plugin/MCP or agent tool.
- Offline injected `apply_patch` request explicitly rejected; no sentinel file created.
- English default, French switching and saved preference after reload checked in the browser on an isolated service with a simulated runner.
- Key creation dialog and status/analytics checked in both languages; user-defined key names remain unchanged.

## Earlier real-runtime checks

The restricted text profile completed a real request on the tested Mac. The create → copy → request → response → revoke flow was verified, followed by HTTP 401 for the revoked key. The local alias uses `gpt-6-astra`, accessible on the tested account. Other accounts are not guaranteed to have access.

Per-key analytics were checked separately with 3 simulated requests (2 successes, 1 failure), 67% success rate and 108 reported tokens. These are fixture results, not actual account usage. Existing keys do not acquire invented historical metrics.

## Limits

Native Windows/Linux Codex execution, sandboxing and storage permissions are not certified. The CI matrix checks the mocked gateway, not the complete Codex integration. No independent security audit has been performed. Real-request success does not establish compatibility with every account, subscription or third-party client.

## Existing prerequisites and minimum CLI version

- 14 tests pass, including minimum-version comparisons, rejecting pre-release/unknown versions, sharing concurrent compatibility probes and denying failed probes.
- `npm run setup` verified with installed Node.js 22.13.0, Codex CLI 0.153.4 and an existing ChatGPT login: no software reinstall or login prompt.
- Missing executable path verified: actionable instructions and non-zero exit, no installation performed.
- Runtime offline compatibility probe verified on CLI 0.153.4, including a completed text response and rejected write-tool injection. Newer versions are covered by version-policy unit tests, not claimed as real-CLI validation.
- No gateway was started and no real OpenAI request was made for this update.

## Quota failure handling

- Recognized CLI failure fixtures tested: usage-limit text, typed/embedded JSON quota errors, explicit reset timestamps, missing/malformed reset times, upstream throttling, network errors and model-text false positives.
- HTTP integration verifies 429 codes, optional Retry-After, shared account notice, preserved keys, sanitized history, no automatic retry and recovery after a successful generation.
- English home banner and French key-detail/history inspected with an isolated simulated runner. No real account quota was exhausted and no OpenAI request was used for these checks.
- Recognition is conservative; unknown future CLI error formats remain generic failures. Reset dates are not inferred from natural-language error strings.
