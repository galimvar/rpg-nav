Sommaire

1. [Le pitch](#pitch)
2. [Pourquoi ×3](#calibrage)
3. [Stack imposée](#stack)
4. [Les règles du jeu](#regles)
5. [Règles de gestion (BDD)](#gestion)
6. [Les 8 quêtes](#quetes)
7. [Contrat d'API](#api)
8. [Boss optionnels](#boss)
9. [Grille de validation](#validation)

Projet-défi · Ada Tech · Concepteur Développeur d'Applications

# Adaventure

Une plateforme de jeu de rôle sur table, en ligne : un ou une MJ prépare une campagne, les joueurs créent leurs personnages, gèrent leur inventaire, puis s'affrontent à des monstres dans des combats au tour par tour résolus **par le serveur**, jet de dé après jet de dé.

Le projet traverse tout le programme : algorithmique testée avec Jest, modélisation et migrations PostgreSQL, API Express documentée, front React, script Node en ligne de commande, workflow Git. Chaque brique est poussée un cran au-delà de ce qu'on a fait en TP.

**Solo** ou binôme Charge estimée **70 à 100 h** **8** quêtes + 4 boss optionnels

Quête 1 en avant-première

Voici ce que le moteur de dés doit savoir faire. Essaie une notation :

Expression de dés

`kh` garde les plus hauts, `kl` les plus bas, `dh`/`dl` écartent. Ce simulateur est une démo : ton moteur à toi devra être écrit, testé et déterministe.

Calibrage

## Pourquoi « difficulté ×3 »

Le niveau de référence, c'est ce qu'on a fait ensemble depuis mai : des TP Express + PostgreSQL en lecture avec filtres et tri par liste blanche (Adathèque, tp-routes), une app React + Express avec polling (Instant'), de la modélisation entité-association avec règles de passage et arbre de dépendances (La Remise), des tests Jest sur des fonctions pures. Le défi multiplie la difficulté sur trois axes à la fois :

### 1. Logique métier réelle

Le serveur ne fait plus que lire et renvoyer des lignes : il applique des règles (qui joue, qui touche, combien de dégâts) et refuse ce qui les viole. Le front ne décide de rien.

### 2. Écriture et cohérence

Achats, combats et inventaire modifient plusieurs tables d'un coup. Il faut des transactions, des contraintes `CHECK` et une protection contre deux clics simultanés.

### 3. Qualité de production

Tests déterministes sur du hasard, documentation Swagger complète, codes HTTP précis (403, 409, 422), migrations réversibles, historique Git lisible.

Dans la suite, vu en cours signale une notion pratiquée en formation et au-delà du cours une notion à aller chercher dans la documentation. C'est là que se trouve le défi.

Contraintes techniques

## Stack imposée

| Couche | Outils | Exigence |
| --- | --- | --- |
| Base | PostgreSQL via `docker-compose` | Migrations `up`/`down` rejouables à volonté, seed réaliste, au moins 3 types `ENUM` |
| API | Node.js, Express 5, `pg`, `dotenv` | Routers séparés, préfixe `/api/v1`, requêtes paramétrées partout, middleware d'erreurs centralisé |
| Logique | Modules JS purs (ES modules) | Moteur de dés et moteur de combat **sans aucune dépendance** à Express ni à `pg` |
| Tests | Jest | Couverture ≥ 80 % sur les moteurs, hasard injecté pour des tests déterministes |
| Front | React (Vite), Tailwind + DaisyUI | Un fichier CSS ou un composant par responsabilité, trois états partout (chargement / erreur / vide) |
| Outillage | Script Node CLI | `process.argv`, `fs`, sortie colorée ANSI |
| Doc | Swagger / OpenAPI | Toutes les routes documentées avec exemples et codes d'erreur |
| Git | GitHub | Branche `dev`, une branche par quête, pull requests, aucun commit direct sur `main` |

Game design

## Les règles du jeu : le système « d20 Ada »

Un système maison, volontairement simple à lire et pénible à coder proprement. Toutes ces règles doivent être appliquées côté serveur.

### Création de personnage

- 4 caractéristiques : **FOR** (force), **AGI** (agilité), **ESP** (esprit), **VIG** (vigueur).
- Le joueur répartit exactement **20 points**, chaque caractéristique entre 1 et 8 inclus.
- Points de vie max = valeur max du dé de vie de la classe + VIG × 2.
- Bourse de départ : `3d6 × 10` pièces d'or, lancée par le serveur à la création.
- Poids transportable = FOR × 5 kg. Au-delà, la boutique refuse l'achat.

| Classe | Dé de vie | Bonus | Capacité |
| --- | --- | --- | --- |
| Guerrier | `d10` | +1 FOR | +2 aux dégâts de mêlée |
| Rôdeur | `d8` | +1 AGI | Avantage (`2d20kh1`) contre une cible déjà blessée |
| Mage | `d6` | +1 ESP | Trait arcanique `1d10+ESP`, ignore le bonus d'armure de la cible |
| Clerc | `d8` | +1 VIG | Soin `1d8+ESP` sur un allié, 2 fois par combat |

### Combat

- **Initiative** : chaque combattant lance `1d20+AGI`. Égalité : la plus haute AGI joue d'abord, puis tirage au sort.
- **Défense** = 10 + AGI + bonus de l'armure équipée.
- **Attaque** : `1d20 + FOR` (mêlée) ou `+ AGI` (distance). Touche si le résultat est ≥ à la défense de la cible.
- **20 naturel** : coup critique, on lance deux fois les dés de dégâts (le modificateur ne double pas). **1 naturel** : échec automatique.
- **Dégâts** = formule de l'arme + FOR (minimum 1).
- **Se défendre** : +4 en défense jusqu'au prochain tour du combattant.
- **Potion** : soigne selon sa formule, sans dépasser les PV max. Consomme l'objet.
- À 0 PV, un combattant est hors combat. La rencontre se termine quand un camp entier est à 0.
- **Monstres** : ils attaquent le personnage ayant le moins de PV actuels. Sous 25 % de leurs PV, un monstre a une chance sur deux de fuir.
- **Fin de combat** : l'XP des monstres vaincus est partagée. Tous les 100 XP, le personnage gagne 1 point de caractéristique (plafond 10).

Conception

## Règles de gestion

Pas de schéma fourni : c'est à toi de produire le dictionnaire de données, le schéma entité-association, le passage au relationnel (R1/R2/R3) et l'arbre de dépendances. Voici les règles que la base doit faire respecter.

### Joueurs et campagnes

- Un joueur a un pseudo unique.
- Un joueur peut participer à plusieurs campagnes, avec un rôle par campagne (MJ ou joueur).
- Une campagne a exactement un MJ.
- Un joueur a au plus un personnage par campagne.

### Personnages

- Un personnage a une classe, 4 caractéristiques, des PV actuels et max, de l'XP, une bourse.
- Total des caractéristiques à la création = 20, bourse jamais négative, PV actuels entre 0 et PV max.
- Ces règles sont garanties par des contraintes `CHECK`, pas seulement en JavaScript.

### Objets et inventaire

- Le catalogue contient des armes, armures, potions et objets divers, avec poids et prix.
- Une arme a une formule de dégâts, une armure un bonus de défense, une potion une formule de soin.
- Un personnage possède des objets en quantité.
- Au plus une arme et une armure équipées par personnage.

### Bestiaire, rencontres, journal

- Un monstre a une formule de PV (ex. `3d8+4`), une défense, une attaque, des dégâts, de l'XP.
- Une rencontre appartient à une campagne, a un statut (préparation, en cours, terminée), un tour et un acteur actif.
- Un combattant est **soit** un personnage, **soit** une instance de monstre, jamais les deux.
- Chaque action produit une entrée de journal avec le détail des jets.

Indices sans réponse : regarde les contraintes `UNIQUE` sur plusieurs colonnes, les index partiels (`WHERE equipe = true`), le type `JSONB` pour stocker un jet de dé détaillé, et une contrainte `CHECK` qui vérifie qu'une seule de deux colonnes est renseignée.

Feuille de route

## Les 8 quêtes

À faire dans l'ordre : chaque quête s'appuie sur la précédente. Une quête est terminée quand ses tests passent, qu'elle est mergée dans `dev` et documentée.

I

### La Forge des Dés

★★★★★

Un module pur `dice/` qui analyse et lance une expression : `3d6+2`, `2d20kh1`, `4d6dl1`, `2d8+1d4-1`. Il renvoie le total et le détail de chaque terme (dés lancés, dés gardés, dés écartés).

- vu en cours fonctions pures, Jest, `describe`/`it`/`expect`, manipulation de chaînes
- au-delà du cours parser écrit à la main avec erreurs explicites (position du caractère fautif), générateur aléatoire **injectable** pour rendre le hasard testable, limites anti-abus (100 dés max, 1000 faces max)
- Livrable : au moins 30 tests, en TDD (le test avant le code).

```
import { rollExpression } from '../src/dice/roll.js';
import { createSequenceRng } from '../src/dice/rng.js';

describe('rollExpression', function () {
  it('garde le meilleur des deux d20 avec kh1', function () {
    const rng = createSequenceRng([17, 4]);
    const result = rollExpression('2d20kh1+3', rng);
    expect(result.total).toBe(20);
    expect(result.terms[0].kept).toEqual([17]);
  });
});
```

Le test ci-dessus est un exemple de contrat, pas une solution. Pense au cas `d20` (sans nombre devant), à `2d6kh3` (garder plus que lancé) et aux espaces.

II

### Les Fondations du Donjon

★★★★★

Conception complète puis implémentation : dictionnaire de données, schéma entité-association, schéma relationnel, arbre de dépendances par niveaux, `migration_up.sql`, `migration_down.sql`, `seed.sql`.

- vu en cours R1/R2/R3, `ENUM`, `CREATE TABLE`, ordre de création selon l'arbre
- au-delà du cours contraintes `CHECK` métier, index partiel unique, colonne `JSONB`
- Seed : 4 classes, au moins 30 objets, 15 monstres répartis sur 4 niveaux de menace, 2 campagnes avec joueurs et personnages, 1 rencontre déjà terminée avec son journal.

Teste tes contraintes : écris un fichier `db/tests_contraintes.sql` qui tente des insertions invalides et vérifie qu'elles échouent.

III

### Le Grimoire (lecture)

★★★★★

Routes en lecture sur le bestiaire, le catalogue d'objets, les classes, les campagnes et les fiches de personnage complètes (avec inventaire et équipement en une seule réponse).

- vu en cours Router, filtres combinables via `COALESCE`, tri par liste blanche, 404
- au-delà du cours pagination `?page=&limite=` avec métadonnées (`total`, `pages`), agrégation JSON côté SQL (`json_agg`) pour construire la fiche en une seule requête

IV

### La Taverne et la Boutique (écriture)

★★★★★

Création de personnage avec validation des règles, équiper/déséquiper, achat et revente en boutique.

- vu en cours `POST`/`PATCH`/`DELETE`, `req.body`, middleware, gestion d'erreurs Express 5
- au-delà du cours middleware de validation écrit à la main et réutilisable, **transaction** (`BEGIN` / `COMMIT` / `ROLLBACK`) avec un client dédié du pool : un achat débite l'or *et* ajoute l'objet, ou ne fait rien du tout
- Codes HTTP attendus : `201`, `400` (format), `403` (pas ton personnage), `404`, `422` (règle du jeu violée : pas assez d'or, trop lourd, répartition fausse)

Pour vérifier ta transaction, provoque volontairement une erreur entre les deux requêtes et constate que l'or n'a pas bougé.

V

### L'Arène (moteur de combat)

★★★★★

Le cœur du projet. Le MJ crée une rencontre, ajoute des monstres (leurs PV sont lancés à partir de leur formule), lance le combat. Le serveur calcule l'initiative puis enchaîne les tours : les personnages agissent via l'API, les monstres agissent automatiquement juste après.

- Moteur en **deux couches** : un module pur `combat/` qui prend un état et une action et renvoie un nouvel état et des événements (100 % testé avec Jest), puis la route Express qui charge l'état, appelle le moteur et enregistre le résultat.
- au-delà du cours machine à états (préparation → en cours → terminée), `409 Conflict` si ce n'est pas le tour du personnage, verrouillage de ligne (`SELECT … FOR UPDATE`) pour que deux clics simultanés ne produisent pas deux actions
- Chaque action écrit une entrée de journal avec le détail des jets en `JSONB`.

Avant d'écrire la route, simule un combat complet guerrier + mage contre 3 gobelins uniquement dans les tests du module pur. Si ça marche là, la route ne sera que de la plomberie.

VI

### La Table de Jeu (front React)

★★★★★

Quatre écrans : choix du joueur et de la campagne, création de personnage (répartition des 20 points avec compteur restant), fiche et inventaire avec boutique, écran de combat (ordre d'initiative, barres de PV, choix de l'action et de la cible, journal qui défile).

- vu en cours composants, props, `useState`, `useEffect` + `fetch`, polling (comme Instant'), CORS
- au-delà du cours navigation entre écrans avec React Router, hook personnalisé `useRencontre(id)` qui centralise le polling et s'arrête quand le combat est terminé, boutons désactivés quand ce n'est pas ton tour
- Le front n'effectue jamais un seul calcul de règle : il affiche ce que le serveur renvoie.

VII

### Le Chroniqueur (CLI Node)

★★★★★

Un script lancé dans le terminal qui lit le journal d'une campagne dans la base et produit un récit HTML lisible de toutes ses rencontres.

```
npm run chronique -- --campagne 2 --sortie chroniques/campagne-2.html
```

- vu en cours `process.argv`, `fs`, `path`, couleurs ANSI (comme Trackada)
- au-delà du cours réutiliser `db.js` hors d'Express, code de sortie non nul en cas d'erreur, option `--aide`

VIII

### Le Sceau du Royaume (doc et qualité)

★★★★★

- Swagger complet, accessible sur `/api/docs`, avec un exemple par route et tous les codes d'erreur.
- README : installation en 5 commandes maximum, schémas de conception, captures d'écran.
- au-delà du cours tests d'intégration des routes avec `supertest` sur une base de test séparée (`.env.test`), recréée avant chaque série de tests.

Contrat

## Contrat d'API minimal

En v1, l'identification est volontairement simple : chaque requête d'écriture envoie l'en-tête `X-Joueur-Id`. Un middleware le vérifie et rattache le joueur à `req`. La vraie authentification est un boss optionnel.

| Méthode | Route | Rôle |
| --- | --- | --- |
| GET | `/api/v1/bestiaire` | Filtres `menace`, `nom`, tri, pagination |
| GET | `/api/v1/objets` | Filtres `type`, `prix_max`, tri, pagination |
| GET | `/api/v1/personnages/:id` | Fiche complète avec inventaire |
| POST | `/api/v1/campagnes/:id/personnages` | Création, bourse lancée par le serveur |
| POST | `/api/v1/personnages/:id/achats` | Achat transactionnel |
| PATCH | `/api/v1/personnages/:id/inventaire/:objetId` | Équiper ou déséquiper |
| POST | `/api/v1/campagnes/:id/rencontres` | MJ uniquement |
| POST | `/api/v1/rencontres/:id/demarrer` | Lance l'initiative |
| GET | `/api/v1/rencontres/:id` | État complet, interrogé par le polling |
| POST | `/api/v1/rencontres/:id/actions` | Jouer son tour |
| GET | `/api/v1/rencontres/:id/journal` | Entrées du journal, paramètre `?depuis=` |

### Exemple : jouer une attaque

```
POST /api/v1/rencontres/12/actions
X-Joueur-Id: 3
Content-Type: application/json

{
  "type": "attaque",
  "acteurId": 41,
  "cibleId": 44,
  "armeId": 7
}
```

```
201 Created
{
  "action": "attaque",
  "jetAttaque": { "expression": "2d20kh1+4",
    "des": [15, 9], "gardes": [15], "total": 19 },
  "defenseCible": 13,
  "touche": true,
  "critique": false,
  "jetDegats": { "expression": "1d8+3",
    "des": [6], "total": 9 },
  "cible": { "id": 44, "pv": 2, "pvMax": 11 },
  "tourSuivant": { "acteurId": 44, "tour": 3 }
}
```

Erreurs attendues sur cette route : `403` si le personnage n'appartient pas au joueur, `404` si la rencontre n'existe pas, `409` si ce n'est pas son tour ou si le combat est terminé, `422` si la cible est déjà hors combat ou si l'arme n'est pas équipée.

Pour aller plus loin

## Boss optionnels

### Le Gardien des Portes

Vraie authentification : inscription, mot de passe haché (`bcrypt`), jeton JWT, middleware qui remplace `X-Joueur-Id`.

### Le Messager Instantané

Remplacer le polling par des Server-Sent Events : le serveur pousse chaque nouvelle action à tous les joueurs de la rencontre.

### La Carte du Monde

Une grille 10 × 10 : déplacement limité par l'AGI, armes de mêlée à portée 1, armes à distance à portée 6, obstacles en base.

### Le Rejoueur

Rejouer un combat terminé coup par coup à partir du seul journal, et vérifier que l'état final obtenu est identique à celui enregistré.

Fin de quête

## Grille de validation

Tu peux cocher au fur et à mesure : la progression est gardée dans ton navigateur.

0 / 0

[ ] Le moteur de dés passe au moins 30 tests et ne dépend d'aucun module externe. [ ] Les tests utilisant le hasard donnent le même résultat à chaque exécution. [ ] Dictionnaire de données, schéma entité-association, schéma relationnel et arbre de dépendances sont dans le dossier `conception/`. [ ] `migration_down` puis `migration_up` puis `seed` s'enchaînent sans erreur, trois fois de suite. [ ] Une insertion de personnage avec 21 points de caractéristiques est refusée par la base elle-même. [ ] Toutes les requêtes SQL sont paramétrées, et le tri passe par une liste blanche. [ ] Un achat interrompu par une erreur ne modifie ni l'or ni l'inventaire. [ ] Deux requêtes d'action envoyées en même temps ne produisent qu'une seule action. [ ] Un combat complet est jouable de bout en bout depuis le front, sans toucher à la base à la main. [ ] Le front affiche un état de chargement, d'erreur et de liste vide sur chaque écran. [ ] Le script Chroniqueur génère un récit HTML et renvoie un code d'erreur si la campagne n'existe pas. [ ] Swagger documente toutes les routes avec leurs codes d'erreur. [ ] Le README permet à quelqu'un d'autre de lancer le projet sans aide. [ ] Une branche et au moins une pull request par quête, aucun commit direct sur `main`.

Adaventure · sujet de projet-défi préparé pour la promo Concepteur Développeur d'Applications, Ada Tech School Nantes, 2026–2027. Le système de règles « d20 Ada » est une création originale pour ce projet.