// Read-only prerequisite check: never installs software or changes an existing login.
(async () => {
  const major = Number(process.versions.node.split('.')[0]);
  console.log(`Node.js ${process.versions.node}: ${major >= 22 ? 'OK, keeping existing installation' : 'update required (22+)'}`);
  if (major < 22) { console.error('Install Node.js 22+ from https://nodejs.org, then run npm run setup again.'); process.exitCode = 1; return; }
  const { codexStatus } = await import('../src/codex.js');
  console.log('Checking existing Codex CLI, login and offline compatibility (up to 20 seconds)…');
  const status = await codexStatus();
  if (!status.installed) {
    console.error('Codex CLI not found. Install it with: npm install --global @openai/codex');
    console.error('If already installed elsewhere, set CODEX_API_CODEX_BIN to its executable path.');
  } else {
    console.log(`${status.version}: ${status.supported ? 'compatible, keeping existing installation' : status.message}`);
    console.log(status.connected ? 'ChatGPT login: already connected, no login needed.' : 'ChatGPT login: run codex login (or your configured Codex executable).');
  }
  if (!status.installed || !status.supported || !status.connected) {
    console.error('Resolve the checks above, then run npm run setup again. Nothing was installed or replaced.');
    process.exitCode = 1;
  } else console.log('Ready. Run npm start. Model access, Internet connectivity and available quota are checked by real requests.');
})().catch(() => { console.error('Prerequisite check failed. No installation was changed.'); process.exitCode = 1; });
