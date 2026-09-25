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
Aide-moi à créer une clé locale et à lancer l’exemple Python simple.
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

Choisissez **Français** dans l’en-tête si vous le souhaitez, puis **Créer une clé**. Donnez-lui un nom et copiez son secret : il n’est affiché qu’une fois.

**Gestion verrouillée ?** Ouvrez le lien privé affiché dans le terminal. S’il a expiré ou a déjà été utilisé dans un autre navigateur, arrêtez le service avec `Ctrl+C`, puis relancez-le pour obtenir un nouveau lien. Vos clés restent enregistrées.

#### 3. Essayer un fichier Python

Avec Python 3 installé, copiez [examples/simple.py](../examples/simple.py) dans un dossier personnel **en dehors du dépôt**. Ouvrez votre copie, remplacez `PASTE_YOUR_LOCAL_KEY_HERE` par votre clé et enregistrez. Vous pouvez aussi modifier la question.

Lancez le fichier depuis votre éditeur ou ouvrez un autre terminal dans son dossier :

```sh
python3 simple.py
```

Sur Windows : `py simple.py`. La réponse apparaît dans le terminal. Aucun paquet Python à installer. Ce fichier contient votre clé : gardez-le privé, ne le publiez pas et ne le partagez pas.

**Autres exemples :** [Python avec une variable d’environnement](../examples/request.py) · [JavaScript](../examples/request.mjs) · [PHP](../examples/request.php) · [cURL](../examples/request.sh). Leur configuration est aussi expliquée dans « Comment ça marche ? » dans l’application.

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
