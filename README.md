<p align="center"><img src="public/logo.svg" width="80" height="80" alt="Codex API logo"></p>
<h1 align="center">Codex API</h1>
<p align="center">Use your Codex CLI through a local API. Manage access keys in your browser.</p>
<p align="center">English · <a href="docs/README.fr.md">Français</a></p>

Your program sends text to Codex API on your computer. Codex CLI uses your existing ChatGPT login and returns an answer. No OpenAI Platform API key is needed.

## Choose your starting point

- **Using Codex or another coding agent?** Give it the installation request below.
- **Prefer doing it yourself?** Follow the three steps below.

### Install with your coding agent

Copy this into your agent:

```text
Help me install and use https://github.com/GabrielSandap/codex-api on this computer.
Read docs/agent-setup.md in that repository and follow its setup checklist.
Reuse compatible Node.js, Codex CLI and my existing ChatGPT login.
Help me create a local API key and run the simple JavaScript example with Node.js.
Keep credentials private and report any checks that could not be completed.
```

Your agent can check prerequisites and start the app. You complete any necessary ChatGPT login and create your key in the local browser interface. [See the agent setup guide](docs/agent-setup.md).

### Do it yourself

#### 1. Start the app

You need **Node.js 22+**, **Git**, and **Codex CLI stable 0.153.4+**, signed in with ChatGPT. Already installed? Keep them. [Missing something? Follow the prerequisite guide](docs/guide.md#install-and-start).

Run each command separately:

```sh
git clone https://github.com/GabrielSandap/codex-api.git
cd codex-api
npm run setup
```

The setup check does not install or change anything. Resolve any issues it reports, then run:

```sh
npm start
```

The management page opens in your browser. Keep this terminal running. No dependency installation or build step is needed. If you already cloned the repository, open its folder instead of cloning again.

#### 2. Create a key

Click **Create a key**, give it a name and copy the secret. It is shown only once. The interface is in English by default; choose **FR** in the header if preferred.

**Management locked?** Open the private link printed in the terminal. If it has expired or was already used in another browser, stop the service with `Ctrl+C` and start it again to get a new link. Your saved keys remain available.

#### 3. Run your first example

**Choose just one file.** JavaScript is the easiest option if you have no preference: Node.js is already installed for Codex API.

| Language | File | Run from the file’s folder | Requirements |
| --- | --- | --- | --- |
| JavaScript | [simple.mjs](examples/simple.mjs) | `node simple.mjs` | Node.js 22+, already used by the app |
| Python | [simple.py](examples/simple.py) | `python3 simple.py` (Windows: `py simple.py`) | Python 3 |
| PHP | [simple.php](examples/simple.php) | `php simple.php` | PHP 8+ with the cURL extension |
| cURL | [simple.sh](examples/simple.sh) | `sh simple.sh` | macOS/Linux shell or Windows Git Bash, cURL 7.76+ |

1. Open the file link, then click **Download raw file** on GitHub. Save it in a personal folder **outside this repository**.
2. Open it in your code editor, replace `PASTE_YOUR_LOCAL_KEY_HERE` with your key, and save. Optionally change the question (the `input` text for cURL).
3. Keep the app’s terminal running. Open **another terminal in your file’s folder**, then run the command in the table.

The answer appears in that terminal. cURL prints the full JSON response; the answer is in `output_text`. No additional packages are needed once the chosen runtime is available. JavaScript runs in Node.js, not in a web page. Each real request consumes your Codex allowance.

Keep your personal file private because it contains your key. If it fails, open **Help → Solve a problem** in the app. These short examples show standard runtime errors or the API error; they do not retry automatically.

For shared projects, use the environment-variable examples: [Python](examples/request.py), [JavaScript](examples/request.mjs), [PHP](examples/request.php), [cURL](examples/request.sh). [Configuration instructions](docs/guide.md#send-your-first-request).

## Connect your application

| Setting | Value |
| --- | --- |
| Base URL | `http://127.0.0.1:4317/v1` |
| API key | Your local key |
| Model | `codex` |
| Streaming | Off |

Your client must run on the same computer and support a custom base URL. These keys authenticate the local gateway; they do not work directly with OpenAI. For a shared application, store the key in an environment variable or secret manager. [API details and supported fields](docs/guide.md#api-subset).

## What to keep in mind

- Keep the computer **on, awake and connected to the Internet**, with the service running. You can close the browser. `Ctrl+C` in the service terminal stops the app.
- Requests go to OpenAI through Codex and consume your account allowance. Your ChatGPT account needs Codex access and access to `gpt-6-astra`, the model used by this preview.
- When recognized account quota is exhausted, requests return HTTP 429 and the interface shows the last observed limit. Your key stays valid. [Quota handling](docs/guide.md#when-codex-usage-runs-out).
- This preview supports **text requests only**. Future CLI versions must pass the offline compatibility check. Real use has been validated on macOS; Windows and Linux remain experimental.

Independent project, not affiliated with OpenAI. Preview release, not security-certified.

[Full guide and troubleshooting](docs/guide.md) · [Security](SECURITY.md) · [Validation](QA.md) · [Contributing](CONTRIBUTING.md) · [MIT license](LICENSE)
