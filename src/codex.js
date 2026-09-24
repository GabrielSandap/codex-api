import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { supportsVersion, createCompatibilityCheck } from './compatibility.js';

const exec = promisify(execFile);
export const CODEX_BIN = process.env.CODEX_API_CODEX_BIN || 'codex';
// Do not forward API credentials or desktop-session/tool configuration to child processes.
export function codexEnvironment(source = process.env) {
  const env = {};
  for (const key of ['PATH', 'HOME', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'LANG', 'LC_ALL', 'CODEX_HOME']) {
    if (source[key]) env[key] = source[key];
  }
  env.NO_COLOR = '1';
  return env;
}

const checkCompatibility = createCompatibilityCheck(() => exec(process.execPath,
  [fileURLToPath(new URL('../scripts/audit-tools.mjs', import.meta.url)), '--probe'],
  { env: { ...codexEnvironment(), CODEX_API_CODEX_BIN: CODEX_BIN }, timeout: 20000, maxBuffer: 128 * 1024 }
));

export async function codexStatus() {
  try {
    const { stdout: version } = await exec(CODEX_BIN, ['--version'], { env: codexEnvironment(), timeout: 5000 });
    const result = await exec(CODEX_BIN, ['login', 'status'], { env: codexEnvironment(), timeout: 5000 }).catch(() => null);
    const connected = !!result && /Logged in using ChatGPT/i.test(`${result.stdout}\n${result.stderr}`);
    const minimumMet = supportsVersion(version.trim());
    const supported = minimumMet && await checkCompatibility(version.trim());
    return { installed: true, connected, supported, version: version.trim(), message: !supported ? (minimumMet ? "Codex compatibility check failed. Requests are blocked. Run npm run audit:denial for diagnostics, then restart the gateway after resolving the issue." : "Codex CLI 0.153.4 or newer (stable) is required. Update only if your installed version is older.") : connected ? "ChatGPT account connected" : "Sign in to Codex with your ChatGPT account from the terminal." };
  } catch {
    return { installed: false, connected: false, supported: false, version: null, message: "Codex CLI was not found. Install it, then sign in with your ChatGPT account." };
  }
}

export function buildArgs(workdir) {
  const disabled = ['shell_tool', 'unified_exec', 'view_image', 'apps', 'plugins', 'remote_plugin', 'hooks', 'multi_agent', 'multi_agent_v2', 'memories', 'chronicle', 'browser_use', 'browser_use_external', 'computer_use', 'in_app_browser', 'image_generation', 'code_mode', 'code_mode_host', 'code_mode_only', 'skill_search', 'skill_mcp_dependency_install', 'tool_suggest', 'workspace_dependencies', 'goals'];
  return ['exec', '--ignore-user-config', '--ignore-rules', '--ephemeral', '--skip-git-repo-check', '--sandbox', 'read-only', '--cd', workdir, '--json', '--color', 'never', '--model', 'gpt-6-astra',
    '-c', `model_catalog_json=${JSON.stringify(fileURLToPath(new URL('./models.json', import.meta.url)))}`,
    ...disabled.flatMap(name => ['-c', `features.${name}=false`]),
    '-c', 'features.skip_host_skill_discovery=true',
    '-c', 'project_doc_max_bytes=0', '-c', 'web_search="disabled"', '-c', 'approval_policy="never"',
    '-c', 'model_provider="openai"', '-c', 'forced_login_method="chatgpt"',
    '-c', 'shell_environment_policy.inherit="none"', '-c', 'mcp_servers={}',
    '-c', 'model_reasoning_effort="low"', '-'];
}

export async function runCodex(prompt, { signal, timeoutMs = 120000 } = {}) {
  const status = await codexStatus();
  if (!status.connected || !status.supported) throw new Error(status.message);
  if (signal?.aborted) throw new Error("Request cancelled.");
  const workdir = await mkdtemp(join(tmpdir(), 'codex-api-'));
  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(CODEX_BIN, buildArgs(workdir), { env: codexEnvironment(), cwd: workdir, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, detached: process.platform !== 'win32' });
      let stdout = '', failure = null, killTimer;
      const stop = reason => {
        failure ??= new Error(reason);
        const kill = sig => { try { if (process.platform === 'win32') child.kill(sig); else process.kill(-child.pid, sig); } catch {} };
        kill('SIGTERM');
        killTimer ??= setTimeout(() => kill('SIGKILL'), 1500);
        killTimer.unref();
      };
      const abort = () => stop("Request cancelled.");
      const timer = setTimeout(() => stop("Codex exceeded the two-minute timeout."), timeoutMs);
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
      child.stdout.on('data', chunk => {
        stdout += chunk;
        if (stdout.length > 2_000_000) stop("The Codex response is too large.");
      });
      child.stderr.resume(); // Never expose CLI logs: they can contain user context or credentials.
      child.stdin.on('error', () => {});
      child.once('error', () => { failure = new Error("Unable to start Codex CLI."); });
      child.once('close', code => {
        clearTimeout(timer); clearTimeout(killTimer);
        signal?.removeEventListener('abort', abort);
        if (failure) return reject(failure);
        const events = stdout.split('\n').flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
        if (code !== 0 || events.some(e => e.type === 'turn.failed' || e.type === 'error')) return reject(new Error("Codex did not complete the request. Check its login and your account limits in the terminal."));
        const text = events.filter(e => e.type === 'item.completed' && e.item?.type === 'agent_message').map(e => e.item.text).join('\n');
        if (!text) return reject(new Error("Codex returned no text."));
        const usage = events.findLast(e => e.type === 'turn.completed')?.usage;
        resolve({ text, usage });
      });
      child.stdin.end(prompt);
    });
  } finally { await rm(workdir, { recursive: true, force: true }); }
}
