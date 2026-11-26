## SPEC-09 — Point 8 : trace GPX pour le ski de randonnée

### Contexte

Point 8 de [evolution-app.md](evolution-app.md). Le ski de randonnée est classé `family: "other"` dans `lib/sports.ts`, donc `supportsGpx()` le refuse et seule la saisie manuelle est possible.

**Méthode retenue** :

- **Montée et plat** : méthode **Munter**, celle des guides et du CAF/CAS. On compte en unités d'effort : 1 km à plat ou 100 m de D+ valent chacun 1 unité. La vitesse en unités par heure dépend de l'intensité.
- **Descente** : vitesse verticale et vitesse horizontale maximale selon un **niveau de ski**.
- **Transitions** (peaux, chaussures) : un temps fixe à chaque changement de phase.
- **Dépense par phase** : un MET pour la montée, un MET pour la descente et un MET pour les transitions. La moyenne, pondérée par la durée de chaque phase, remplace le MET unique du sport pour le coût de l'effort.

Aucune base de données, aucun réseau, la trace n'est jamais stockée. TDD : chaque fichier a son test écrit et vu en échec AVANT le code.

### Comportement

**Sports** (`lib/sports.ts`) :

- On ajoute la famille `"skimo"` au type `Sport["family"]`. Les deux entrées « Ski de randonnée (modéré/intense) » passent en `family: "skimo"`.
- On ajoute un champ optionnel `metPhases?: { ascent: number; descent: number }` :
  - modéré : `{ ascent: 8, descent: 5.3 }` ;
  - intense : `{ ascent: 11, descent: 8 }` (Compendium : descente à ski modérée 5,3, vigoureuse 8).

  Le champ `met` existant ne change pas : il sert encore à la saisie manuelle.

- `supportsGpx()` accepte aussi `"skimo"`. La randonnée reste `other`.

**Niveaux de ski** (`lib/intensity.ts`, ajout) :

```ts
export const SKI_LEVELS = [
  {
    id: "beginner",
    label: "Débutant",
    descentVerticalMh: 1200,
    descentMaxKmh: 10,
  },
  {
    id: "intermediate",
    label: "Intermédiaire",
    descentVerticalMh: 2000,
    descentMaxKmh: 18,
  },
  { id: "expert", label: "Expert", descentVerticalMh: 3000, descentMaxKmh: 30 },
] as const;
export type SkiLevelId = (typeof SKI_LEVELS)[number]["id"];
```

**Modèle** (`lib/pacingSkimo.ts`, créer, pur, sans React). Toutes les constantes sont exportées avec un commentaire « à calibrer » :

- `SKIMO_ASCENT_UNITS_PER_HOUR: Record<IntensityId, number>` = `{ endurance: 3.5, moderate: 4, sustained: 5, race: 6.5 }`
- `SKIMO_PHASE_MIN_VERTICAL_M = 50`
- `SKIMO_TRANSITION_MIN = 8`
- `SKIMO_TRANSITION_MET = 2.5`

Règles de calcul :

1. **Dénivelé d'un segment** : `riseM = lengthKm × 1000 × gradePct / 100`. Il vaut 0 si `track.hasElevation` est faux.
2. **Phases** : on attribue à chaque segment une phase, `"ascent"` ou `"descent"`.
   - On repère les sommets et les creux sur `segments[].eleM` avec une hystérésis de `SKIMO_PHASE_MIN_VERTICAL_M`. C'est la même logique par extremums que `lib/gpx.ts`, avec un autre seuil.
   - Un segment situé entre un creux et le sommet suivant est en montée. Un segment situé entre un sommet et le creux suivant est en descente.
   - Les segments placés avant la première direction confirmée prennent cette direction. Si aucune direction n'est jamais confirmée, ou si `hasElevation` est faux, tout est en `"ascent"`.
3. **Segment en montée** : `unités = lengthKm + max(0, riseM) / 100`, puis `durée (h) = unités / SKIMO_ASCENT_UNITS_PER_HOUR[intensity]`.
4. **Segment en descente** :
   - si `riseM ≤ 0` : `durée (h) = max(−riseM / descentVerticalMh, lengthKm / descentMaxKmh)` ;
   - si `riseM > 0` (petite remontée pendant la descente) : la règle 3 s'applique.
5. **Transitions** : chaque inversion de phase confirmée ajoute `SKIMO_TRANSITION_MIN`, comptées dans le kilomètre où se trouve l'extremum. Rien n'est ajouté au départ ni à l'arrivée.
6. **Sortie** : `computeSkimoPacing(track, { intensity, skiLevel }): PacingResult`.
   - Les splits sont découpés par km comme dans `computeRunPacing`, avec l'index tiré de `segment.startKm`.
   - Le résultat contient en plus `phases: { ascentSec, descentSec, transitionSec, transitions }`.
   - Le type `PacingResult` (dans `lib/pacingRun.ts`) reçoit un champ optionnel `phases?` (ajout seulement). Les autres modèles ne le remplissent pas.
7. **Erreurs** : une intensité ou un niveau inconnu lève une `Error`, comme dans `pacingRun.ts`.
8. **MET moyen** : `skimoAverageMet(phases, metPhases): number`, moyenne pondérée par `ascentSec`, `descentSec` et `transitionSec`. Si la durée totale vaut 0, la fonction renvoie `metPhases.ascent`.

**Calcul GPX** (`lib/gpxPacing.ts`) :

- `GpxOutcomeInput` reçoit `skiLevel: SkiLevelId`.
- Nouvelle branche `sport.family === "skimo"` :
  - pas de VMA ni de PMA requise ;
  - appel de `computeSkimoPacing` ;
  - mêmes contrôles de bornes (distance, `MINUTES_MIN/MAX`, `BOUNDS_MESSAGE`).
- Le résultat `ready` reçoit un champ optionnel `met?: number`, égal à `skimoAverageMet(...)` si `sport.metPhases` existe, absent sinon. `bike` ne change pas.

**État de l'activité** (`lib/activity.ts`) :

- `ActivityState` reçoit `skiLevel: SkiLevelId` (par défaut `"intermediate"`) et `gpxMet: number | null` (par défaut `null`).
- Nouvelles actions :
  - `{ type: "skiLevelChanged"; skiLevel }` ;
  - `{ type: "gpxMetChanged"; met: number | null }`.
- `gpxMet` est remis à `null` aux mêmes endroits que `gpxMinutes` : sport sans GPX, passage en mode manuel, `reset`.
- Nouveau sélecteur `selectMet(state): number | null` :
  - `null` si aucun sport n'est choisi ;
  - `gpxMet` en mode GPX si `gpxMet !== null` ;
  - `sport.met` dans tous les autres cas.
- `components/providers/ActivityProvider.tsx` expose `met` (via `useMemo`, comme `minutes`).

**Composant `GpxActivity`** (`components/GpxActivity.tsx`) :

1. Pour `skimo`, on affiche un `role="radiogroup"` « Niveau de ski » à la place du groupe « Terrain ».
   - Identifiants : `gpx-ski-titre`, puis `gpx-ski-{id}` et `name="gpx-ski"` pour chaque option.
   - Valeur par défaut : « Intermédiaire ».
   - Le changement envoie l'action `skiLevelChanged`.
2. Pour `skimo`, le texte secondaire des boutons d'intensité affiche la vitesse verticale équivalente (`units × 100`, par exemple « ≈ 400 m/h ») au lieu du pourcentage de VMA/PMA.
3. Pour `skimo`, le résumé `gpx-summary` ajoute une ligne `data-testid="gpx-phases"`, par exemple « Montée 2 h 10 · Descente 35 min · 3 transitions ». Les durées sont formatées avec `formatDuration`.
4. Liaison : l'effet existant qui envoie les minutes envoie aussi `gpxMetChanged`, avec `outcome.met` si le résultat est prêt et `met` présent, `null` sinon.
5. Infobulles : pour `skimo`, `SKIMO_INTENSITY_HELP` remplace `INTENSITY_HELP` et `SKIMO_METHOD_HELP` remplace `PACING_METHOD_HELP` (ajouts dans `lib/helpTexts.ts`, avec le `DISCLAIMER`).

**Résultats** :

- `components/results/EnergySummary.tsx` utilise `met` du provider au lieu de `sport.met`. Si `met` vaut `null`, le message habituel « Renseigne ton profil… » s'affiche.
- `components/results/CourseProfile.tsx` :
  - passe `skiLevel: activity.skiLevel` à `computeGpxOutcome` ;
  - pour `skimo`, le tableau des temps de passage affiche la colonne « Vitesse » (prop `bike` de `SplitsTable` à `true` pour `bike` et `skimo`).

Le transfert vers `/nutrition` ne change pas : `selectMinutes` couvre déjà le mode GPX dès que `supportsGpx` est vrai.

### Exemples de référence (à couvrir par des tests)

Pour `pacingSkimo`, les `Track` sont construites à la main (segments de 0,1 km), sans passer par `buildTrack`, pour éviter l'effet du lissage.

1. Plat de 4 km, avec altitude constante, en « Rythme modéré » → 60 min, `phases.transitions = 0`, `descentSec = 0`.
2. Rampe de 1 km à +40 % (D+ = 400 m), « Rythme modéré » → (1 + 4) / 4 h = **75 min**. En « Endurance » → **86 min** (arrondi). En « Compétition » → **46 min**.
3. Descente de 2,5 km à −40 % (D− = 1000 m) → Intermédiaire **30 min** · Débutant **50 min** · Expert **20 min**.
4. Descente douce de 5 km à −6 % (D− = 300 m), Intermédiaire → c'est le plafond horizontal qui s'applique : 5 / 18 h ≈ **16,7 min** (`descentSec ≈ 1000`).
5. Aller-retour (+40 % sur 1 km, puis −40 % sur 1 km), modéré et intermédiaire → montée 4500 s, transition 480 s, descente 720 s, **total 95 min**, `transitions = 1`.
6. Plat de 2 km avec des bosses de ± 20 m → `transitions = 0`, `descentSec = 0`.
7. `hasElevation: false`, 4 km → 60 min, aucune descente ni transition.
8. `skimoAverageMet({ ascentSec: 3600, descentSec: 1800, transitionSec: 480 }, { ascent: 8, descent: 5.3 })` ≈ **6,72** (à 0,01 près). Si la durée totale vaut 0, le résultat est 8.
9. Intensité inconnue ou niveau de ski inconnu → `Error`.
10. `supportsGpx` est vrai pour les deux sports « Ski de randonnée » et faux pour « Randonnée ».
11. `computeGpxOutcome` en skimo avec un `athlete` vide (sans VMA ni PMA) → `kind: "ready"` avec `met` défini. Une trace de plus de 24 h → `BOUNDS_MESSAGE`.
12. Reducer :
    - `skiLevelChanged` met à jour `skiLevel` ;
    - `gpxMetChanged` met à jour `gpxMet` ;
    - passer en mode manuel ou choisir « Randonnée » remet `gpxMet` à `null` ;
    - passer de « Ski de randonnée (modéré) » à « (intense) » en mode GPX garde le mode GPX et la trace.
13. `selectMet` : saisie manuelle de ski → `sport.met` (7) ; mode GPX avec `gpxMet = 6.72` → 6,72 ; aucun sport → `null`.
14. `GpxActivity` en ski : le groupe « Niveau de ski » est présent, le groupe « Terrain » est absent, `gpx-phases` est affiché, aucun message VMA. Passer à « Expert » réduit la durée affichée sur une trace avec descente.
15. `EnergySummary` : poids 70 kg, 98 min, `met` 6,72 → 768 kcal (au lieu de 800 avec un MET de 7).
16. `CourseProfile` en ski : le tableau des temps de passage affiche « Vitesse » et pas « Allure ».
17. Aucun appel à `localStorage` ni à `fetch` pendant le parcours GPX ski (espions dans le test `GpxActivity`).

### Partie A — Toi (avant)

- Vérifier que `npm run test:run` est vert sur `main`.
- Préparer un vrai GPX de ski de rando, avec au moins une montée, une descente et une remontée, pour la vérification manuelle. Ne pas le committer (il révèle des lieux).

### Partie B — Agent (TDD strict, un fichier à la fois, dans cet ordre)

1. `lib/intensity.test.ts` (ajouts : `SKI_LEVELS`) → `lib/intensity.ts` (ajouts).
2. `lib/sports.test.ts` (exemple 10, `metPhases`) → `lib/sports.ts`.
3. `lib/pacingSkimo.test.ts` (exemples 1 à 9) → `lib/pacingSkimo.ts`, puis ajout du champ `phases?` dans `lib/pacingRun.ts` (type seulement).
4. `lib/gpxPacing.test.ts` (ajouts : exemple 11) → `lib/gpxPacing.ts`.
5. `lib/activity.test.ts` (ajouts : exemples 12, 13) → `lib/activity.ts`.
6. `components/providers/ActivityProvider.test.tsx` (ajout : `met` exposé) → `ActivityProvider.tsx`.
7. `lib/helpTexts.test.ts` (ajouts : textes skimo non vides) → `lib/helpTexts.ts` (ajouts seulement).
8. `components/GpxActivity.test.tsx` (ajouts : exemples 14, 17) → `components/GpxActivity.tsx`.
9. `components/results/EnergySummary.test.tsx` (exemple 15) → `EnergySummary.tsx`.
10. `components/results/CourseProfile.test.tsx` (exemple 16) → `CourseProfile.tsx`.

### Fichiers à créer / modifier

- specs/SPEC-09.md (créé)
- lib/pacingSkimo.ts + lib/pacingSkimo.test.ts (créer)
- lib/intensity.ts + lib/intensity.test.ts (modifier : ajouts seulement)
- lib/sports.ts + lib/sports.test.ts (modifier)
- lib/pacingRun.ts (modifier : champ optionnel `phases?` dans `PacingResult`, rien d'autre)
- lib/gpxPacing.ts + lib/gpxPacing.test.ts (modifier)
- lib/activity.ts + lib/activity.test.ts (modifier)
- lib/helpTexts.ts + lib/helpTexts.test.ts (modifier : ajouts seulement)
- components/providers/ActivityProvider.tsx + ActivityProvider.test.tsx (modifier)
- components/GpxActivity.tsx + components/GpxActivity.test.tsx (modifier)
- components/results/EnergySummary.tsx + EnergySummary.test.tsx (modifier)
- components/results/CourseProfile.tsx + CourseProfile.test.tsx (modifier)

Inchangés : `lib/gpx.ts`, `lib/pacingBike.ts`, `lib/energy.ts`, `lib/effort.ts`, `lib/athleteStorage.ts`, `lib/nutrition*.ts`, `components/SplitsTable.tsx`, `components/ElevationProfile.tsx`, `components/forms/*`, `app/**`. Si un test existant hors de cette liste casse, s'arrêter et le signaler.

### Contraintes

Voir [SPEC-07](SPEC-07.md) (contraintes communes). En plus :

- Aucune formule dans le JSX : durées, phases et MET viennent de `lib/`.
- Aucune nouvelle dépendance. Aucun `fetch`, aucun `localStorage` dans les composants.
- Les constantes du modèle sont nommées et exportées, sans valeurs magiques dans les fonctions.
- Libellés imposés et uniques : « Niveau de ski ». « Trace GPX » et « Intensité » ne changent pas.
- `data-testid` préfixés `gpx-` : ajout de `gpx-phases`.
- Couleurs uniquement via les tokens du thème. Mobile-first, aucun défilement horizontal à 320 px.
- Wording : estimation indicative. Pas de conseil d'entraînement, médical ni de sécurité en montagne (avalanche, météo).

### Critères d'acceptation (vérifiables par commande)

- [ ] `npm run test:run`, `npm run typecheck` et `npm run lint` passent
- [ ] Tests des exemples 1 à 17
- [ ] `grep -rn "localStorage" components app` ne retourne rien
- [ ] `grep -rn "fetch" app components lib` ne retourne rien
- [ ] `grep -nE "#[0-9a-fA-F]{3,8}|gray-|bg-black|bg-white|text-black|text-white" components app` ne retourne rien
- [ ] `git diff --stat` : seuls les fichiers listés sont modifiés, `package.json` est inchangé

### Partie C — Toi (après)

Lancer `npm run dev` avec ton GPX de ski :

- comparer la durée à ton temps réel ou à un calcul Munter fait à la main, et ajuster les constantes de `pacingSkimo.ts` si besoin ;
- tester les 3 niveaux de ski et les 4 intensités, puis vérifier le détail des phases et le nombre de transitions ;
- en page 2, vérifier que le coût de l'effort baisse par rapport à la saisie manuelle de même durée, et que le profil et le tableau (colonne Vitesse) s'affichent ;
- vérifier à 320, 390 et 768 px, au clavier (radiogroup « Niveau de ski ») et dans les DevTools (ni réseau ni stockage).

Commit uniquement après `npx tsc --noEmit` et les tests, avec ton accord.

### Hors périmètre

- Déplacer les prises alimentaires selon les phases (descente, sommet) : point 6.
- Vitesse verticale personnalisée dans les Paramètres, calibrage automatique sur les timestamps du GPX, pauses au sommet autres que les transitions, portages skis sur le sac.
- MET par phase pour les autres sports.
- Toute information de sécurité en montagne.
