# Analyse de réutilisation — Romains et Barbares

Le projet source n’a pas été modifié. INTERGALACTIQUE ne copie aucun fichier du jeu source : il reprend seulement certains principes, réécrits pour une grille générée.

## Parties réutilisées comme principes

| Besoin | Dans Romains et Barbares | Dans INTERGALACTIQUE |
| --- | --- | --- |
| Réseau connecté | `recenserReseau` dans `moteur.js` | `NetworkEngine.connectedNetwork` |
| Attaches immédiates | `segmentsAdjacents` | `NetworkEngine.attachments` |
| Valeur d’un réseau | `calculerValeurReseau` | `NetworkEngine.networkValue` |
| Score des camps | `calculerScores` | `NetworkEngine.potentialScores` |
| Suppression de liaisons | neutralisation des routes adjacentes lors d’une conquête | `removeOldAttachments` dans `rules.js` |
| Tour de jeu | joueur actif et passage de main dans `interface.js` | alternance simple, un coup puis changement de joueur |

Les algorithmes de parcours sont conservés dans leur idée : partir d’un élément, suivre uniquement les liaisons et éléments de même couleur, ne compter chaque élément qu’une seule fois.

## Éléments identifiés dans l’ancien jeu

- **Réseaux et connexions :** `moteur.js` fournit la recherche de segments voisins, d’un segment entre deux points et d’un réseau complet.
- **Force :** l’ancien jeu sait calculer une force locale et une force de réseau. Le prototype distingue maintenant une force de réseau relié à un Centre et une force d’attaches immédiates pour les composantes isolées.
- **Attaques et propriétaire :** `interface.js` prépare, résout et annule les conflits ; il change le propriétaire, la couleur et neutralise les routes concernées.
- **Suppression de liaisons :** lors d’une capture, les routes du défenseur sont rendues neutres.
- **Tour :** l’ancien jeu gère plusieurs coups, passage de main et un adversaire ordinateur. Le prototype conserve seulement le passage de tour simple.
- **Effets visuels :** halo de conflit, surbrillance de réseau, repère du dernier coup IA. Seule la sélection visible est retenue ici.
- **Effets spéciaux :** aucun effet spécial autonome n’a été trouvé ; les mécanismes particuliers sont surtout les combats locaux de coupure et l’IA. Ils ne sont pas activés.
- **Sauvegarde/restauration :** pas de sauvegarde durable trouvée. Il existe un historique limité à l’annulation du dernier coup dans `interface.js`.
- **Fonctions annexes :** IA dans `ia.js`, campagne/évaluation, dialogue de règles et service worker. Elles sont volontairement écartées du test du moteur.

## À remplacer

La carte géographique SVG, les routes courbes, les capitales et carrefours historiques, le tirage des capitales neutres, les noms Romains/Barbares, la règle de combat local pour couper un réseau et la campagne sont spécifiques à l’ancien univers. Ils ne sont pas repris.

## Structure du prototype

- `config.js` : valeurs initiales par défaut.
- `game-state.js` : données de la partie, sans dessin.
- `network-engine.js` : attaches, réseau connecté, puissance et scores.
- `rules.js` : construction, capture neutre et les deux combats permis.
- `renderer.js` : SVG de la grille et de ses éléments.
- `app.js` : panneau de paramètres, sélection, messages et tours.
- `styles.css` : présentation uniquement.

## Règles testées dans cette version

- Une case vide voisine crée une station et une liaison de la couleur du joueur.
- Deux possessions alliées en diagonale peuvent être reliées lorsqu’elles complètent un carré dont les quatre coins appartiennent à ce joueur.
- Une planète verte voisine est conquise par `conquerNeutralPlanet`, fonction isolée pour faciliter un changement de règle futur.
- Toute possession peut relier une possession alliée voisine ou attaquer une possession adverse voisine. Une composante reliée à un Centre galactique de même couleur emploie sa force de réseau ; une composante isolée du Centre n’emploie que ses attaches immédiates.
- Le combat compare la force disponible de chaque camp : réseau s’il est relié à un Centre, attaches immédiates sinon. Une égalité conserve le défenseur : aucun hasard n’est ajouté au test.
- Lors d’une victoire, les anciennes attaches du défenseur sont supprimées, puis la liaison d’attaque devient l’attache du nouvel élément. En cas de défaite, l’attaquant est conquis par le défenseur et perd toutes ses attaches.
- Le score potentiel additionne tous les Centres, Planètes et Stations détenus par un joueur, qu’ils soient ou non reliés.

Les données comprennent déjà le type et le propriétaire de chaque élément ; cela laisse la place à de futures conditions de victoire (capture de Centre, nombre de planètes ou domination de réseau), sans en activer une maintenant.
