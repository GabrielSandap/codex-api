import { renderUsage } from './usage.js';
import { t, locale } from './i18n.js';
import { getExamples, setupCommands } from './examples.js';
import { setupKeyPage } from './key-page.js';

const $ = selector => document.querySelector(selector);
let state, newToken = '', revokeId, deleteId, testController;
const date = value => value ? new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short' }).format(new Date(value)) : t("Jamais");
async function request(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', 'X-Codex-API': '1', ...options.headers } });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(t(data.error?.message) || t("Le service est indisponible.")), { status: response.status, code: data.error?.code, resetsAt: data.error?.resets_at });
  return data;
}
function notice(text = '') { $('#notice').textContent = text; $('#notice').hidden = !text; }
async function copy(value, button) {
  try {
    await navigator.clipboard.writeText(value);
    const original = button.textContent; button.textContent = t("Copié ✓");
    setTimeout(() => { button.textContent = original; }, 1800);
  } catch { notice(t("Copie automatique indisponible. Sélectionnez le texte pour le copier.")); }
}
function render() {
  renderUsage(state.codex.usageLimit, $('#usage-notice'));
  const ready = state.codex.connected && state.codex.supported;
  $('#connection-title').textContent = ready ? t("Compte Codex connecté") : t("Codex à configurer");
  $('#connection-detail').textContent = t(state.codex.message);
  $('#status-icon').textContent = ready ? '✓' : '!';
  $('#base-url').textContent = state.baseUrl;
  $('#create').disabled = false;
  $('#keys').replaceChildren();
  $('#empty').hidden = state.keys.length > 0;
  $('#key-count').textContent = state.keys.filter(key => key.status === 'active').length;
  if (!ready) notice(`${t(state.codex.message)} ${!state.codex.connected ? t("Commande à utiliser : codex login") : ''}`);
  for (const key of state.keys) {
    const row = document.createElement('div'); row.className = 'key-row';
    const info = document.createElement('a'); info.className = 'key-info key-link'; info.href = `#key=${key.id}`; info.setAttribute('aria-label', t('Statut et analyse de {name}', { name: key.name }));
    const name = document.createElement('span'); name.className = 'key-name'; name.textContent = key.name;
    const badge = document.createElement('span'); badge.className = `badge ${key.status === 'active' ? '' : 'inactive'}`;
    badge.textContent = { active: t("Discussion"), expired: t("Expirée"), revoked: t("Révoquée") }[key.status];
    const meta = document.createElement('div'); meta.className = 'key-meta';
    const prefix = document.createElement('code'); prefix.textContent = `${key.prefix}••••`;
    meta.append(prefix, document.createTextNode(` · ${key.expiresAt ? t('Expire le {date}', { date: date(key.expiresAt) }) : t('Sans expiration')} · ${t('{count} appel(s) réussi(s)', { count: key.requests })}`));
    info.append(name, badge, meta); row.append(info);
    const actions = document.createElement('div'); actions.className = 'key-actions';
    if (key.status === 'active') {
      const test = document.createElement('button'); test.textContent = t("Tester"); test.setAttribute('aria-label', t('Tester {name}', { name: key.name })); test.onclick = () => openTest('');
      const revoke = document.createElement('button'); revoke.textContent = t("Révoquer"); revoke.setAttribute('aria-label', t('Révoquer {name}', { name: key.name }));
      revoke.onclick = () => openRevoke(key);
      actions.append(test, revoke);
    }
    const remove = document.createElement('button'); remove.textContent = t('Supprimer');
    remove.setAttribute('aria-label', t('Supprimer {name}', { name: key.name }));
    remove.onclick = () => openDelete(key); actions.append(remove); row.append(actions);
    $('#keys').append(row);
  }
}
async function refresh() {
  try { state = await request('/admin/state'); notice(); render(); detailPage.refresh(); }
  catch (error) {
    const locked = error.status === 401;
    state = undefined;
    renderUsage(null, $('#usage-notice'));
    $('#create').disabled = true;
    $('#keys').replaceChildren();
    $('#empty').hidden = true;
    $('#key-count').textContent = '—';
    $('#base-url').textContent = '—';
    $('#status-icon').textContent = '!';
    $('#connection-title').textContent = locked ? t("Gestion verrouillée dans ce navigateur") : t("Service indisponible");
    $('#connection-detail').textContent = locked ? t("Vos clés sont conservées. Connectez ce navigateur pour les afficher.") : t("Vérifiez que Codex API est toujours lancé sur cet ordinateur.");
    notice(locked ? t("Ouvrez dans ce navigateur le lien privé de gestion affiché au lancement dans le terminal. Si ce lien a déjà été utilisé ou a expiré, arrêtez le service avec Ctrl+C, puis relancez npm start depuis le dossier du projet pour en obtenir un nouveau.") : error.message);
  }
}
function openDelete(key) { deleteId = key.id; $('#delete-detail').textContent = key.name; $('#delete-error').textContent = ''; $('#delete-dialog').showModal(); }
function openRevoke(key) { revokeId = key.id; $('#revoke-detail').textContent = key.name; $('#revoke-error').textContent = ''; $('#revoke-dialog').showModal(); }
for (const button of document.querySelectorAll('[data-close]')) button.onclick = () => button.closest('dialog').close();
function openCreate() { $('#create-form').reset(); $('#create-error').textContent = ''; $('#create-dialog').showModal(); }
$('#create').onclick = openCreate; $('#create-empty').onclick = openCreate;
$('#refresh').onclick = refresh;
$('#copy-address').onclick = () => { if (state) copy(state.baseUrl, $('#copy-address span')); };
$('#create-form').onsubmit = async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true;
  try {
    const result = await request('/admin/keys', { method: 'POST', body: JSON.stringify({ name: $('#key-name').value, expiresInDays: $('#expiry').value === 'never' ? null : Number($('#expiry').value) }) });
    newToken = result.token; $('#new-secret').value = newToken; $('#new-base').textContent = state.baseUrl;
    $('#secret-copy-status').textContent = '';
    $('#create-dialog').close(); $('#secret-dialog').showModal(); await refresh();
  } catch (error) { $('#create-error').textContent = error.message; }
  finally { button.disabled = false; }
};
$('#copy-secret').onclick = () => copy(newToken, $('#copy-secret'));
$('#secret-dialog').addEventListener('close', () => { newToken = ''; $('#new-secret').value = ''; });
function openTest(token) {
  $('#test-key').value = token; $('#test-result').hidden = true; $('#test-result').textContent = ''; $('#test-dialog').showModal();
}
$('#test-new').onclick = () => { const token = newToken; $('#secret-dialog').close(); openTest(token); };
$('#test-dialog').addEventListener('close', () => { testController?.abort(); $('#test-key').value = ''; });
$('#test-form').onsubmit = async event => {
  event.preventDefault(); const button = $('#test-submit'); button.disabled = true; button.textContent = t("Codex prépare sa réponse…");
  $('#test-result').hidden = false; $('#test-result').className = 'test-result'; $('#test-result').textContent = t("Demande envoyée à Codex…");
  testController = new AbortController();
  try {
    const result = await request('/v1/responses', { method: 'POST', signal: testController.signal, headers: { Authorization: `Bearer ${$('#test-key').value.trim()}` }, body: JSON.stringify({ model: 'codex', input: $('#test-prompt').value }) });
    $('#test-result').textContent = result.output_text; await refresh();
  } catch (error) { $('#test-result').textContent = error.name === 'AbortError' ? t("Demande annulée.") : error.message; $('#test-result').classList.add('error'); if (error.code?.startsWith('codex_')) await refresh(); }
  finally { button.disabled = false; button.textContent = t("Envoyer à Codex ↗"); testController = null; }
};
$('#confirm-revoke').onclick = async () => {
  const button = $('#confirm-revoke'); button.disabled = true;
  try { await request(`/admin/keys/${revokeId}`, { method: 'DELETE' }); $('#revoke-dialog').close(); await refresh(); }
  catch (error) { $('#revoke-error').textContent = error.message; }
  finally { button.disabled = false; }
};
$('#confirm-delete').onclick = async () => {
  const button = $('#confirm-delete'); button.disabled = true;
  const id = deleteId;
  try {
    await request(`/admin/keys/${id}/permanent`, { method: 'DELETE' });
    $('#delete-dialog').close();
    if (location.hash === `#key=${id}`) { history.replaceState(null, '', location.pathname); detailPage.route(); }
    await refresh();
  } catch (error) { $('#delete-error').textContent = error.message; }
  finally { button.disabled = false; }
};
async function init() {
  const token = new URLSearchParams(location.hash.slice(1)).get('setup');
  if (token) history.replaceState(null, '', location.pathname);
  if (token) {
    try { await request('/admin/session', { method: 'POST', body: JSON.stringify({ token }) }); }
    catch (error) { notice(error.message); }
  }
  await refresh();
}
const detailPage = setupKeyPage({ request, onTest: () => openTest(''), onRevoke: openRevoke, onDelete: openDelete });
init();
window.addEventListener('hashchange', () => { if (location.hash.startsWith('#setup=')) init(); else if (!location.hash) refresh(); });


function renderExample() {
  const example = getExamples(`${location.origin}/v1`)[$('#example-language').value];
  $('#example-file').textContent = example.file;
  $('#example-requirements').textContent = example.requirements;
  $('#example-code').textContent = example.code;
  $('#example-run').textContent = example.run;
  $('#example-result').textContent = example.result;
  $('#guide-copy-status').textContent = '';
}
function renderSetup() { $('#setup-code').textContent = setupCommands[$('#setup-platform').value]; }
async function copyGuide(selector) {
  try { await navigator.clipboard.writeText($(selector).textContent); $('#guide-copy-status').textContent = t("Copié dans le presse-papiers."); }
  catch { $('#guide-copy-status').textContent = t("Sélectionnez le code pour le copier manuellement."); }
}
$('#example-language').onchange = renderExample;
$('#setup-platform').onchange = renderSetup;
$('#copy-example').onclick = () => copyGuide('#example-code');
$('#copy-setup').onclick = () => copyGuide('#setup-code');
$('#guide-base-url').textContent = `${location.origin}/v1`;
renderExample(); renderSetup();

window.addEventListener('languagechange', () => { refresh(); renderExample(); renderSetup(); });

setInterval(() => { if (!document.hidden && !$('#overview-page').hidden && !document.querySelector('dialog[open]')) refresh(); }, 5000);
