<p align="center"><img src="public/logo.svg" width="80" height="80" alt="Codex API logo"></p>
<h1 align="center">Codex API</h1>
<p align="center">Local API keys for your Codex CLI. A small browser UI. Your own computer.</p>
<p align="center">English · <a href="docs/README.fr.md">Français</a></p>

Create, revoke and monitor local access keys. Your program sends a text request to the gateway, which runs Codex CLI using your existing ChatGPT login and returns the response.

**Preview, not a security-certified release.** Independently developed; not affiliated with or endorsed by OpenAI. No OpenAI Platform API key is needed. Requests use the connected account’s allowance. This does not provide unlimited access or guarantee eligibility for every account.

## Requirements

- **Node.js 22 or later**, npm and Git.
- **Codex CLI exactly 0.153.4**, signed in with ChatGPT.
- A ChatGPT account with Codex access **and access to `gpt-6-astra`** (the model used by this preview). A successful login alone does not prove model access or available quota.
- An Internet connection. The gateway runs locally, but Codex sends requests to OpenAI.
- Keep your computer **powered on and awake**, and the gateway running. Closing the terminal or putting the computer to sleep interrupts availability. The browser may be closed after setup.

**Validated on macOS.** Windows and Linux are experimental: Node-based portability is not evidence of tested native sandboxing, storage permissions or cancellation. See [validation notes](QA.md).

## Install and start

Install Node.js from [nodejs.org](https://nodejs.org/) and Git from [git-scm.com](https://git-scm.com/), then:

```sh
npm install --global @openai/codex@0.153.4
codex login
codex --version

git clone https://github.com/GabrielSandap/codex-api.git
cd codex-api
npm start
```

No runtime npm dependencies or build step are required for this project. The pinned CLI version is intentional: unsupported versions are rejected until their capabilities are validated. If you already use another Codex version, installing this one globally changes your CLI version; use a separate installation and `CODEX_API_CODEX_BIN` instead if needed.

The browser opens a **private management link**. Create a key and copy its secret immediately: it is shown only once. The interface starts in English; select **Français** in the header to switch. Your browser remembers the choice.

```sh
npm start -- --no-open       # print the link without opening a browser
npm start -- --port 4318     # use another local port
```

`Ctrl+C` stops the service. Keys survive restarts. The private link works once and expires after 10 minutes; the browser session lasts 8 hours. To change browsers or recover an expired session, stop and restart the service, then open its new private link in the intended browser. The plain address alone does not authenticate management access.

Optional local shortcut: run `npm link` from the project folder, then use `codex-api`. This project is **not published on npm**.

## Send your first request

1. Click **Create a key**, choose a name and expiration, and copy the secret.
2. In a separate terminal, securely set the environment variable for your client.

**macOS / Linux (Bash or Zsh)**

```sh
printf 'API key (hidden input): '
IFS= read -r -s CODEX_LOCAL_KEY
export CODEX_LOCAL_KEY
printf '\n'
```

**Windows PowerShell**

```powershell
$secret = Read-Host "API key" -AsSecureString
$env:CODEX_LOCAL_KEY = [System.Net.NetworkCredential]::new("", $secret).Password
Remove-Variable secret
```

3. From the repository directory, run one of the examples:

```sh
python3 examples/request.py   # Windows: py examples/request.py
node examples/request.mjs
php examples/request.php     # PHP 8+ and cURL extension
```

Or use [the cURL example](examples/request.sh). The **How does it work?** section in the app also provides copyable examples and setup instructions.

Never commit a real key, include it in browser JavaScript, or ship it inside a distributed app. Each user runs their own local gateway and creates their own keys. A key authenticates requests; it is not technically bound to a particular application.

## Connect an existing application

| Setting | Value |
| --- | --- |
| Base URL | `http://127.0.0.1:4317/v1` |
| API key | Your local `cxl_…` key |
| Model | `codex` |
| Streaming | Off |

The client must run on the same computer and support a custom base URL. A local key does **not** work directly on OpenAI servers. Container/VM `localhost` refers to that environment, not this gateway. Cross-origin browser requests are intentionally rejected; use a local backend or desktop program.

### API subset

All routes require `Authorization: Bearer YOUR_LOCAL_KEY`.

- `GET /v1/models`
- `POST /v1/responses`: `{ "model": "codex", "input": "Explain an API in one sentence." }`
- `POST /v1/chat/completions`: `{ "model": "codex", "messages": [{ "role": "user", "content": "Hello" }], "stream": false }`

For Responses, read `output_text`; for Chat Completions, read `choices[0].message.content`. Errors have the shape `{ "error": { "message": "..." } }`.

This is a **text-only subset**, not full OpenAI API compatibility. Unknown options, tools, files, images, streaming and arbitrary model overrides are rejected. Each request is independent. Chat messages are serialized into one CLI prompt, so native API role semantics are not reproduced. The `codex` alias uses a restricted `gpt-6-astra` profile.

## Key status and analytics

Click a key’s name to view its status, expiration, active requests, success rate, duration and reported tokens. The visible detail page refreshes every 5 seconds. The gateway retains the last 100 request events and 30 daily buckets, plus cumulative counters. Earlier requests without detailed metrics are labeled separately.

No prompts, responses, secrets or raw error messages are stored in these analytics. Tokens are recorded only when Codex reports them. They are not an account-wide quota meter or billing estimate; failed or cancelled requests can still consume allowance.

## Troubleshooting

| Symptom | What to do |
| --- | --- |
| Management locked | Open the private terminal link in this browser. Restart the service if the link is expired/used. Your keys remain saved. |
| Connection refused / timeout | Wake the computer, start the service, and check address and port. |
| CLI missing / wrong version | Check `codex --version`; install exactly `0.153.4`. Do not bypass the version check. |
| Account disconnected | Run `codex login` in your terminal and sign in with ChatGPT. |
| HTTP 401 | Check the key: missing, invalid, expired or revoked. |
| HTTP 400 | Send only supported text fields and disable streaming. |
| HTTP 429 | Wait and respect `Retry-After`: 10 requests/minute/key and 2 concurrent requests globally. |
| HTTP 502 | Check Internet, Codex login, model access and account allowance. The CLI may have failed or reached the 120-second timeout. |
| Port already in use | Stop the previous instance or choose another port. Only one instance can use the same key directory. |

The **Test** button makes a real Codex request and consumes account allowance.

## Security and data

The gateway binds only to `127.0.0.1`. Management authentication is separate from API keys, with a single-use bootstrap link, HttpOnly/SameSite cookie, server-side expiry and strict Host/Origin/Fetch Metadata checks. Keys are random 256-bit secrets; only SHA-256 hashes are stored. Revocation also cancels active requests.

Codex runs in an empty temporary directory with a restrictive tool profile, no shell intermediary and a minimal environment. Requests cannot enable commands, file tools, browser, plugins or MCP. This is not a defense against malware running as your OS user. Read [SECURITY.md](SECURITY.md) for the threat model and limits.

Local metadata is in `~/.codex-api/keys.json`. Do not share this directory. Codex maintains its own login and OpenAI applies its own data-processing rules.

| Variable | Purpose |
| --- | --- |
| `CODEX_API_DATA_DIR` | Alternate private storage directory, useful for isolated tests |
| `CODEX_API_CODEX_BIN` | Path to the validated Codex executable |

To update: stop the service, run `git pull --ff-only` in the repository, review release notes, then `npm start`. To uninstall, stop it, optionally run `npm unlink --global codex-api-local` if linked, and remove the clone. Removing `~/.codex-api` separately permanently deletes local key records and analytics; uninstalling the clone alone preserves them.

## Development

```sh
npm test
npm run check
npm run audit:tools
npm run audit:denial
```

HTTP tests use a simulated runner and do not consume quota. The two audits require the pinned Codex CLI and run against a local mock provider, without OpenAI authentication. The first inspects the actual tool manifest; the second injects an `apply_patch` call and verifies explicit rejection and no sentinel file creation.

See [CONTRIBUTING.md](CONTRIBUTING.md), [validation notes](QA.md) and [MIT license](LICENSE). Do not post credentials, management links, key files or private prompts in issues.
