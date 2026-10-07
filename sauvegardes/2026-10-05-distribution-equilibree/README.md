# INTERGALACTIQUE

Prototype jouable destiné à tester la construction et les confrontations de réseaux. Les paramètres initiaux sont une grille de 11 × 10 et trois planètes de chaque couleur.

Le mode de distribution actuel place aléatoirement les Planètes, à au moins un croisement des quatre bords et à deux croisements orthogonaux au minimum de chaque Centre. Elles sont réparties au nord et au sud en nombres égaux, ou avec une planète de moins au nord si le total est impair. Le Centre rouge est fixé au milieu du bord haut et le Centre bleu au milieu du bord bas ; la largeur est donc impaire.

## Lancer le prototype

Ouvrez le fichier `index.html` dans un navigateur web moderne. Aucun serveur, installation ou modification du projet « Romains et Barbares » n’est nécessaire.

## Jouer

1. Cliquez une de vos possessions : Centre galactique, Planète ou Station.
2. Cliquez un croisement voisin horizontalement ou verticalement.
3. Sur un croisement libre, une Station et sa liaison sont créées.
4. Sur une Planète verte, la planète est conquise.
5. Une possession alliée voisine peut être reliée ; une possession adverse voisine peut être attaquée. Une Station attaquante reliée à son Centre emploie son réseau complet ; sinon, elle emploie ses attaches. Une Planète défenderesse reliée à son Centre emploie aussi son réseau ; sinon, elle emploie ses attaches. Une Planète attaquante et les autres possessions emploient seulement leurs attaches immédiates. En cas d’échec, la possession attaquante est conquise et ses attaches sont supprimées.
6. Deux possessions alliées en diagonale peuvent être reliées si elles sont les coins opposés d’un carré dont les quatre possessions appartiennent au même joueur.
7. Un clic droit sur une liaison affiche la valeur du réseau auquel elle appartient.
8. Un clic droit sur une Station affiche le nombre de ses attaches et leur valeur totale.

Un appui long sur votre Centre galactique, suivi d’un glissé-déposé sur un croisement libre voisin, déplace le Centre. Les huit voisins, diagonales comprises, sont acceptés ; ce déplacement consomme un coup.

Une Station qui ne possède plus aucune attache disparaît automatiquement.

Une Planète hors réseau possède une attache virtuelle, de valeur égale à celle d’une Station. Avec les valeurs initiales, deux attaches de valeur 1 peuvent donc la vaincre.


Le panneau de gauche permet de modifier la taille de la grille, la distribution des planètes et les valeurs avant de cliquer sur **Nouvelle galaxie**.

Le nombre de coups par tour est également paramétrable. Seules les actions effectivement résolues consomment un coup.

Une égalité défend la cible, pour que le résultat reste déterministe pendant ce premier test.
