// Offline capability audit. Only tool names are printed, never request headers or credentials.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildArgs, codexEnvironment, CODEX_BIN } from '../src/codex.js';

const directory = await mkdtemp(join(tmpdir(), 'codex-api-audit-'));
let child, captured = false, unsafe = false;
let requests = 0, rejected = false;
const probe = process.argv.includes('--probe');
const canary = join(directory, 'forbidden-write.txt');
const server = createServer(async (req, res) => {
  let text = '';
  for await (const chunk of req) text += chunk;
  if (req.method === 'POST') {
    try {
      const payload = JSON.parse(text);
      console.log(JSON.stringify({ model: payload.model, tools: payload.tools?.map(tool => ({ type: tool.type, name: tool.name, tools: tool.tools?.map(t => t.name) })) ?? [] }, null, 2));
      // request_user_input is inert in codex exec: it cannot execute code or access files.
      if (!Array.isArray(payload.tools) || payload.tools.some(t => t.type !== 'function' || t.name !== 'request_user_input')) unsafe = true;
      captured = true;
      if (probe && req.url.endsWith('/responses')) {
        requests++;
        if (requests > 1) {
          const outputs = (payload.input || []).filter(i => i.type.endsWith('_call_output'));
          rejected = outputs.some(i => i.call_id === 'call_probe' && i.output === 'unsupported custom tool call: apply_patch');
        }
        const item = requests === 1
          ? { type: 'custom_tool_call', id: 'ctc_probe', call_id: 'call_probe', name: 'apply_patch', input: `*** Begin Patch\n*** Add File: ${canary}\n+unauthorized\n*** End Patch` }
          : { type: 'message', id: 'msg_probe', role: 'assistant', content: [{ type: 'output_text', text: 'Probe finished.', annotations: [] }] };
        const response = { id: `resp_probe_${requests}`, object: 'response', created_at: 0, status: 'completed', model: payload.model, output: [item], usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } };
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        const event = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
        event('response.created', { response: { ...response, status: 'in_progress', output: [] } });
        event('response.output_item.added', { output_index: 0, item });
        event('response.output_item.done', { output_index: 0, item });
        event('response.completed', { response });
        res.end(); return;
      }
    } catch { console.error('Unable to parse audit payload'); }
  }
  res.writeHead(400, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { message: 'Offline audit complete', type: 'invalid_request_error' } }));
});
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const args = buildArgs(directory);
  args.splice(args.length - 1, 0, '-c', 'model_provider="audit"', '-c', `model_providers.audit={name="audit",base_url="http://127.0.0.1:${server.address().port}/v1",wire_api="responses",requires_openai_auth=false}`);
  child = spawn(CODEX_BIN, args, { env: codexEnvironment(), cwd: directory, stdio: ['pipe', 'ignore', 'pipe'] });
  let diagnostics = '';
  child.stderr.on('data', chunk => { diagnostics += chunk; });
  child.stdin.end('Offline capability audit.');
  const timer = setTimeout(() => child.kill('SIGKILL'), 15000);
  await new Promise((resolve, reject) => { child.once('close', resolve); child.once('error', reject); });
  clearTimeout(timer);
  if (!captured || unsafe) { console.error('Capability audit failed: unexpected execution or access capability.'); console.error(diagnostics.slice(-2000)); process.exitCode = 1; }
  if (probe) {
    let written = false;
    try { await readFile(canary); written = true; } catch (e) { if (e.code !== 'ENOENT') throw e; }
    console.log(JSON.stringify({ injectedToolRequests: requests, rejected, unauthorizedFileCreated: written }));
    if (written || requests < 2 || !rejected) process.exitCode = 1;
  }
} finally { server.closeAllConnections(); server.close(); await rm(directory, { recursive: true, force: true }); }
