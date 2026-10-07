# INTERGALACTIQUE

Prototype jouable destiné à tester la construction et les confrontations de réseaux. Les paramètres initiaux sont une grille de 11 × 10 et trois planètes de chaque couleur.

Le mode de distribution actuel place aléatoirement les Planètes, à au moins un croisement des quatre bords et à deux croisements orthogonaux au minimum de chaque Centre. Elles sont réparties au nord et au sud en nombres égaux, ou avec une planète de moins au nord si le total est impair. Chaque joueur possède un unique Centre galactique : le Centre rouge de Kryssar est fixé au milieu du bord haut et le Centre bleu de Zarkon au milieu du bord bas ; la largeur est donc impaire.

## Lancer le prototype

Ouvrez le fichier `index.html` dans un navigateur web moderne. Aucun serveur, installation ou modification du projet « Romains et Barbares » n’est nécessaire.

## Jouer

1. Cliquez une de vos possessions : Centre galactique, Planète ou Station.
2. Cliquez un croisement voisin horizontalement ou verticalement.
3. Sur un croisement libre, une Station et sa liaison sont créées.
4. Sur une Planète verte, la planète est conquise.
5. Une possession alliée voisine peut être reliée ; une possession adverse voisine peut être attaquée. Une Station attaquante reliée à son Centre emploie son réseau complet ; sinon, elle emploie son **nombre d’attaches de combat**. Une Planète défenderesse reliée à son Centre emploie aussi son réseau ; sinon, elle emploie son nombre d’attaches de combat. Une Planète attaquante et les autres possessions emploient seulement leur nombre d’attaches de combat. En cas d’échec, la possession attaquante est conquise et ses attaches sont supprimées.
6. Deux possessions alliées en diagonale peuvent être reliées si elles sont les coins opposés d’un carré dont les quatre possessions appartiennent au même joueur.
7. Un clic droit sur une liaison affiche la valeur du réseau auquel elle appartient.
8. Un clic droit sur une Station affiche le nombre de ses attaches et la **valeur totale des éléments attachés**.

Un appui long sur votre Centre galactique, suivi d’un glissé-déposé sur un croisement libre voisin, déplace le Centre. Les huit voisins, diagonales comprises, sont acceptés ; ce déplacement consomme un coup. Lors du déplacement de A vers B, le Centre quitte A et une Station spatiale de même couleur est créée en A. Toutes les anciennes attaches restent exactement en A et deviennent les attaches de cette Station ; aucune liaison existante n’est déplacée, étirée ou recalculée vers B. Une seule nouvelle attache A–B est créée, puis le Centre est placé en B : le réseau reste continu.

Une Station qui ne possède plus aucune attache disparaît automatiquement.

## Termes de puissance

Une **attache** est une liaison directe entre une possession et une autre possession de même couleur. Le **nombre d’attaches de combat** compte ces liaisons directes : c’est la grandeur utilisée lorsque une force locale est requise par un combat. Une Planète sans attache réelle reçoit une attache virtuelle, qui compte pour une attache de combat.

La **valeur totale des éléments attachés** est une autre grandeur : elle additionne les valeurs CG/P/S des possessions directement attachées. Elle est affichée au clic droit sur une Station, mais ne remplace pas le nombre d’attaches de combat dans les calculs de force locale. La valeur d’un réseau complet est, elle, la somme des valeurs de toutes les possessions de ce réseau.


Le panneau de gauche permet de modifier la taille de la grille, la distribution des planètes et les valeurs avant de cliquer sur **Nouvelle galaxie**.

Le nombre de coups par tour est également paramétrable. Seules les actions effectivement résolues consomment un coup.

La victoire s’obtient immédiatement lorsqu’une possession capture le Centre galactique unique de l’adversaire et qu’elle appartenait, avant la capture, à un réseau relié à un Centre de sa couleur. Cette condition s’applique aussi lorsqu’un Centre attaquant perd son combat : le réseau défenseur doit alors être relié à un Centre de sa couleur. Dans les deux cas, si cette liaison n’existe pas, la capture et le changement de propriétaire sont appliqués, mais la partie continue.

Le sélecteur **Mode de jeu** propose **Contre Kryssar** (Kryssar est contrôlé par l’IA) et **Seul dans la galaxie** (une même personne joue les deux couleurs, utile pour expérimenter le moteur). L’ordinateur privilégie la victoire immédiate, puis la défense de son Centre contre un réseau bleu relié à son Centre, la coupure des possessions-ponts bleues, les planètes vertes et enfin les attaques qui retirent le plus d’attaches. Quand aucune de ces actions n’est disponible, il cherche à relier deux réseaux rouges distincts ; sans cible utile proche, il se dirige vers le centre du plateau. Il ne joue pas une attaque perdante.

L’ambiance reste décorative : des étoiles fugaces apparaissent sur des croisements libres, des comètes traversent occasionnellement la grille et de rares ondes gravitationnelles se propagent. Chaque bataille gagnée produit une lueur et une onde de la couleur du vainqueur.

Le bouton **Évaluer la campagne**, placé à côté du titre Paramètres, ouvre une confirmation pour continuer ou terminer. Le bilan final récapitule les scores potentiels, les planètes acquises et perdues, les Stations et les Centres contrôlés. Après la fin confirmée, la partie est verrouillée.

Une égalité défend la cible, pour que le résultat reste déterministe pendant ce premier test.
