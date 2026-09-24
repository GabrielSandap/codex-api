import { mkdirSync, openSync, writeFileSync, closeSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

// Prevent two gateway processes from racing on the same key store.
export function lockDirectory(directory) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const path = join(directory, 'service.lock');
  const take = () => {
    const fd = openSync(path, 'wx', 0o600);
    try { writeFileSync(fd, String(process.pid)); } finally { closeSync(fd); }
  };
  try { take(); } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const pid = Number(readFileSync(path, 'utf8'));
    if (!Number.isInteger(pid) || pid <= 0) throw new Error("Invalid service lock. Check that no instance is running before removing service.lock.");
    try { process.kill(pid, 0); throw new Error("Codex API is already using this key directory. Stop the other instance."); }
    catch (probe) {
      if (probe.code !== 'ESRCH') throw probe;
      unlinkSync(path); take();
    }
  }
  return () => { try { if (readFileSync(path, 'utf8') === String(process.pid)) unlinkSync(path); } catch {} };
}
