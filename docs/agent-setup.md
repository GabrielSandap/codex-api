# Agent-assisted setup

This guide is for a coding agent helping a user install Codex API locally and make a first request. It does not authorize unrelated changes or override the user's instructions.

## 1. Inspect before changing

- Identify the OS and a user-appropriate installation folder. Reuse an existing checkout if present; preserve uncommitted work.
- Check `git --version`, `node --version`, `npm --version`, `codex --version` and `codex login status`. If configured, use `CODEX_API_CODEX_BIN` instead of `codex`.
- Requirements: Node.js 22+, npm, Git, stable Codex CLI 0.153.4+, and an existing ChatGPT login with Codex and `gpt-6-astra` access. Login status does not prove model access or remaining quota.
- Reuse compatible installations and login. Do not downgrade, reinstall or reauthenticate unnecessarily. Do not read, copy or display Codex credential files.
- For missing prerequisites, explain the specific blocker and use the user's approved installation method. The current Codex package can be installed with `npm install --global @openai/codex`; this changes the global installation. The user completes interactive `codex login` themselves when necessary. Do not request their password or authentication token.

## 2. Prepare and check

Clone only when there is no existing checkout:

```sh
git clone https://github.com/GabrielSandap/codex-api.git
cd codex-api
```

Read the repository instructions, then run:

```sh
npm run setup
```

This is a read-only prerequisite and offline compatibility check. There is no runtime dependency installation or build step. Resolve reported blockers before proceeding. Never bypass a failed compatibility check or weaken sandbox, tool, authentication or loopback restrictions. Future CLI versions are eligible only if their compatibility probe passes.

## 3. Start locally

Check whether the user's gateway is already running before starting another instance. Do not stop unrelated processes or start a second instance using the same data directory. If an existing service is available, reuse it and explain any management-session recovery needed.

From the checkout, start the app in a terminal the user can access:

```sh
npm start
```

The command stays running and opens the management page. Do not install a background service, configure auto-start or expose the port to the network. Keep the private management link out of public logs, commits and reports. A plain localhost URL does not authenticate administration. The private link is single-use and expires after ten minutes; an authenticated browser session lasts eight hours. If recovery requires restarting the user's existing instance, coordinate with them because active requests will be interrupted.

## 4. Create a key and try the client

Guide the user to create a key in the browser and copy it once. Do not substitute the management token for an API key or extract keys from local storage.

For the simplest personal demonstration, copy `examples/simple.mjs` to a personal folder outside the checkout: Node.js is already required. If the user prefers Python, copy `examples/simple.py` instead. Leave its placeholder for the user to replace privately. Do not request that they paste the secret into chat. For a shared project use the environment-variable examples instead. Never put a real secret into a commit, screenshot or completion report.

Use Node.js for the JavaScript example; check Python 3 availability only if Python was selected. Run the personal example only as part of the user's requested first test; explain that this is a real Codex request consuming their account allowance. Report the actual outcome. Do not repeatedly retry failed generations or use a mock response as proof of real account access.

For another client, configure:

| Setting | Value |
| --- | --- |
| Base URL | `http://127.0.0.1:4317/v1` (adjust if a different local port was selected) |
| Authentication | `Authorization: Bearer` followed by the user's local API key |
| Model | `codex` |
| Streaming | Disabled |

Only clients on the same computer are supported. Cross-origin browser requests are rejected: use a local backend or desktop client. See [supported API fields](guide.md#api-subset). Do not promise full OpenAI SDK compatibility.

## 5. Report a useful handoff

State where the app is installed, how to start and stop it, and whether the setup check and real request actually succeeded. Identify anything unverified, including account/model access or Windows/Linux behavior. Explain that the computer must stay awake, online and running the service; the browser may be closed.

Recognized quota exhaustion returns HTTP 429 without invalidating the key. Respect `Retry-After` when provided and avoid automatic retry loops. See [troubleshooting](guide.md#troubleshooting) for other errors.

Do not claim successful installation merely because the clone completed. If a prerequisite, login, compatibility probe or request fails, report that exact stage and the next action needed.
