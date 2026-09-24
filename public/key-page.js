import { renderUsage } from './usage.js';
import { t, locale } from './i18n.js';
export function setupKeyPage({ request, onTest, onRevoke }) {
  const $ = selector => document.querySelector(selector);
  let currentKey, selectedId, generation = 0, pending = false;
  const number = n => new Intl.NumberFormat(locale()).format(n);
  const datetime = value => value ? new Intl.DateTimeFormat(locale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : t("Jamais");
  const duration = ms => ms < 1000 ? `${ms} ms` : `${(ms / 1000).toLocaleString(locale(), { maximumFractionDigits: 1 })} s`;
  const routeId = () => location.hash.match(/^#key=([a-f0-9-]+)$/)?.[1];
  const resultLabel = status => status >= 200 && status < 300 ? t("Réussi") : status === 499 ? t("Annulé") : t("Échec");
  function draw(data) {
    currentKey = data.key;
    renderUsage(data.codex.usageLimit, $('#detail-usage'));
    const key = data.key, a = data.analytics;
    $('#key-title').textContent = key.name;
    $('#detail-prefix').textContent = `${key.prefix}••••`;
    $('#detail-status').textContent = { active: 'Active', revoked: t("Révoquée"), expired: t("Expirée") }[key.status];
    $('#detail-status').className = `badge ${key.status === 'active' ? '' : 'inactive'}`;
    $('#detail-test').disabled = key.status !== 'active';
    $('#detail-revoke').disabled = key.status === 'revoked';
    $('#detail-connection').textContent = data.codex.connected && data.codex.supported ? t("Compte Codex connecté · Version validée") : t(data.codex.message);
    $('#detail-last-call').textContent = key.lastUsedAt ? t('Dernier appel réussi : {date}', { date: datetime(key.lastUsedAt) }) : t("Aucun appel réussi pour cette clé.");
    $('#detail-running').textContent = t('{count} appel(s) en cours', { count: data.activeRequests });
    $('#stat-total').textContent = number(a?.total ?? 0);
    $('#stat-success').textContent = a?.total ? `${Math.round(a.succeeded / a.total * 100)} %` : '—';
    $('#stat-failed').textContent = `${number(a?.failed ?? 0)} / ${number(a?.cancelled ?? 0)}`;
    $('#stat-duration').textContent = a?.total ? duration(Math.round(a.durationMs / a.total)) : '—';
    $('#stat-tokens').textContent = a?.measuredUsage ? number(a.inputTokens + a.outputTokens) : '—';
    const historical = a?.historicalSuccesses ?? key.requests;
    $('#tracking-note').textContent = `${a ? t('Mesures depuis le {date}.', { date: datetime(a.since) }) : t("Les mesures détaillées commenceront au prochain appel.")} ${historical ? t('{count} appel(s) réussi(s) antérieur(s), sans détail de durée ni de tokens.', { count: number(historical) }) : ''} ${a?.measuredUsage ? t('Tokens disponibles pour {count} appel(s) sur {total}.', { count: a.measuredUsage, total: a.total }) : ''}`;
    const facts = [ [t("Créée le"), datetime(key.createdAt)], ['Expiration', key.expiresAt ? datetime(key.expiresAt) : t("Sans expiration")], [t("Permission"), t("Discussion uniquement")], [t("Succès depuis la création"), number(key.requests)], [t("Débit maximum"), t("10 appels / minute")], [t("Révoquée le"), key.revokedAt ? datetime(key.revokedAt) : t("Non révoquée")] ];
    $('#key-facts').replaceChildren();
    for (const [label, value] of facts) {
      const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = label; dd.textContent = value;
      $('#key-facts').append(dt, dd);
    }
    const days = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(); day.setUTCDate(day.getUTCDate() - 6 + i);
      const id = day.toISOString().slice(0, 10);
      return { id, total: a?.days[id]?.total ?? 0 };
    });
    const max = Math.max(1, ...days.map(day => day.total));
    $('#activity-chart').replaceChildren();
    for (const day of days) {
      const row = document.createElement('div'); row.className = 'activity-day';
      const label = document.createElement('span'); label.textContent = `${day.id.slice(8)}/${day.id.slice(5, 7)}`;
      const bar = document.createElement('meter'); bar.min = 0; bar.max = max; bar.value = day.total; bar.setAttribute('aria-label', t('{date} : {count} appels', { date: day.id, count: day.total }));
      const count = document.createElement('span'); count.textContent = number(day.total);
      row.append(label, bar, count); $('#activity-chart').append(row);
    }
    $('#request-rows').replaceChildren();
    for (const item of a?.recent ?? []) {
      const row = document.createElement('tr');
      const values = [datetime(item.at), item.route, `${item.cancelled ? t("Annulé") : item.errorCode === 'codex_quota_exhausted' ? t('Quota exhausted') : item.errorCode === 'codex_rate_limited' ? t('Codex rate limit') : resultLabel(item.status)} · ${item.status}`, duration(item.durationMs), item.tokens ? `${number(item.tokens.input)} / ${number(item.tokens.output)}` : t("Non rapportés")];
      values.forEach((text, index) => { const cell = document.createElement('td'); cell.textContent = text; if (index === 2) cell.className = item.status < 300 ? 'result-success' : 'result-failure'; row.append(cell); });
      $('#request-rows').append(row);
    }
    $('#no-requests').hidden = !!a?.recent.length;
    $('#detail-updated').textContent = t('Actualisé à {time}', { time: new Date().toLocaleTimeString(locale()) });
    $('#detail-error').hidden = true;
  }
  async function refresh() {
    const id = routeId();
    if (!id) return;
    const ticket = ++generation; pending = true;
    if (id !== selectedId) {
      selectedId = id; currentKey = null;
      renderUsage(null, $('#detail-usage'));
      $('#key-title').textContent = t("Chargement…");
      $('#detail-prefix').textContent = ''; $('#detail-status').textContent = '';
      $('#detail-test').disabled = true; $('#detail-revoke').disabled = true;
      for (const selector of ['#stat-total', '#stat-success', '#stat-failed', '#stat-duration', '#stat-tokens']) $(selector).textContent = '—';
      for (const selector of ['#detail-connection', '#detail-last-call', '#detail-running', '#tracking-note', '#detail-updated', '#key-facts', '#request-rows', '#activity-chart']) $(selector).replaceChildren();
      $('#no-requests').hidden = true;
    }
    try {
      const data = await request(`/admin/keys/${id}`);
      if (ticket === generation && id === routeId()) draw(data);
    } catch (error) {
      if (ticket !== generation || id !== routeId()) return;
      $('#detail-error').textContent = error.message; $('#detail-error').hidden = false;
      $('#detail-connection').textContent = t("Impossible d’actualiser le statut");
      $('#detail-last-call').textContent = t("Les données affichées peuvent être anciennes.");
      $('#detail-running').textContent = '';
      if (!currentKey) $('#key-title').textContent = t("Clé indisponible");
      $('#detail-test').disabled = true; $('#detail-revoke').disabled = true;
    } finally { if (ticket === generation) pending = false; }
  }
  function route() {
    const detail = !!routeId();
    $('#overview-page').hidden = detail; $('#key-page').hidden = !detail;
    if (detail) refresh(); else { generation++; pending = false; selectedId = null; }
  }
  $('#detail-refresh').onclick = refresh;
  $('#detail-test').onclick = () => { if (currentKey) onTest(); };
  $('#detail-revoke').onclick = () => { if (currentKey) onRevoke(currentKey); };
  window.addEventListener('hashchange', route);
  setInterval(() => { if (routeId() && !document.hidden && !pending && !document.querySelector('dialog[open]')) refresh(); }, 5000);
  route();
  return { refresh, route };
}
