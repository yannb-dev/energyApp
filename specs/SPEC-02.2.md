## SPEC-02.2 — Page /nutrition : nouvelle timeline verticale, jauge d'eau, résultats solide / liquide

### Contexte

SPEC-02.1 est livrée. Cette SPEC fait évoluer la page 2 (`/nutrition`) pour la lisibilité :

- le bloc **Timeline** (deux graphes cumulés) est **remplacé** par une timeline verticale avec icônes ;
- le bloc **Plafonds** gagne une jauge de **consommation hydrique**, sous la jauge Sodium ;
- le bloc **Résultats** présente côte à côte l'**unité solide** et l'**unité liquide** à prendre ;
- deux icônes SVG stylisées sont créées : `barre.svg` (barre énergétique / gel) et `gourde.svg` (boisson). **L'agent doit s'arrêter et obtenir ma confirmation visuelle avant de les ajouter au code.**

Toujours : aucune base de données, aucun réseau, calcul côté client. `lib/nutritionStorage.ts` et la page 1 ne sont pas modifiés. TDD : chaque fichier a son test écrit et vu en échec AVANT le code.

### Timeline (remplace entièrement celle de SPEC-02.1)

`components/NutritionTimeline.tsx` réécrit, `data-testid="nutrition-timeline"`. Les graphes cumulés, la droite de plafond, les marqueurs ronds et la légende de SPEC-02.1 disparaissent. Les données restent lues via `buildNutritionTimeline` (inchangé : `events` avec `kind` et `minute`).

Tout est contenu dans **un seul bloc** (carte « Timeline »).

1. **Récap en haut du bloc** : `N barres` (ou `N unité(s)` selon le type de produit, voir ci-dessous) et `X ml de boisson` au total.
   - N = `plan.units` ; X = `plan.drink.volumeMl` arrondi à l'entier.
   - Sans boisson : seule la partie solide est affichée.
   - Libellé du solide : « barre(s) » si le produit est de type « Barre », « gel(s) » si « Gel », sinon « unité(s) ». Pluriel si N > 1.
   - `data-testid="timeline-recap-solid"` et `data-testid="timeline-recap-drink"`.
2. **Axe vertical central**, partant de **0 min en haut** et descendant : **20 px toutes les 10 min** (constante `TIMELINE_PX_PER_10_MIN = 20`). Hauteur de l'axe = `durée / 10 × 20` px (120 min → 240 px).
   - Repère « 0 min » en haut, repère de fin à la durée. Graduations toutes les 10 min ; libellé de temps affiché toutes les 30 min jusqu'à 180 min, toutes les 60 min au-delà (lisibilité).
3. **Côté gauche** : chaque **prise de produit solide** = icône `barre.svg` placée en face de sa minute, avec l'heure (`20 min`).
4. **Côté droit** : chaque **prise de boisson** = icône `gourde.svg` placée en face de sa minute, avec l'heure (`15 min`) et le volume de la prise (`150 ml`).
5. Position verticale d'une prise : `minute / 10 × 20` px depuis le haut de l'axe. Deux prises à la même minute (une à gauche, une à droite) sont alignées sur la même ligne. Les icônes ne se chevauchent pas (prises espacées d'au moins 15 min ≥ 30 px, icône ≤ 24 px).
6. Accessibilité : `role="img"` + `aria-label` résumant (ex. « 3 prises solides et 8 gorgées sur 120 min, 1200 ml de boisson »). Texte ≥ 12 px, `text-muted`.
7. Responsive : colonnes gauche / droite de largeur égale autour de l'axe, lisible à 320 px, **jamais de défilement horizontal** (le défilement vertical est celui de la page).
8. Animation : apparition en fondu `motion-safe:` uniquement. Couleurs uniquement via les tokens du thème.
9. Les icônes sont des SVG inline (composants de `NutritionIcons.tsx`), `aria-hidden="true"`.

### Plafonds : consommation hydrique

Dans `components/NutritionPlanView.tsx`, **sous la jauge Sodium**, une troisième `CapGauge` :

- texte `Eau : 600 / 750 ml/h`, `data-testid="nutrition-cap-water"` ;
- jauge `role="progressbar"` (`aria-label` « Boisson par heure », `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext`) ;
- `bg-effort` ; `bg-danger` et `text-danger` si dépassement (comme les autres jauges) ;
- sans boisson : `Eau : 0 / 750 ml/h`, jauge vide.

Le plafond hydrique est **une constante** (pas de champ de saisie, pas de stockage). Rappel sous la jauge : « Repère usuel : 400 à 800 ml/h ».

### Résultats : solide et liquide en deux colonnes

Dans le bloc **Résultats**, remplacer l'actuel bloc « unités + boisson » par **deux `div` en row** (`grid grid-cols-2 gap-2`, côte à côte dès 320 px), chacune avec le style `TILE` :

- **div.1 — Solide** : icône barre, titre « Solide », unités à prendre en grand (`text-effort`, `data-testid="nutrition-units"`), « unité(s) », fréquence « Une prise toutes les … min » (`nutrition-interval`).
- **div.2 — Liquide** : icône gourde, titre « Liquide », volume à prendre en grand (`data-testid="nutrition-drink-volume"`) avec « ml », puis « N prises · X g de poudre ». Sans boisson : « Aucune boisson ».

Sous cette ligne restent inchangés : facteur limitant, tuiles Glucides / Sodium ingérés, énergie, alertes (`nutrition-warning`). Les `data-testid` existants sont conservés.

### Icônes SVG — validation visuelle obligatoire

Fichiers : `public/icons/barre.svg` et `public/icons/gourde.svg`.

- `viewBox="0 0 24 24"`, trait `currentColor` (aucune valeur hexadécimale), `fill="none"`, `stroke-width` ≈ 1,7, bouts arrondis : même style que `CerealBarIcon` et `BottleIcon`.
- `barre.svg` : barre énergétique emballée (corps rectangulaire arrondi, extrémités de l'emballage pincées) reconnaissable aussi comme gel.
- `gourde.svg` : gourde de sport (bouchon, embout, corps avec graduation).

**Procédure imposée à l'agent :**

1. Créer les deux SVG dans le dossier scratchpad (pas encore dans le projet).
2. Générer un aperçu PNG (taille réelle 24 px, agrandi, fond sombre du thème) avec `inkscape` ou `convert`, et le montrer via `Read`.
3. **S'arrêter et me demander confirmation.** Itérer tant que je ne valide pas.
4. Seulement après mon accord : copier dans `public/icons/` et ajouter `EnergyBarIcon` et `FlaskIcon` dans `components/NutritionIcons.tsx` (mêmes tracés, SVG inline).

### Logique à ajouter dans `lib/nutrition.ts` (ajouts uniquement, testés d'abord)

- `HYDRATION_CAP_ML_PER_HOUR = 750` ; `HYDRATION_CAP_RECOMMENDED = { min: 400, max: 800 }` ; `TIMELINE_PX_PER_10_MIN = 20`.
- `computeHydrationRate(plan: NutritionPlan, minutes: number): number` → ml/h = `plan.drink.volumeMl / (minutes / 60)` ; `0` si pas de boisson ou durée ≤ 0.
- `timelineOffsetPx(minute: number): number` → `minute / 10 × TIMELINE_PX_PER_10_MIN` (utilisé pour l'axe et les prises).
- Réutiliser `computeCapUsage` pour la jauge d'eau.

### Exemples de référence (tests)

1. 120 min, sans boisson, barre 25 g / 0,25 g de sel → récap « 4 barres », pas de récap boisson ; 4 icônes à gauche aux minutes 15, 45, 75, 105 ; aucune à droite ; `Eau : 0 / 750 ml/h`.
2. 120 min, boisson SPEC-02 + même barre → 3 icônes barre à 20, 60, 100 min (gauche) ; 8 icônes gourde à 15, 30 … 120 min (droite) ; récap « 3 barres » et « 1200 ml de boisson » ; `Eau : 600 / 750 ml/h`.
3. `timelineOffsetPx(0)` = 0 ; `timelineOffsetPx(10)` = 20 ; `timelineOffsetPx(120)` = 240.
4. `computeHydrationRate` : 1200 ml sur 120 min → 600 ; 900 ml sur 60 min avec plafond 750 → `computeCapUsage(900, 750).exceeded` vrai.
5. Résultats : `nutrition-units` et `nutrition-drink-volume` sont dans deux conteneurs distincts, dans une même grille 2 colonnes.

### Partie A — Toi (avant)

Rien à installer. Vérifier que `npm run test:run` passe avant de lancer l'agent.

### Partie B — Agent (TDD strict, un fichier à la fois, dans cet ordre)

1. `lib/nutrition.test.ts` (ajouts) → `lib/nutrition.ts` (ajouts).
2. Création des SVG dans le scratchpad, aperçu PNG, **arrêt et confirmation visuelle**. Puis `public/icons/*.svg` et `components/NutritionIcons.tsx` (ajouts).
3. `components/NutritionTimeline.test.tsx` **réécrit** → `components/NutritionTimeline.tsx` **réécrit**.
4. `components/NutritionPlanView.test.tsx` (ajouts, adaptation des assertions Résultats) → `components/NutritionPlanView.tsx` (jauge eau, Résultats en 2 colonnes, appel de la nouvelle timeline).

`NutritionTimeline.test.tsx` est réécrit car les graphes cumulés de SPEC-02.1 sont volontairement supprimés.

### Fichiers à créer / modifier

- specs/SPEC-02.2.md (créé)
- lib/nutrition.ts + lib/nutrition.test.ts (modifier : ajouts uniquement)
- components/NutritionIcons.tsx (modifier : ajouts)
- components/NutritionTimeline.tsx + components/NutritionTimeline.test.tsx (réécrire)
- components/NutritionPlanView.tsx + components/NutritionPlanView.test.tsx (modifier)
- public/icons/barre.svg et public/icons/gourde.svg (créer, après validation visuelle)

`app/nutrition/page.tsx`, `lib/nutritionStorage.ts`, `lib/energy.ts`, `lib/sports.ts`, la page 1 et leurs tests : inchangés.

### Contraintes

- TypeScript strict, pas de `any`
- Test écrit et vu en échec avant chaque code
- Formules uniquement dans `lib/`, jamais dans le JSX
- Aucune nouvelle dépendance (SVG fait main)
- Aucun `fetch`, aucune API Route
- Couleurs uniquement via les tokens du thème : aucune valeur hexadécimale, aucune classe `gray-*`, `bg-black`, `bg-white`, `text-black`, `text-white` dans les `.tsx`
- Mobile-first, cibles tactiles ≥ 44 px, focus visible, animations `motion-safe:` uniquement
- Ne jamais ajouter les SVG au projet avant ma confirmation visuelle
- Ne modifier aucun autre fichier que ceux listés. Pas de commit ni de push
- Commandes autorisées (liste fermée) : `npm run typecheck` · `npm run lint` · `npm run test:run` · `git status` · `git diff`, plus `inkscape` / `convert` uniquement pour l'aperçu des SVG dans le scratchpad. Toute autre commande : s'arrêter et demander. Pas de `npm run build`
- Tout écart par rapport à la SPEC : s'arrêter et le signaler, ne pas corriger en silence

### Critères d'acceptation (vérifiables par commande)

- [ ] `npm run test:run`, `npm run typecheck` et `npm run lint` passent sans erreur
- [ ] Tests `lib/nutrition.ts` : exemples 3 et 4
- [ ] Test : la timeline affiche un récap (barres et ml), autant d'icônes barre à gauche que de prises solides et autant de gourdes à droite que de prises boisson
- [ ] Test : hauteur de l'axe = `durée / 10 × 20` px (120 min → 240 px) ; position d'une prise à `minute / 10 × 20` px
- [ ] Test : `nutrition-cap-water` présent après `nutrition-cap-sodium`, avec `role="progressbar"` ; dépassement → classe `danger`
- [ ] Test : Résultats en deux colonnes (solide / liquide) ; « Aucune boisson » sans boisson
- [ ] Les SVG ont été validés visuellement par moi avant d'être ajoutés
- [ ] `grep -nE "#[0-9a-fA-F]{3,8}|gray-|bg-black|bg-white|text-black|text-white" components app` ne retourne rien
- [ ] `grep -rn "fetch" app components lib` ne retourne rien
- [ ] `git diff --stat` : seuls les fichiers listés sont modifiés

### Partie C — Toi (après)

`npm run dev` : saisir produit et boisson → « Calculer ma nutrition » → vérifier sur `/nutrition` la timeline (récap, axe, icônes gauche / droite), la jauge d'eau sous Sodium et les deux colonnes de Résultats. Contrôler le rendu à 320 / 390 / 768 px, avec une durée courte (30 min) et longue (360 min), et `prefers-reduced-motion`. Commit uniquement après `npx tsc --noEmit` et les tests, avec ton accord.

### Hors périmètre

Plafond hydrique saisissable ou persisté, plusieurs produits solides, zoom ou défilement interne de la timeline, export du plan, thème clair, modification de la logique de calcul de SPEC-02 et de `buildNutritionTimeline`.
