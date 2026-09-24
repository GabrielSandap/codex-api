# Security policy and limitations

This is a local preview, not a certified product. It has not had an independent security audit. The profile was validated with CLI 0.153.4 on macOS; newer stable versions require passing the runtime offline probe. Native Windows and Linux isolation, permissions and process cancellation need dedicated validation.

## Reporting

Use this repository’s **Security → Report a vulnerability** private reporting channel for security issues. Do not include credentials, private management links, key databases or personal prompts. For an ordinary non-sensitive bug, use an issue. Do not disclose an exploit or secret in a public issue.

## Trust boundary

The gateway process, Codex CLI and your OS user account are trusted. Client keys cannot administer the service. Incoming requests and prompts are untrusted. Other browser origins must not control it.

The text profile removes access/execution tools from the manifest sent to the model; it does not rely only on a system prompt. A read-only sandbox provides another layer but does not by itself prevent reads. The model catalogue is pinned. Stable CLI versions 0.153.4+ must pass the runtime offline compatibility probe; a version number alone is not sufficient. Do not bypass this probe.

Local malware running as the same OS user can read process memory, change the program or access Codex credentials. This project does not protect a compromised computer. HTTP loopback is not encrypted; never tunnel or expose the gateway to a network. Windows storage protection depends on user-profile ACLs and is not yet validated.

## Controls

- Loopback-only binding with strict Host, Origin and Fetch Metadata validation; no CORS.
- Single-use 10-minute management bootstrap, 8-hour HttpOnly/SameSite session, required custom admin header.
- Random 256-bit keys, stored as SHA-256 hashes; constant-time comparisons; expiry and revocation.
- 64 KB request limit, 10 requests/minute/key, 2 concurrent requests, 120-second runtime and bounded output.
- One process per data directory, atomic key-file writes and restrictive POSIX permissions.
- No shell interpolation, prompt over stdin, empty temporary workspace, minimal child environment and ignored personal Codex configuration.
- No prompt/response/secret logging by the gateway. Codex and OpenAI have separate processing and retention rules.

## Before changing the CLI or model profile

1. Run HTTP and authentication tests.
2. Run `npm run audit:tools` against the intended CLI and catalogue.
3. Inspect the actual manifest for shell, patch, file, image, browser, plugin/MCP, agent and code-mode tools. Only the inert clarification tool is tolerated in this non-interactive mode.
4. Run `npm run audit:denial`, then additional disposable sentinel read/write probes and an authorized real text request.
5. Verify storage permissions, shutdown and cancellation on every supported OS.

Not covered: remote access, OS-user sharing, file/command execution, account-wide spending caps, native vault encryption, independent audit or universal OpenAI-client compatibility. Cancellation and rate limits do not guarantee zero spend. Availability of similar third-party projects is not evidence of contractual eligibility; users must follow their provider’s applicable terms.
