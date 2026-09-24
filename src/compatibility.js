export const MIN_CODEX_VERSION = '0.153.4';
export function supportsVersion(output) {
  const match = /^codex-cli (\d+)\.(\d+)\.(\d+)\s*$/.exec(output);
  if (!match) return false; // Pre-release and unknown version formats require explicit validation.
  const actual = match.slice(1).map(Number), minimum = [0, 153, 4];
  for (let i = 0; i < 3; i++) {
    if (actual[i] !== minimum[i]) return actual[i] > minimum[i];
  }
  return true;
}
// Share in-flight checks. A different CLI version triggers a fresh offline audit.
export function createCompatibilityCheck(audit) {
  const checks = new Map();
  return async version => {
    if (!supportsVersion(version)) return false;
    if (!checks.has(version)) checks.set(version, Promise.resolve().then(audit).then(() => true, () => false));
    return checks.get(version);
  };
}
