import { translations } from './translations.js';
let language = 'en';
try { if (localStorage.getItem('codex-api-language') === 'fr') language = 'fr'; } catch {}
const french = new Map(Object.entries(translations).map(([fr, en]) => [en, fr]));
export const locale = () => language === 'fr' ? 'fr-FR' : 'en-US';
export function t(text, values = {}) {
  if (!text) return text;
  const translated = language === 'fr' ? (french.get(text) ?? text) : (translations[text] ?? text);
  return translated.replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(values, key) ? String(values[key]) : match);
}
const bindings = [];
// Capture only original static markup, before any key names, secrets or responses enter the DOM.
const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
while (walker.nextNode()) {
  const node = walker.currentNode;
  if (node.parentElement.closest('script, style, code, #interface-language')) continue;
  const source = node.textContent, trimmed = source.trim();
  if (french.has(trimmed)) bindings.push(() => {
    // Do not replace a test prompt the user has edited.
    if (node.parentElement?.tagName === 'TEXTAREA') {
      const field = node.parentElement;
      if (![trimmed, french.get(trimmed)].includes(field.value)) return;
      field.value = t(trimmed);
    }
    node.textContent = source.replace(trimmed, t(trimmed));
  });
}
for (const element of document.querySelectorAll('[aria-label], [title], [placeholder]')) {
  for (const attribute of ['aria-label', 'title', 'placeholder']) {
    const source = element.getAttribute(attribute);
    if (french.has(source)) bindings.push(() => element.setAttribute(attribute, t(source)));
  }
}
function applyLanguage() {
  document.documentElement.lang = language;
  for (const apply of bindings) apply();
  document.querySelector('#interface-language').value = language;
}
applyLanguage();
document.querySelector('#interface-language').addEventListener('change', event => {
  language = event.target.value === 'fr' ? 'fr' : 'en';
  try { localStorage.setItem('codex-api-language', language); } catch {}
  applyLanguage();
  window.dispatchEvent(new Event('languagechange'));
});
