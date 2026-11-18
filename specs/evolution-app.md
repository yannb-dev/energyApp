# Liste des fonctionnalités à développer par odre de priorité :

1. Ajouter des icônes "?" pour déclencher une info bulle pour informer l'utilisateur du type de calcul ou d'une donnée affiché
2. Définir la durée d'effort en fonction d'une distance et d'une allure ou vitesse (km/h ou min/km)
3. Possibilité d'ajouter d'autre type de barre et de cumuler barre + gel + compote
4. Stocker les données utilisateurs en BDD NEON, enregistrer les produits solides, liquides et boissons.
5. Définir une activité en fonction d'une trace GPX, d'une VMA ou d'une PMA
6. Appliquer le plan nutrition de l'activité sur un profil altimétrique et exporter cette vue pour 3 formats différents, "dossard", "top tube vélo", "A4".
7. Créer un feedBack des activités enregistrer afin d'adapter les différents calculs et répartition des produits ingérés.
8. Ajouter une page "After-Activity" qui apport un plan pour la reconstruction des réserves glucidiques, hydriques et des apports en protéines.

## Détail de chaque nouvelle fonctionnalité

### 1. Ajouter des icônes "?" pour déclencher une info bulle pour informer l'utilisateur du type de calcul ou d'une donnée affiché

Sur les blocs cités ci dessous ajouter un icône rond avec centré un "?". Il ouvre une info-bulle que l'on peux fermer avec un clic sur "x" dans l'angle haut-droit. L'info bulle détail le calcul ou les explique les valeurs de références utilisé pour le calcul.

Bloc :
[

- PLAFOND A RESPECTER ( info sur les valeurs de référence des repère usuel)
- RESULTATS EnergyCalculator.tsx (méthode de calcul pour le métabolisme de base et pour la dépense journalière)
- RESULTATS NutritionPlanView.tsx (Expliquer les facteurs limitants)
  ]

> - Un seul composant réutilisable `InfoTooltip` (bouton « ? » rond, panneau avec « × » en haut à droite), pas trois implémentations.
> - Accessibilité : `aria-expanded`, `aria-describedby`, fermeture avec Échap et au clic extérieur, focus clavier.
> - Les textes vont dans des constantes. Les valeurs de référence existent déjà (`CARB_CAP_RECOMMENDED`, `SODIUM_CAP_RECOMMENDED`, `HYDRATION_CAP_RECOMMENDED`, formules dans `lib/energy.ts`) : les réutiliser pour ne pas dupliquer les chiffres.
> - Aucune dépendance nécessaire. Wording prudent : information générale, pas de conseil médical (cf. point 4).

### 2. Définir la durée d'effort en fonction d'une distance et d'une allure ou vitesse (km/h ou min/km)

Retirer la saisie du "Temps de l'activité" et la remplacer par deux champs. Un champs distance et un champ moyenne de "Vitesse" en km/h ou "Allure" min/km.

> - Durée = distance ÷ vitesse. Le champ `minutes` actuel (bornes `MINUTES_MIN/MAX`) devient une valeur dérivée.
> - Min/km est logique pour la course et le trail, km/h pour le vélo. Proposition : unité par défaut selon le sport (`lib/sports.ts`), avec bascule manuelle.
> - Le sport doit être choisi avant le calcul de durée : vérifier l'ordre des champs.
> - Validations à prévoir : allure `mm:ss`, vitesse nulle, durée > 24 h.
> - Les tests existants sur `minutes` seront à adapter. La durée sera aussi dérivée au point 5 (GPX) : garder une seule fonction de calcul.
> - Un ligne informe l'utilisateur de la durée de l'effort.

### 3. Possibilité d'ajouter d'autre type de barre et de cumuler barre + gel + compote

Création d'une liste évolutive, l'utilisateur peut ajouter d'autres barres ou cumuler des produits solide et/ou une boisson. Réduire le type de produit à 3 "GEL" "BARRE" "PATE FRUIT"

> Parcours utilisateur

- Il ajoute les produits. Il peut modifier et supprimer les produits déjà listé.
- Il selectionne les produits qu'il souhaite inclure dans son calcul. Chaque produit se retrouve avec un label "Produit A" "Produit B" ect.. L'utilisateur peux déplacer les produits pour attribuer les différentes positions via des chevron haut - bas.
- En fonction des produits sélectionnés un dropdown apparait (uniquement si deux produits solides sont sélectionnés ) pour définir l'ordre de priorité des produits et définir une stratégie d'alimentation.
- Le calcul et la répartition se feront à partir de ce choix.
-

> Table pour définir les ordres de priorité en fonction des produits sélectionnés, recalcul à chaque changement de produit ou selection/deselection :

const PRODUIT_SOLIDE_2 = [
{label : "mixte50%", content: "Répartition équitable, ${produitA} puis ${produitB}",produitA: "name", produitB: "name", quantiteProduitA: 50, quantiteProduitB: 50, orderBy: first(produitA) }
{label : "mixte75%", content: "75% de ${produit} et 25% de ${produit}", produitA: "name", produitB: "name", quantiteProduitA: 75, quantiteProduitB: 25, orderBy: first(produitA)}
{label : "variable", content: "Une produit différent une fois sur deux", produitA: "name", produitB: "name", quantiteProduitA: 50, quantiteProduitB: 50, orderBy: alterne(produitA+produitB)}
]

const PRODUIT_SOLIDE_3 = [
{label : "mixte33%", content: "Répartition équitable, ${produitA}, ensuite ${produitB} puis ${produitC}",produitA: "name", produitB: "name", produitC: "name", quantiteProduitA: 33, quantiteProduitB: 33, quantiteProduitC: 33, orderBy: produitA+produitB+produitC }
{label : "mixte75%", content: "50% de ${produitA} et 25% de ${produitB} et 25% de ${produitC}", produitA: "name", produitB: "name", produitC: "name" quantiteProduitA: 50, quantiteProduitB: 25, quantiteProduitC: 25 orderBy: produitA+produitB+produitC}
{label : "variable", content: "Une produit différent une fois sur trois", produitA: "name", produitB: "name", produitC: "name", quantiteProduitA: 33, quantiteProduitB: 33, quantiteProduitC: 33, orderBy: alterne(produitA+produitB+produitC)}
]

> - Le formulaire actuel (`NutritionFormValues`, `lib/nutrition.ts`) gère un seul produit et une boisson optionnelle. Il faut passer à une liste de produits : refactor du modèle et de `lib/nutritionStorage.ts`, avec migration des données déjà stockées.
>   Le calcul sera à isoler dans `lib/` avec des tests.

### 4. Stocker les données utilisateurs en BDD NEON, enregistrer les produits solides, liquides et boissons.

Pour un confort utilisateur, enregistrer les données récurentes en base de donnée. Attention au RGPD pour les données de l'utilisateur (age/poids/taille). Limite à prendre en compte en fonction, l'application ne doit pas rentrer dans une case "santé".

Stack BACKEND - BDD PSQL avec OMR PRISMA et NEON. API ROUTE dans les "use client" PRISMA dans les "serverComponent".
Authentification via OAuth Google + JWT dans un cookie.

> 💬 **Commentaire Claude**
>
> - Toute la stack est à ajouter (Prisma, driver Neon, auth Google OAuth + JWT) : plusieurs nouvelles dépendances, à valider une par une.
> - Le stockage actuel est local (`lib/nutritionStorage.ts`) : prévoir une migration localStorage vers la base et garder un mode hors-connexion.
> - RGPD : minimisation (âge, poids, taille optionnels ou en tranches), consentement explicite, droit à l'export et à la suppression, région Neon UE, cookie `httpOnly` + `Secure` + `SameSite`.
> - Positionnement « non santé » : pas de conseil médical, mention dans les CGU.
> - Secrets : documentés dans un `.env.example`, jamais lus par moi.
> - À confirmer : la règle « API Route dans les use client / Prisma dans les Server Components » signifie que Prisma n'est jamais appelé depuis un composant client, et que les mutations passent par des Route Handlers ou Server Actions.
> - À découper : schéma + auth d'abord, produits ensuite, activités ensuite.

### 5. Définir une activité en fonction d'une trace GPX, d'une VMA ou d'une PMA

L'utilisateur importe une trace GPX, l'application la charge et extrait des données pour définir une durée d'effort en fonction d'une PMA ou d'une VMA et de l'intensité voulu sur cette activité "Endurance Fondamentale" - "Rythme modéré" - "Rythme soutenu" - "Compétition". Prise en compte du poids du cycliste et du vélo et du coefficiant de pénétration dans l'air pour une activité de Cyclisme. Et du style de terrain "Roulant" - "Accidenté" - "Très technique" pour les activités de Trail

Les valeurs relevées permettent de définir un profil altimétrique et les temps de passage par kilomètre.

> - Gros chantier : à découper en sous-specs (parser, modèle physique, UI). C'est le prérequis du point 5.
> - Fichier GPX exploitable dans le dossier /asset.
> - Le parsing GPX se fait sans dépendance avec `DOMParser`. Il faut lisser l'altitude (le bruit GPS gonfle le D+) et gérer les traces sans élévation ou sans timestamps.
> - Cyclisme : modèle de puissance (poids cycliste + vélo, CdA, pente, résistance au roulement) pour passer de la PMA aux temps de passage.
> - Dans le bloc "Paramétrages" de l'utilisateur ajouter une case à cocher "Ajouter un vélo". La case affiche deux champs, "Poids du vélo", "Position aéro"
> - Course/trail : VMA × % d'intensité, avec correction de pente (type Minetti) et facteur terrain Roulant/Accidenté/Très technique. Coefficients à définir.
> - Les 4 niveaux d'intensité doivent être mappés sur des % de PMA/VMA."Endurance fondamentale" = 60% - "Rythme modéré" = 70% - "Rythme soutenu" = 80% - "Compétition" = 85%
> - Une trace GPX révèle des lieux (domicile) : traitement local uniquement tant que le point 6 n'est pas fait.

### 6. Appliquer le plan nutrition de l'activité sur un profil altimétrique et exporter cette vue pour 3 formats différents, "dossard", "top tube vélo", "A4".

En fonction du développement de la fonctionnalité 4. utilisation du profil altimétrique et des valeurs relevés pour appliquer le plan de nutrition défini précédament, afin de fournir un support visuel à l'utilisateur pour qu'il puisse l'exporter sur différents format: "DOSSARD", "TOP TUBE VELO", "A4".

Prise en compte des valeurs altimétriques pour adapter le positionnement des prises solide, décalage de temps si la fin de l'ascension est proche (à définir)

L'export doit permettre à l'utilisateur d'enregistrer une image format .jpeg ou .png

> ⚠️ _Note Claude : pour la règle « à définir » du décalage des prises, je propose une fenêtre de ± X minutes autour d'un sommet. La prise est déplacée vers le sommet ou le début de la descente, sans dépasser le plafond glucides/h._

> 💬 **Commentaire Claude**
>
> - Dépend du point 4 (profil et temps de passage). Réutiliser `NutritionTimeline` autant que possible.
> - Export PNG/JPEG sans dépendance : rendu SVG vers `<canvas>` puis `toBlob`. À éviter : html2canvas, qui demanderait ton accord.
> - Les 3 formats ont des dimensions et une lisibilité très différentes (dossard et top tube : très petit, gros texte, peu d'infos). Dimensions cibles à définir (ex. top tube ≈ 20×3 cm).
> - Ajouter des tests de non-régression sur les plafonds après décalage des prises.

### 7. Créer un feedBack des activités enregistrer afin d'adapter les différents calculs et répartition des produits ingérés.

Afin d'améliorer l'expérience utilisateur, l'activité enregistré peut recevoir un feedBack afin d'adapter les formules de calcul.

Question fixe : [

- "J'ai pas eu assez d'energie" => augmentation du taux de gramme de glucide/heure (en respectant les valeurs limites physiologiques, % à définir)
- "J'ai eu des problème gastrique" => baisse du taux de gramme de glucide/heure (en respectant les valeurs limites physiologiques, % à définir)"
- "J'ai pas de problème gastrique mais la boisson est trop concentré" => ratio boisson énergétique - solide à changer
- "L'intensité est élévé je n'arrive pas à manger solide" => ratio boisson énergétique - solide à changer
- "Je suis vite écoeuré par la répétition du même produit" => plus de variation d'aliment solide
  ]

> 💬 **Commentaire Claude**
>
> - Dépend du point 6 : il faut des activités enregistrées pour y rattacher un feedback.
> - Pour les « % à définir », je propose +10 % / −15 % de g/h par feedback, toujours borné par `CARB_CAP_MIN/MAX`, avec au plus un ajustement par séance pour éviter l'effet yo-yo.
> - Les questions 3 et 4 déclenchent la même action (ratio boisson/solide) : préciser le sens (plus de boisson dans les deux cas ?) ou les fusionner.
> - La question 5 suppose plusieurs produits solides (point 1).
> - Problème gastrique : ajouter un message de prudence (consulter un professionnel si récurrent) pour rester hors du champ santé.
> - L'ajustement est propre à l'utilisateur et doit rester réversible.

### 8. Ajouter une page "After-Activity" qui apport un plan pour la reconstruction des réserves glucidiques, hydriques et des apports en protéines.

### 9. Effectuer un nettoyage pour supprimer le code mort.
