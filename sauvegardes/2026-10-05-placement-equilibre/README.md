# INTERGALACTIQUE

Prototype jouable destiné à tester la construction et les confrontations de réseaux. Les paramètres initiaux sont une grille de 10 × 10 et trois planètes de chaque couleur.

Au tirage initial, les Planètes bleues sont placées au nord et les rouges au sud avant leurs Centres respectifs. Chaque Centre est ensuite choisi pour équilibrer au mieux ses distances orthogonales vers les Planètes de son camp.

## Lancer le prototype

Ouvrez le fichier `index.html` dans un navigateur web moderne. Aucun serveur, installation ou modification du projet « Romains et Barbares » n’est nécessaire.

## Jouer

1. Cliquez une de vos possessions : Centre galactique, Planète ou Station.
2. Cliquez un croisement voisin horizontalement ou verticalement.
3. Sur un croisement libre, une Station et sa liaison sont créées.
4. Sur une Planète verte, la planète est conquise.
5. Une possession alliée voisine peut être reliée ; une possession adverse voisine peut être attaquée. Une possession reliée à un Centre galactique de sa couleur utilise la force de son réseau complet ; sinon, elle ne dispose que de ses attaches immédiates. En cas d’échec, la possession attaquante est conquise et ses attaches sont supprimées.
6. Deux possessions alliées en diagonale peuvent être reliées si elles sont les coins opposés d’un carré dont les quatre possessions appartiennent au même joueur.
7. Un clic droit sur une liaison affiche la valeur du réseau auquel elle appartient.
8. Un clic droit sur une Station affiche le nombre de ses attaches et leur valeur totale.

Le panneau de gauche permet de modifier la taille de la grille, la distribution des planètes et les valeurs avant de cliquer sur **Nouvelle galaxie**.

Une égalité défend la cible, pour que le résultat reste déterministe pendant ce premier test.
