## SPEC-07.5 — Interface : import GPX, intensité, profil altimétrique, temps de passage

### Contexte

Dernière brique de [SPEC-07](SPEC-07.md). Elle assemble les couches précédentes ([07.1](SPEC-07.1.md) trace, [07.2](SPEC-07.2.md) profil athlète, [07.3](SPEC-07.3.md) course/trail, [07.4](SPEC-07.4.md) vélo) dans le bloc **Activité** : l'utilisateur importe un `.gpx`, choisit une intensité, lit la durée estimée, le profil altimétrique et les temps de passage, et la durée alimente la nutrition comme la saisie manuelle de SPEC-05.

Aucune base de données, aucun réseau, la trace n'est jamais stockée. TDD : chaque fichier a son test écrit et vu en échec AVANT le code.

### Comportement

**Sélecteur de mode** (bloc Activité, sous le choix du sport) :

- Visible seulement si `supportsGpx(sport)` (07.2). Deux options, `role="radiogroup"` : « Saisie manuelle » (défaut) et « Trace GPX ».
- Mode manuel : comportement SPEC-05 **strictement inchangé** (distance, vitesse / allure, durée dérivée).
- Mode GPX : les champs distance et vitesse sont remplacés par le composant `GpxActivity` ; la distance et la durée viennent de la trace et du modèle.
- Changer de sport vers un sport sans GPX (`other`) repasse en mode manuel. Changer de mode ne vide pas les champs manuels.
- L'état (mode, fichier, intensité, terrain) est en mémoire uniquement, non persisté.

**Composant `GpxActivity`** (`components/GpxActivity.tsx`), props : `sport: Sport`, `profile: { weightKg: string }`, `athlete: AthleteSettings`, `onMinutesChange: (minutes: string) => void`.

1. **Import** : `<input type="file" accept=".gpx,application/gpx+xml">` avec `<label>` « Trace GPX ». Lecture par `file.text()` puis `parseGpx` puis `buildTrack` (07.1). Aucune lecture en dehors d'un événement utilisateur. Erreurs `GpxError` → message `role="alert"` en français (« Fichier trop volumineux (10 Mo max). », « Fichier GPX illisible. », « Aucune trace trouvée dans ce fichier. », « La trace contient trop peu de points. », « Coordonnées invalides dans la trace. »).
2. **Bornes** : distance hors `DISTANCE_KM_MIN/MAX` (`lib/effort.ts`) ou durée hors `MINUTES_MIN/MAX` → message `role="alert"` (« La durée calculée doit être entre 1 minute et 24 h. »), pas de résultat.
3. **Intensité** : `role="radiogroup"` avec les 4 `INTENSITY_LEVELS` (libellé + pourcentage), « Rythme modéré » par défaut.
4. **Terrain** : `role="radiogroup"` « Terrain » avec `TERRAIN_TYPES`, affiché seulement pour la famille `trail` ; défaut « Roulant ».
5. **Données requises** :
   - course et trail : `athlete.vmaKmh` valide, sinon message « Renseigne ta VMA dans le bloc Paramètres. » avec bouton « Modifier mes paramètres » (focus) ;
   - vélo : `athlete.pmaWatts` valide et poids du profil valide, sinon « Renseigne ta PMA et ton poids dans le bloc Paramètres. » ; si `hasBike`, `bikeKg` et `bikePosition` ; sinon `DEFAULT_BIKE_KG` et CdA « Mains en bas » (07.4 règle 8) avec mention visible « Vélo par défaut : 9 kg, position mains en bas. »
6. **Calcul** : dès que trace + données requises sont valides, recalcul automatique à chaque changement d'intensité ou de terrain (`computeRunPacing` ou `computeBikePacing`). Aucun calcul avant l'import.
7. **Liaison nutrition** : `onMinutesChange(String(pacing.minutes))` à chaque calcul valide, `onMinutesChange("")` si le résultat devient invalide, ou si la trace est retirée, ou à la sortie du mode GPX. Même mécanisme que SPEC-05 : « Calculer ma nutrition » (SPEC-02.1) lit la durée sans changement.
8. **Résumé** : distance (km, 1 décimale), D+ et D− (m, entiers), durée (`formatDuration`), vitesse moyenne (km/h) ; ligne « Altitude absente de la trace : profil plat, durée sans effet de pente. » si `hasElevation` est faux ; mention « Estimation indicative. »
9. **Profil altimétrique** (`components/ElevationProfile.tsx`), SVG inline écrit à la main, `data-testid="gpx-profile"`, style de `NutritionTimeline.tsx` :
   - axe X en km, axe Y en m (marge de 10 %), courbe `stroke-effort`, aire légèrement teintée via un token du thème ;
   - repères verticaux tous les 1, 5 ou 10 km selon la distance ;
   - `role="img"` et `aria-label` résumé (ex. « Profil de 42,2 km, altitude de 120 à 640 m, 850 m de dénivelé positif ») ;
   - `viewBox` fixe, `w-full h-auto`, lisible à 320 px, texte ≥ 12 px, jamais de défilement horizontal ;
   - pas de profil si `hasElevation` est faux ;
   - animation en fondu `motion-safe:` uniquement.
10. **Temps de passage** (`components/SplitsTable.tsx`), `<table>` accessible (`<caption>` « Temps de passage par kilomètre », `scope="col"`), `data-testid="gpx-splits"` : colonnes « Km », « Temps de passage » (`h:mm:ss` cumulé), « Allure » (`formatPace`) ou « Vitesse » (km/h, pour le vélo), « D+ ». Défilement vertical dans un conteneur de hauteur bornée (≈ 20 rem), jamais horizontal ; le dernier kilomètre partiel affiche sa distance (« 42,2 »).
11. **Infobulles** : un `InfoTooltip` « ? » (point 1) sur le bloc Intensité (« Pourcentage de la VMA ou de la PMA ») et sur le résumé (méthode : pente Minetti ou modèle de puissance) ; textes dans `lib/helpTexts.ts` (ajouts uniquement).
12. **Vie privée** : une mention « La trace reste sur ton appareil, elle n'est ni envoyée ni enregistrée. » est visible près de l'import. Le composant ne conserve pas le contenu du fichier au-delà de la `Track` en mémoire et ne l'écrit nulle part.

**Câblage** :

- `components/EnergyCalculator.tsx` (modifier) : sélecteur de mode, rend `GpxActivity` en mode GPX, expose déjà `onAthleteChange` (07.2) ; le poids du profil et `athlete` sont lus depuis son état. En mode GPX, le bouton « Calculer » du bloc Activité ne déclenche que le calcul énergétique : la durée vient du composant GPX (aucune saisie de distance / vitesse n'est requise).
- `components/HomeContent.tsx` : aucun changement fonctionnel prévu (la durée remonte déjà par `onMinutesChange`). Si un changement s'avère nécessaire, s'arrêter et le signaler.

### Helpers de présentation : `lib/pacingFormat.ts` (créer)

- `formatClock(seconds: number): string` : « 1:05:09 » (`h:mm:ss`), « 4:07 » sous 1 h.
- `buildProfileSummary(track: Track): string` : texte de l'`aria-label` du profil.

### Exemples de référence (à couvrir par des tests)

1. `formatClock(3214)` → `"53:34"` ; `formatClock(3909)` → `"1:05:09"` ; `formatClock(59)` → `"0:59"`.
2. Course, trace plate de 10 km, VMA 16, « Rythme modéré » (SPEC-07.3 ex. 1) → durée affichée « 54 min », `onMinutesChange("54")`.
3. Vélo, trace plate de 10 km, PMA 300, poids 75, vélo 8 kg, « Mains en bas », « Rythme modéré » (SPEC-07.4 ex. 6) → durée « 17 min », `onMinutesChange("17")`.
4. Passer de « Rythme modéré » à « Compétition » (course, ex. 2 de 07.3) → `onMinutesChange("44")`.
5. Trail : changer le terrain de « Roulant » à « Très technique » augmente la durée affichée ; le groupe « Terrain » n'existe pas pour la course ni le vélo.
6. Course sans VMA enregistrée → message « Renseigne ta VMA… », aucun résultat, `onMinutesChange("")`.
7. Vélo sans PMA → message PMA et poids ; sans vélo déclaré → mention « Vélo par défaut : 9 kg… » et calcul fait avec 9 kg.
8. Fichier invalide (texte « abc ») → « Fichier GPX illisible. » ; fichier sans trace → « Aucune trace trouvée… » ; aucun résultat.
9. Trace > 1000 km ou durée > 24 h → message de borne, `onMinutesChange("")`.
10. Trace sans altitude → mention « Altitude absente… », pas de `gpx-profile`, tableau et durée affichés.
11. `gpx-profile` : `role="img"`, `aria-label` contenant la distance et le D+ ; `gpx-splits` : une ligne par kilomètre, dernier km partiel annoncé.
12. Sport « Randonnée » ou « Ski de randonnée » → pas de sélecteur de mode ; passer de « Course » en mode GPX à « Randonnée » → retour en mode manuel et `onMinutesChange` ne renvoie pas l'ancienne durée.
13. Mode manuel : tous les tests SPEC-05 de `EnergyCalculator.test.tsx` restent verts sans modification.
14. Intégration (`HomeContent`) : trace importée + VMA + intensité → clic « Calculer ma nutrition » → `push("/nutrition?min=54")` (mêmes données que l'exemple 2).
15. Retirer le fichier ou changer de mode → `onMinutesChange("")`.
16. Aucun `localStorage` ni `fetch` appelé pendant tout le parcours (espions dans le test).

### Partie A — Toi (avant)

Vérifier que SPEC-07.1 à 07.4 sont livrées (`npm run test:run` vert). Préparer un vrai fichier GPX court (≈ 10 km, avec altitude) et un sans altitude pour la vérification manuelle ; ne pas les committer (lieux).

### Partie B — Agent (TDD strict, un fichier à la fois, dans cet ordre)

1. `lib/pacingFormat.test.ts` (exemple 1) → `lib/pacingFormat.ts`.
2. `lib/helpTexts.test.ts` (ajouts : textes intensité et méthode non vides) → `lib/helpTexts.ts` (ajouts).
3. `components/ElevationProfile.test.tsx` (exemples 10, 11) → `components/ElevationProfile.tsx`.
4. `components/SplitsTable.test.tsx` (exemple 11) → `components/SplitsTable.tsx`.
5. `components/GpxActivity.test.tsx` (exemples 2 à 11, 15, 16 ; fichiers construits avec `new File([...], "t.gpx")`) → `components/GpxActivity.tsx`.
6. `components/EnergyCalculator.test.tsx` (ajouts : exemples 12, 13 ; `GpxActivity` peut être mocké pour ces tests) → `components/EnergyCalculator.tsx`.
7. `components/HomeContent.test.tsx` (ajout : exemple 14) → `components/HomeContent.tsx` seulement si le test montre un besoin ; sinon aucun changement.

### Fichiers à créer / modifier

- specs/SPEC-07.5.md (créé)
- lib/pacingFormat.ts + lib/pacingFormat.test.ts (créer)
- lib/helpTexts.ts + lib/helpTexts.test.ts (modifier : ajouts uniquement)
- components/ElevationProfile.tsx + components/ElevationProfile.test.tsx (créer)
- components/SplitsTable.tsx + components/SplitsTable.test.tsx (créer)
- components/GpxActivity.tsx + components/GpxActivity.test.tsx (créer)
- components/EnergyCalculator.tsx + components/EnergyCalculator.test.tsx (modifier)
- components/HomeContent.tsx + components/HomeContent.test.tsx (modifier seulement si l'exemple 14 le requiert)

`lib/gpx.ts`, `lib/pacingRun.ts`, `lib/pacingBike.ts`, `lib/intensity.ts`, `lib/athleteStorage.ts`, `lib/effort.ts`, `lib/nutrition*.ts`, `app/**` : inchangés. Si un test existant hors liste casse, s'arrêter et le signaler.

### Contraintes

Voir [SPEC-07](SPEC-07.md) (contraintes communes). En plus :

- Aucune formule dans le JSX : durée, vitesses et profils viennent de `lib/`.
- Le composant n'accède pas au `localStorage` ; les données athlète lui sont passées en props.
- Aucun `fetch`, aucune API Route ; la lecture du fichier utilise uniquement `File.text()`.
- Chaque champ garde son `<label>` ; les libellés ne doivent pas entrer en collision avec le calculateur ni la nutrition (`getByLabelText` unique) : « Trace GPX », « Intensité », « Terrain » sont imposés.
- Couleurs uniquement via les tokens du thème ; SVG avec classes `stroke-*` / `fill-*`.
- `data-testid` préfixés `gpx-` : `gpx-profile`, `gpx-splits`, `gpx-summary`, `gpx-duration`, `gpx-error`.
- Mobile-first : aucun défilement horizontal de la page à 320 px, y compris pour le tableau.
- Wording : estimation indicative, pas de conseil d'entraînement ni médical.

### Critères d'acceptation (vérifiables par commande)

- [ ] `npm run test:run`, `npm run typecheck` et `npm run lint` passent
- [ ] Tests des exemples 1 à 16
- [ ] `grep -rn "localStorage" components app` ne retourne rien
- [ ] `grep -rn "fetch" app components lib` ne retourne rien
- [ ] `grep -nE "#[0-9a-fA-F]{3,8}|gray-|bg-black|bg-white|text-black|text-white" components app` ne retourne rien
- [ ] `git diff --stat` : seuls les fichiers listés sont modifiés, `package.json` inchangé, les tests SPEC-05 et SPEC-06 existants ne sont pas modifiés (hors ajouts)

### Partie C — Toi (après)

`npm run dev` avec ton vrai GPX : course (VMA), trail (terrain), vélo (PMA, avec et sans vélo déclaré), puis « Calculer ma nutrition » → plan sur la durée estimée. Vérifier à 320 / 390 / 768 px (profil lisible, tableau sans défilement horizontal), le clavier (radiogroups, focus après message VMA), `prefers-reduced-motion`, le retour navigateur depuis `/nutrition`, et dans les DevTools qu'aucune requête réseau ni clé de stockage n'est créée par l'import. Commit uniquement après `npx tsc --noEmit` et les tests, avec ton accord.

### Hors périmètre

Superposition du plan de nutrition sur le profil et export dossard / top tube / A4 (point 6), enregistrement de la trace ou de l'activité (points 4 et 6), carte de la trace, glisser-déposer, comparaison avec le temps réel du fichier (timestamps), exports (CSV, GPX), conseil d'entraînement ou médical.
