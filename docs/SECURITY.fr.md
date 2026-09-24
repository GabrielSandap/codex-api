# Sécurité et limites

Ce dépôt est un prototype local. Il ne constitue pas une certification de sécurité et n’a pas fait l’objet d’un audit indépendant.

## Frontière de confiance

Le service, Codex CLI et le compte utilisateur du système sont de confiance. Les clés clientes ne donnent pas accès à l’administration. Les requêtes et prompts sont non fiables. Les pages web d’autres origines ne doivent pas pouvoir piloter le service.

Le profil de discussion retire les capacités d’accès et d’exécution du manifeste envoyé au modèle. Il ne repose pas uniquement sur la formulation du prompt. Une sandbox en lecture seule s’ajoute à ces restrictions ; elle ne suffit pas à elle seule à interdire les lectures, d’où le retrait des outils. Le catalogue de modèles est épinglé. Les versions stables de la CLI à partir de 0.153.4 doivent réussir le contrôle de compatibilité hors ligne au démarrage des appels.

Un processus malveillant exécuté avec le même compte OS peut lire la mémoire, modifier le programme ou accéder aux identifiants Codex. Ce projet ne protège pas contre un ordinateur compromis. Les droits du profil Windows nécessitent une validation spécifique.

## Vérification avant changement de version

1. Exécuter les tests HTTP et d’authentification.
2. Exécuter `npm run audit:tools` avec la nouvelle CLI et le catalogue ciblé.
3. Vérifier l’absence de shell, de patch, d’images, de navigateur, de plugins/MCP, de sous-agents et de code mode dans le manifeste réellement envoyé.
4. Tester des tentatives de lecture/écriture sur des fichiers sentinelles jetables, puis un appel texte réel.
5. Vérifier les permissions du stockage, l’arrêt et l’annulation sur chaque OS supporté.

Ne pas simplement retirer le contrôle de version pour contourner une incompatibilité. Le modèle et ses capacités peuvent évoluer ; tout élargissement des permissions nécessite une conception et des tests dédiés.

## Non couvert par cette version

Accès réseau distant, partage entre utilisateurs OS, fichiers et commandes, quotas de dépenses OpenAI, chiffrement du stockage par coffre natif, audit indépendant, garanties de compatibilité de tous les clients OpenAI.

Les limites de débit locales ne sont pas des limites de facturation. Un appel lancé peut consommer des tokens avant son annulation. L’existence de tiers proposant une API semblable ne valide pas leurs pratiques ni les conditions de cet usage.
