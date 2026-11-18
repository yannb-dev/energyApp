## SPEC-07.3 — Modèle course / trail : VMA × intensité, pente, terrain

### Contexte

Troisième brique de [SPEC-07](SPEC-07.md). À partir d'une trace traitée ([SPEC-07.1](SPEC-07.1.md)), de la **VMA** de l'athlète et d'un niveau d'**intensité** ([SPEC-07.2](SPEC-07.2.md)), on calcule le temps de passage à chaque kilomètre et la durée totale, pour la course à pied et le trail.

Logique pure dans `lib/`, sans interface. Le résultat est une **estimation indicative**, pas un pronostic de course. Aucune dépendance. TDD : test écrit et vu en échec AVANT le code.

### API : `lib/pacingRun.ts` (créer)

```ts
import type { Track } from "@/lib/gpx";
import type { IntensityId, TerrainId } from "@/lib/intensity";

export type RunPacingInput = {
  vmaKmh: number;
  intensity: IntensityId;
  terrain?: TerrainId; // trail uniquement ; absent ou "rolling" = facteur 1
};

export type PacingSplit = {
  km: number;            // 1, 2, … (dernier km éventuellement partiel)
  distanceKm: number;
  durationSec: number;   // temps du kilomètre
  cumulativeSec: number; // temps de passage à la fin de ce kilomètre
  paceSecPerKm: number;  // durationSec / distanceKm
  speedKmh: number;
  ascentM: number;
  descentM: number;
};

export type PacingResult = {
  splits: PacingSplit[];
  totalSec: number;
  minutes: number;       // Math.round(totalSec / 60), entier
  averageSpeedKmh: number;
};

export function computeRunPacing(track: Track, input: RunPacingInput): PacingResult;
```

`PacingSplit` et `PacingResult` sont **exportés pour être réutilisés par 07.4** (`import type` depuis `lib/pacingRun.ts` ; l'agent de 07.4 ne les redéfinit pas).

### Constantes (exportées, chacune testée)

| Constante | Valeur | Rôle |
| --- | --- | --- |
| `MINETTI_COEFFS` | `[155.4, -30.4, -43.3, 46.3, 19.5, 3.6]` | polynôme du coût de la pente, du degré 5 au degré 0 |
| `MINETTI_GRADE_MAX` | 0,45 | pente (fraction) bornée à ±0,45 |
| `DOWNHILL_SPEED_FACTOR_MAX` | 1,25 | gain de vitesse maximal en descente (prudence) |
| `UPHILL_SPEED_FACTOR_MIN` | 0,25 | ralentissement maximal en montée |
| `TERRAIN_SPEED_FACTORS` | rolling 1,00 · rough 0,92 · technical 0,82 | multiplicateur de vitesse, trail |

### Règles métier

1. **Vitesse de référence à plat** : `flatSpeedKmh = vmaKmh × ratio(intensity)` (ratio de `INTENSITY_LEVELS`).
2. **Coût de la pente** (Minetti) : `cost(g) = 155,4·g⁵ − 30,4·g⁴ − 43,3·g³ + 46,3·g² + 19,5·g + 3,6` (J/kg/m), avec `g = gradePct / 100` borné à ±`MINETTI_GRADE_MAX`. À plat, `cost(0) = 3,6`.
3. **Facteur de pente** (effort constant) : `slopeFactor = cost(0) / cost(g)`, borné entre `UPHILL_SPEED_FACTOR_MIN` et `DOWNHILL_SPEED_FACTOR_MAX`. Une montée donne un facteur < 1, une descente modérée > 1.
4. **Facteur terrain** : `TERRAIN_SPEED_FACTORS[terrain]` si `terrain` est fourni, sinon 1. L'appelant ne fournit `terrain` que pour la famille `trail` ; la fonction ne connaît pas le sport.
5. **Vitesse d'un segment** : `segmentSpeedKmh = flatSpeedKmh × slopeFactor × terrainFactor` ; durée du segment = `lengthKm / segmentSpeedKmh × 3600`.
6. **Agrégation par km** : somme des durées des segments de chaque `TrackKm` (même découpage que `track.kilometers`), D+ / D− repris de `TrackKm`. `cumulativeSec` cumule. `paceSecPerKm = durationSec / distanceKm`.
7. Sans altitude (`track.hasElevation = false`) toutes les pentes valent 0 : résultat = allure constante.
8. Non arrondi dans `lib/` sauf `minutes` (entier, comme `computeDurationMinutes`). L'affichage `m:ss` utilise `formatPace` de `lib/effort.ts`.
9. Garde-fous : `vmaKmh <= 0` ou non fini → lève une `Error` (programmation : la validation d'entrée est faite en amont par `validateAthlete`).

### Exemples de référence (valeurs recalculées, à figer dans les tests)

Coût : `cost(0,05) ≈ 4,6852` ; `cost(−0,05) ≈ 2,7459` ; `cost(0,10) ≈ 5,9682` ; `cost(−0,10) ≈ 2,1517`.
Facteurs : pente +5 % → **0,7684** ; +10 % → **0,6032** ; −5 % → 1,3110 donc **plafonné à 1,25** ; −10 % → plafonné à **1,25**.

1. Trace plate de 10 km, VMA 16 km/h, « Rythme modéré » (70 %) → 11,2 km/h partout, `totalSec` ≈ **3214,3 s**, `minutes` = **54** (53 min 34 s), allure ≈ 5:21 min/km, `splits.length` = 10.
2. Même trace, « Endurance fondamentale » → 9,6 km/h, `totalSec` = 3750 s, `minutes` = **63** (62,5 arrondi à 63). Intensité « Compétition » (85 %) → 13,6 km/h, `minutes` = **44** (44,12).
3. Segment à +5 % à 11,2 km/h de vitesse à plat → vitesse ≈ **8,61 km/h** (11,2 × 0,7684).
4. Un kilomètre à −5 % → vitesse = 11,2 × 1,25 = **14,0 km/h** (plafond) ; la descente fait gagner moins que la montée ne fait perdre (test sur un aller-retour symétrique 5 % : durée totale **supérieure** à celle de la trace plate de même longueur).
5. Trail, trace plate de 10 km, VMA 16, 70 %, `terrain = "technical"` → vitesse 11,2 × 0,82 = 9,184 km/h ; `terrain = "rough"` → 10,304 km/h ; sans terrain = `"rolling"` → 11,2 km/h.
6. Trace sans altitude → allure constante, même résultat qu'une trace plate.
7. Trace de 2,5 km → 3 splits ; les deux premiers font 1 km, le dernier 0,5 km ; `Σ distanceKm` = 2,5 ; `splits[2].cumulativeSec = totalSec`.
8. Monotonie : plus de VMA → durée plus courte ; intensité supérieure → durée plus courte ; terrain plus technique → durée plus longue.
9. `vmaKmh = 0` → lève une erreur.

### Partie A — Toi (avant)

Rien à installer. Vérifier que `npm run test:run` passe. **Relire et valider les coefficients** (facteurs terrain 1,00 / 0,92 / 0,82, plafond de descente 1,25) : ce sont des hypothèses du point 5 de `evolution-app.md` (« coefficients à définir »). Les modifier ici avant de lancer l'agent si besoin.

### Partie B — Agent (TDD strict)

1. `lib/pacingRun.test.ts` (coût et facteurs de pente, exemples 3 et 4 en unités ; constantes) → `lib/pacingRun.ts` : constantes, fonction de coût et de facteur (exportées pour test).
2. `lib/pacingRun.test.ts` (exemples 1, 2, 5 à 9 sur de petites `Track` construites à la main, sans passer par le parser) → `lib/pacingRun.ts` : `computeRunPacing`.

Les `Track` de test sont construites directement (segments de 0,1 km à pente donnée) pour que le test ne dépende pas de 07.1 ; un seul test d'intégration passe par `buildTrack`.

### Fichiers à créer / modifier

- specs/SPEC-07.3.md (créé)
- lib/pacingRun.ts + lib/pacingRun.test.ts (créer)

Aucun autre fichier n'est modifié.

### Contraintes

Voir [SPEC-07](SPEC-07.md) (contraintes communes). En plus :

- `lib/pacingRun.ts` ne contient aucune référence à React ni au stockage.
- Aucune formule dupliquée de `lib/effort.ts` ; pas de constante de ratio recopiée (importer `INTENSITY_LEVELS`).
- Coefficients uniquement dans des constantes nommées exportées.

### Critères d'acceptation (vérifiables par commande)

- [ ] `npm run test:run`, `npm run typecheck` et `npm run lint` passent
- [ ] `lib/pacingRun.test.ts` couvre les exemples 1 à 9 avec les valeurs exactes ci-dessus (tolérance 0,01 sur les vitesses, 1 s sur les durées)
- [ ] `grep -nE "localStorage|fetch|from \"react\"" lib/pacingRun.ts` ne retourne rien
- [ ] `git diff --stat` : seuls `lib/pacingRun.ts` et `lib/pacingRun.test.ts` sont ajoutés

### Partie C — Toi (après)

Rien de visible dans l'app. Comparer les exemples 1 et 3 avec une allure que tu connais (ta VMA, ton allure en côte) pour juger de la plausibilité ; ajuster les coefficients au besoin. Commit uniquement après `npx tsc --noEmit` et les tests, avec ton accord.

### Hors périmètre

Fatigue progressive sur longue durée, dénivelé cumulé comme pénalité globale, altitude (hypoxie), météo, marche en forte pente (passage en marche en trail), calibrage des facteurs sur données réelles, interface (07.5), vélo (07.4).
