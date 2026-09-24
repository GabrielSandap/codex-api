import { t, locale } from './i18n.js';
export function renderUsage(limit, element) {
  element.hidden = !limit;
  if (!limit) { element.textContent = ''; return; }
  const title = limit.code === 'codex_quota_exhausted' ? t('Codex usage limit reached') : t('Codex temporarily rate limited');
  const reset = limit.resetsAt
    ? (Date.parse(limit.resetsAt) > Date.now()
      ? t('Reset reported by Codex: {date}.', { date: new Date(limit.resetsAt).toLocaleString(locale()) })
      : t('The reported reset time has passed. You can retry manually.'))
    : t('Codex did not provide a reset time. Check your account usage before retrying.');
  element.textContent = `${title}. ${t('Last observed request limit, shared by all keys on this account. Your keys remain valid.')} ${reset}`;
}
