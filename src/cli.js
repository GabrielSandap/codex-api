#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
if (Number(process.versions.node.split('.')[0]) < 22) {
  console.error('Node.js 22+ is required. Update Node.js; no installation was changed.');
  process.exit(1);
}
const { createGateway } = await import('./server.js');

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Codex API — local gateway\n\n  npm start\n  npm start -- --no-open\n  npm start -- --port 4318\n\nRequires Node.js 22+ and Codex CLI 0.153.4+ (offline compatibility check required), signed in with ChatGPT.\nCtrl+C stops the service.');
  process.exit(0);
}
let port = 4317, autoOpen = true;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--no-open') autoOpen = false;
  else if (args[i] === '--port') {
    port = Number(args[++i]);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) { console.error('Invalid port.'); process.exit(1); }
  } else { console.error('Unknown option. Use --help.'); process.exit(1); }
}
const dataDir = process.env.CODEX_API_DATA_DIR ? resolve(process.env.CODEX_API_DATA_DIR) : join(homedir(), '.codex-api');
try {
  const app = await createGateway({ dataDir, port });
  const manageUrl = `${app.origin}/#setup=${app.bootstrap}`;
  console.log(`\n  Codex API · local\n\n  API : ${app.origin}/v1\n  Management (private, single-use link):\n  ${manageUrl}\n\n  Ctrl+C to stop.\n`);
  if (autoOpen) {
    const [command, openArgs] = process.platform === 'darwin' ? ['open', [manageUrl]] : process.platform === 'win32' ? ['rundll32.exe', ['url.dll,FileProtocolHandler', manageUrl]] : ['xdg-open', [manageUrl]];
    const child = spawn(command, openArgs, { stdio: 'ignore', detached: true });
    child.on('error', () => console.log('  Open the management link in your browser.'));
    child.unref();
  }
  let stopping = false;
  const shutdown = async () => { if (stopping) return; stopping = true; await app.close(); process.exit(0); };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
} catch (error) {
  console.error(error.code === 'EADDRINUSE' ? 'This port is already in use. Stop the other instance or use --port 4318.' : error.message);
  process.exit(1);
}
