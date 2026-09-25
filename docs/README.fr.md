# Codex API

[English](../README.md) · Français

Utilisez Codex CLI depuis vos programmes grâce à une API locale. Créez et gérez vos clés dans votre navigateur. La connexion ChatGPT existante est utilisée ; aucune clé OpenAI Platform n’est nécessaire.

## Choisissez votre parcours

### Avec Codex ou un autre agent de programmation

Copiez cette demande dans votre agent :

```text
Aide-moi à installer et utiliser https://github.com/GabrielSandap/codex-api sur cet ordinateur.
Lis docs/agent-setup.md dans ce dépôt et suis sa procédure d’installation.
Réutilise Node.js, Codex CLI et ma connexion ChatGPT s’ils sont compatibles.
Aide-moi à créer une clé locale et à lancer l’exemple JavaScript simple avec Node.js.
Garde les identifiants privés et indique les vérifications qui restent à faire.
```

L’agent peut vérifier les prérequis et démarrer le service. Vous effectuez vous-même la connexion ChatGPT si nécessaire et créez votre clé dans l’interface locale. [Guide pour les agents](agent-setup.md).

### Vous-même, en trois étapes

#### 1. Démarrer l’application

Il faut **Node.js 22+**, **Git** et **Codex CLI stable 0.153.4+**, connecté avec ChatGPT. Gardez les outils compatibles déjà installés. [Installer les prérequis manquants](guide.fr.md#installer-depuis-github).

Lancez chaque commande séparément :

```sh
git clone https://github.com/GabrielSandap/codex-api.git
cd codex-api
npm run setup
```

Cette vérification ne modifie aucune installation. Corrigez les problèmes signalés, puis lancez :

```sh
npm start
```

La page de gestion s’ouvre dans votre navigateur. Gardez ce terminal ouvert. Aucune dépendance npm ni compilation à prévoir. Si vous avez déjà cloné le dépôt, ouvrez son dossier au lieu de le cloner à nouveau.

#### 2. Créer une clé

Choisissez **FR** dans l’en-tête si vous le souhaitez, puis **Créer une clé**. Donnez-lui un nom et copiez son secret : il n’est affiché qu’une fois.

**Gestion verrouillée ?** Ouvrez le lien privé affiché dans le terminal. S’il a expiré ou a déjà été utilisé dans un autre navigateur, arrêtez le service avec `Ctrl+C`, puis relancez-le pour obtenir un nouveau lien. Vos clés restent enregistrées.

#### 3. Lancer votre premier exemple

**Choisissez un seul fichier.** Sans préférence, prenez JavaScript : Node.js est déjà installé pour Codex API.

| Langage | Fichier | Commande depuis le dossier du fichier | Prérequis |
| --- | --- | --- | --- |
| JavaScript | [simple.mjs](../examples/simple.mjs) | `node simple.mjs` | Node.js 22+, déjà utilisé par l’application |
| Python | [simple.py](../examples/simple.py) | `python3 simple.py` (Windows : `py simple.py`) | Python 3 |
| PHP | [simple.php](../examples/simple.php) | `php simple.php` | PHP 8+ avec l’extension cURL |
| cURL | [simple.sh](../examples/simple.sh) | `sh simple.sh` | Shell macOS/Linux ou Git Bash sur Windows, cURL 7.76+ |

1. Ouvrez le lien du fichier, puis cliquez sur **Download raw file** sur GitHub. Enregistrez-le dans un dossier personnel **en dehors du dépôt**.
2. Ouvrez-le dans votre éditeur de code, remplacez `PASTE_YOUR_LOCAL_KEY_HERE` par votre clé et enregistrez. Vous pouvez modifier la question (le texte `input` pour cURL).
3. Gardez le terminal de l’application actif. Ouvrez **un autre terminal dans le dossier de votre fichier**, puis lancez la commande du tableau.

La réponse apparaît dans ce terminal. cURL affiche la réponse JSON complète ; le texte se trouve dans `output_text`. Aucun paquet supplémentaire à installer une fois le langage choisi disponible. JavaScript se lance avec Node.js, pas dans une page web. Chaque demande réelle consomme votre quota Codex.

Ce fichier contient votre clé : gardez-le privé. En cas d’échec, ouvrez **Aide → Résoudre un problème** dans l’application. Ces exemples courts affichent les erreurs standard du langage ou de l’API, sans nouvelle tentative automatique.

Pour un projet partagé, utilisez les exemples avec une variable d’environnement : [Python](../examples/request.py), [JavaScript](../examples/request.mjs), [PHP](../examples/request.php), [cURL](../examples/request.sh). La configuration est expliquée dans l’aide de l’application.

## Connecter votre application

| Paramètre | Valeur |
| --- | --- |
| Adresse de base | `http://127.0.0.1:4317/v1` |
| Clé API | Votre clé locale |
| Modèle | `codex` |
| Streaming | Désactivé |

Le programme doit tourner sur le même ordinateur et accepter une adresse personnalisée. Cette clé ne fonctionne pas directement chez OpenAI. Pour un projet partagé, utilisez une variable d’environnement ou un gestionnaire de secrets. [Routes et limites](guide.fr.md#routes).

## À savoir

- L’ordinateur doit rester **allumé, éveillé et connecté à Internet**, avec le service actif. Le navigateur peut être fermé. `Ctrl+C` dans le terminal du service arrête l’application.
- Les demandes passent par OpenAI et consomment votre quota. Votre compte ChatGPT doit avoir accès à Codex et au modèle `gpt-6-astra` utilisé par cette version.
- Un quota épuisé reconnu produit une erreur HTTP 429. L’interface affiche la dernière limite observée et la clé reste valide. [Détails](guide.fr.md#quota-codex-épuisé).
- Cette version accepte uniquement du **texte**. Les nouvelles versions de Codex doivent passer le contrôle de compatibilité hors ligne. Usage réel validé sur macOS ; Windows et Linux restent expérimentaux.

Projet indépendant, non affilié à OpenAI. Version préliminaire, sans certification de sécurité.

[Guide complet](guide.fr.md) · [Sécurité](SECURITY.fr.md) · [Validation](../QA.md) · [Contribuer](../CONTRIBUTING.md) · [Licence MIT](../LICENSE)
