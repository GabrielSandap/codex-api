# Codex API

[English](guide.md) · Français

Projet indépendant, non affilié à OpenAI. Interface en anglais par défaut ; sélectionnez **Français** dans l’en-tête. Le choix est conservé dans votre navigateur.

## Installer depuis GitHub

Vérifiez d’abord les outils et la connexion existants :

```sh
node --version
codex --version
codex login status
```

Conservez Node.js **22+**, Codex stable **0.153.4+** et la connexion ChatGPT déjà active. Ne réinstallez pas et ne rétrogradez pas les outils compatibles.

- Node absent ou trop ancien : installez/mettez à jour Node.js depuis https://nodejs.org/.
- Codex absent ou trop ancien : `npm install --global @openai/codex` installe la version actuelle. Cette mise à jour globale reste une action explicite de votre part.
- Codex hors du PATH : configurez `CODEX_API_CODEX_BIN` avec son chemin.
- Compte non connecté avec ChatGPT : `codex login`, uniquement si nécessaire.
- Git doit aussi être installé pour cloner le dépôt.

Puis, une commande par ligne :

```sh
git clone https://github.com/GabrielSandap/codex-api.git
cd codex-api
npm run setup
npm start
```

`npm run setup` détecte les prérequis, la connexion existante et la compatibilité. Il ne modifie aucune installation et ne déclenche pas de connexion. Corrigez les points signalés avant de démarrer.

Les versions stables ≥ 0.153.4 sont acceptées seulement après un contrôle hors ligne du manifeste des outils, du rejet d’une tentative d’écriture et du retour d’une réponse texte. Un échec bloque les appels ; redémarrez après correction. Cela ne garantit pas toutes les versions futures. Le modèle `gpt-6-astra` doit rester accessible avec votre compte.

Exemples prêts à lancer : [Python](../examples/request.py), [JavaScript](../examples/request.mjs), [PHP](../examples/request.php), [cURL](../examples/request.sh). Définissez `CODEX_LOCAL_KEY` selon les instructions dans l’application avant de les lancer.


Une interface locale pour créer des clés d’accès à **Codex CLI connecté à votre compte ChatGPT**. Le service tourne sur votre ordinateur ; le navigateur sert uniquement à le gérer.

Prototype 0.1 : créer une clé → la copier dans une application → envoyer du texte à Codex. Aucune clé OpenAI Platform n’est demandée. Les demandes consomment les limites du compte connecté ; ce projet ne promet ni accès illimité ni gratuité universelle.

## Démarrer

Prérequis : **Node.js 22+**, **Codex CLI stable 0.153.4+**, compte ChatGPT avec accès à Codex et au modèle utilisé. Un contrôle de compatibilité hors ligne est obligatoire avant d’autoriser les demandes.

Depuis le dossier du projet :

```sh
npm run setup
npm start
```

Aucune dépendance npm d’exécution à installer. La page de gestion s’ouvre automatiquement. `Ctrl+C` arrête le service et annule les demandes en cours. Gardez l’ordinateur éveillé et connecté.

```sh
npm start -- --no-open
npm start -- --port 4318
```

Le lien privé affiché au lancement sert à ouvrir une session d’administration. Il expire après 10 minutes et ne fonctionne qu’une fois. La session dure 8 heures. Pour changer de navigateur ou récupérer une session perdue, arrêtez puis relancez le service. Vos clés sont conservées.

Pour une commande courte après installation locale du projet : `npm link`, puis `codex-api`. Le paquet n’est pas publié sur npm.

## Brancher une application

Dans la page locale, créez et nommez une clé pour authentifier vos appels à l’API. Une clé n’est pas techniquement liée à une application. Le secret n’est affiché qu’une fois.

| Paramètre | Valeur par défaut |
| --- | --- |
| Adresse de base | `http://127.0.0.1:4317/v1` |
| Clé API | La clé commençant par `cxl_` |
| Modèle | `codex` |
| Streaming | Désactivé |

Les clients doivent permettre de changer l’adresse de base. Une clé de cette application n’est **pas** une clé OpenAI Platform et ne fonctionne pas directement sur les serveurs OpenAI.

### Exemple JavaScript (Node.js)

```js
const response = await fetch('http://127.0.0.1:4317/v1/responses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.CODEX_LOCAL_KEY}`,
  },
  body: JSON.stringify({ model: 'codex', input: 'Explique les closures en trois phrases.' }),
});
const data = await response.json();
if (!response.ok) throw new Error(data.error.message);
console.log(data.output_text);
```

Pour un projet partagé, utilisez le gestionnaire de secrets de votre application ou une variable d’environnement. Le petit exemple personnel avec une clé dans le fichier doit rester privé.

### Routes

- `GET /v1/models` : modèle local disponible.
- `POST /v1/responses` : `{ "model": "codex", "input": "Votre message" }`.
- `POST /v1/chat/completions` : `{ "model": "codex", "messages": [{ "role": "user", "content": "Bonjour" }], "stream": false }`.

La compatibilité est un **sous-ensemble texte**, pas une implémentation complète de l’API OpenAI. Les paramètres inconnus, outils, fichiers, images, streaming et choix arbitraires de modèle sont refusés. L’historique Chat Completions est sérialisé dans un prompt CLI ; la hiérarchie des rôles n’est pas identique à celle d’une API native. Chaque appel est indépendant. L’alias `codex` utilise actuellement `gpt-6-astra` avec un profil texte restreint.

## Protections du prototype

### Suivi d’une clé

Cliquez sur le nom d’une clé pour ouvrir sa page **Statut et analyse** : état, expiration, permission, appels en cours, taux de réussite, durée moyenne, tokens rapportés et activité sur sept jours. La page s’actualise toutes les cinq secondes lorsqu’elle est visible.

Les statistiques concernent les routes de génération appelées avec une clé valide sur cette passerelle. Les 100 derniers appels et 30 jours d’agrégats quotidiens sont conservés localement ; les compteurs cumulés sont conservés depuis le début du suivi. Les anciens succès restent indiqués séparément sans inventer les mesures manquantes. Les prompts, réponses, secrets et messages bruts d’erreur ne sont pas stockés. Les tokens mesurés ne représentent ni le quota global ni une facture et peuvent être absents pour certains appels.

### Contrôles d’accès

- Écoute exclusivement sur `127.0.0.1`, sans option d’exposition réseau.
- Vérification stricte de Host, Origin et Fetch Metadata ; pas de CORS.
- Administration séparée des clés API : jeton initial à usage unique, cookie HttpOnly/SameSite, expiration côté service et en-tête requis.
- Secrets aléatoires de 256 bits, stockage des empreintes SHA-256 uniquement, comparaison en temps constant.
- Clés expirables et révocables. Une révocation annule aussi les demandes en cours.
- Limites : 64 Ko par requête, 10 appels par minute et par clé, 2 demandes simultanées, 2 minutes par exécution, 2 Mo de sortie.
- Un seul processus par dossier de clés, écriture atomique du stockage.
- Codex lancé sans shell intermédiaire, prompt transmis sur stdin, environnement minimal sans clés API Platform, configuration personnelle ignorée.
- Dossier temporaire vide, historique CLI éphémère, profil de modèle dédié retirant l’outil de modification de fichiers ; commandes, images, navigateur, plugins, MCP, hooks et agents désactivés. Sandbox en lecture seule conservé en défense supplémentaire.
- La passerelle ne journalise pas les prompts, réponses ou secrets. Codex et OpenAI conservent leurs propres règles de traitement et de rétention.

Voir [SECURITY.md](../SECURITY.md) pour les limites et le périmètre vérifié. « Local » ne veut pas dire « hors ligne » : Codex envoie les demandes aux services d’OpenAI.

## Tests

```sh
npm test
npm run check
npm run audit:tools
npm run audit:denial
```

Les tests HTTP utilisent un moteur simulé et ne consomment pas de quota. L’audit démarre la CLI contre un faux fournisseur HTTP local, sans authentification OpenAI ; il vérifie le manifeste des outils avant tout appel réel. Seule la demande de clarification, inactive dans `codex exec`, est tolérée. Aucun outil d’exécution ou d’accès n’est accepté.

Le second audit injecte un appel à l’outil d’écriture depuis le faux fournisseur, vérifie son rejet explicite par Codex et l’absence du fichier sentinelle. Il ne contacte pas OpenAI.

Le bouton **Tester** de l’interface fait un vrai appel à Codex et utilise les limites du compte.

## Données et configuration

Les empreintes et métadonnées sont dans `~/.codex-api/keys.json`. Le fichier et le dossier ont des permissions restrictives sur macOS/Linux. Sur Windows, la protection dépend aussi des ACL du profil utilisateur et reste à vérifier avant distribution.

- `CODEX_API_DATA_DIR` : autre dossier de données, pratique pour les essais.
- `CODEX_API_CODEX_BIN` : chemin vers l’exécutable Codex s’il n’est pas dans le PATH.

La connexion reste gérée par Codex : aucun import ni extraction de ses jetons par notre application.

## Distribution

Le code est publié sur [GitHub](https://github.com/GabrielSandap/codex-api) sous licence MIT. Le paquet n’est pas publié sur npm. L’implémentation utilise Node.js et prévoit les commandes d’ouverture du navigateur sur macOS, Windows et Linux. **Seul macOS a été testé en situation réelle à ce stade.**

La faisabilité de ce prototype ne constitue pas une validation contractuelle pour tous les modes de distribution ou usages commerciaux.

## Quota Codex épuisé

Une limite d’usage reconnue renvoie HTTP **429** avec `error.code: "codex_quota_exhausted"`. Les clés restent valides. Le débit limité par Codex utilise `codex_rate_limited`, tandis que nos limites locales utilisent `gateway_rate_limited`.

`error.resets_at` contient une date ISO UTC seulement si Codex fournit une date structurée valide ; sinon il vaut `null`. `Retry-After` est présent uniquement si cette date est future. Aucune heure n’est déduite d’un texte ambigu. Les erreurs non reconnues restent en 502.

L’accueil et la page de clé affichent la dernière limite observée pour le compte. Une réponse réussie retire l’alerte. Actualiser l’interface ne lance pas de demande à Codex et ne confirme pas un retour du quota. L’alerte en mémoire disparaît au redémarrage ; les codes d’échec restent dans l’historique local. La passerelle ne relance pas automatiquement une génération en échec. Évitez les boucles de nouvelles tentatives dans vos programmes.
