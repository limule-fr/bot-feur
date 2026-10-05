# Bot Feur - version CV

Version de démonstration du projet personnel **Bot Feur** (non fonctionnelle), préparée pour une
présentation dans un contexte scolaire.

Cette branche conserve l'architecture technique du projet tout en utilisant
des déclencheurs et réponses neutres dans le code public de démonstration.

## Fonctionnalités

- Bot Discord développé avec Node.js et Discord.js
- Détection de motifs dans les messages
- Réponses automatiques aléatoires
- Statistiques par utilisateur et par catégorie
- Persistance avec Redis et solution de repli locale avec `stats.json`
- Attribution automatique de rôles selon les statistiques
- API HTTP `/api/stats`
- Tableau de bord web avec graphique et classement
- Script de déploiement Git/GitHub
- Gestion des erreurs Discord et Node.js

## Technologies

- JavaScript / Node.js
- Discord.js 14
- Redis / ioredis
- HTML / CSS / JavaScript
- Chart.js
- Git / GitHub

Les variables d'environnement nécessaires sont notamment :

```text
TOKEN=...
OWNER_ID=...
REDIS_URL=...
WEBHOOK_URL1=...
WEBHOOK_URL2=...
```


## Version CV

Cette branche est destinée à montrer les compétences techniques du projet
sans exposer les contenus humoristiques/problématiques ou les données de test utilisés dans
la version personnelle originale.
