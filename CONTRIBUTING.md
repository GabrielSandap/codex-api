# Contributing

Use Node.js 22 or later. There are no runtime npm dependencies or build step.

1. Fork the repository and create a branch.
2. Make a focused change and run `npm test` and `npm run check`.
3. For CLI/profile/security changes, also run both offline audits with Codex CLI 0.153.4. Explain the actual validation environment.
4. Open a pull request with the problem, resulting behavior and validation evidence.

Browser assets live in `public/`. Restart the service to reload changed assets. Use an isolated `CODEX_API_DATA_DIR` for testing so you do not alter personal keys. Never commit that directory.

English is the default UI language. Add both English and French copy in `public/translations.js`; use `t()` for dynamic product strings. Never translate key names, user messages, secrets or model responses. Static markup is English. The browser language choice is stored locally.

Preserve loopback-only access and the separation between management sessions and API keys. Do not add arbitrary CLI arguments, tools, remote binding or provider credentials without explicit threat-model work.

Do not post real API keys, bootstrap links, cookies, account identifiers or prompt contents in issues or pull requests. Report vulnerabilities privately as described in SECURITY.md.
