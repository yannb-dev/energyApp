## SPEC-07.4 — Modèle cyclisme : PMA × intensité, masse, aérodynamisme, pente

### Contexte

Quatrième brique de [SPEC-07](SPEC-07.md), indépendante de [SPEC-07.3](SPEC-07.3.md). À partir d'une trace ([SPEC-07.1](SPEC-07.1.md)), de la **PMA** de l'athlète, d'un niveau d'**intensité**, de la masse du cycliste et du vélo et de la position aérodynamique ([SPEC-07.2](SPEC-07.2.md)), on calcule, pour chaque segment, la vitesse que la puissance permet de tenir, puis les temps de passage par kilomètre et la durée totale.

Logique pure dans `lib/`, sans interface. Estimation indicative. Aucune dépendance. TDD : test écrit et vu en échec AVANT le code.

### API : `lib/pacingBike.ts` (créer)

```ts
import type { Track } from "@/lib/gpx";
import type { IntensityId } from "@/lib/intensity";
import type { PacingResult } from "@/lib/pacingRun"; // type partagé, défini en 07.3

export type BikePacingInput = {
  pmaWatts: number;
  intensity: IntensityId;
  riderKg: number; // poids du profil (SPEC-06)
  bikeKg: number;  // 0 si l'utilisateur n'a pas coché « Ajouter un vélo » : voir règle 8
  cdA: number;     // m², déduit de la position (BIKE_POSITIONS)
};

export function solveSpeedMs(powerW: number, massKg: number, cdA: number, gradeFraction: number): number;
export function computeBikePacing(track: Track, input: BikePacingInput): PacingResult;
```

`PacingResult` / `PacingSplit` viennent de `lib/pacingRun.ts` : même forme de résultat pour la course et le vélo, un seul composant d'affichage en 07.5.

### Constantes (exportées, chacune testée)

| Constante | Valeur | Rôle |
| --- | --- | --- |
| `CRR` | 0,005 | résistance au roulement (route, pneus corrects) |
| `AIR_DENSITY` | 1,2 | kg/m³ |
| `DRIVETRAIN_EFFICIENCY` | 0,975 | rendement de la transmission |
| `GRAVITY` | 9,80665 | m/s² |
| `BIKE_SPEED_MAX_KMH` | 70 | plafond de vitesse (descentes, prudence) |
| `BIKE_SPEED_MIN_KMH` | 1 | plancher (rampes extrêmes) |
| `DEFAULT_BIKE_KG` | 9 | poids du vélo utilisé si aucun vélo n'est déclaré |

### Règles métier

1. **Puissance cible** : `powerW = pmaWatts × ratio(intensity)` (ratios de `INTENSITY_LEVELS`, 07.2).
2. **Masse totale** : `massKg = riderKg + bikeKg`.
3. **Équilibre des puissances** sur un segment de pente `θ = atan(grade)` (grade en fraction, `gradePct / 100`) :
   `powerW × DRIVETRAIN_EFFICIENCY = ½ · AIR_DENSITY · cdA · v³ + massKg · GRAVITY · (CRR · cos θ + sin θ) · v`
4. **Résolution de `v`** (`solveSpeedMs`) : bissection sur `v` entre 0,1 m/s et `BIKE_SPEED_MAX_KMH / 3,6` ; 100 itérations. Si, même à la vitesse maximale, la puissance disponible dépasse la résistance (descente raide), la vitesse est **plafonnée** à `BIKE_SPEED_MAX_KMH`. Le résultat final est ramené dans [`BIKE_SPEED_MIN_KMH`, `BIKE_SPEED_MAX_KMH`].
5. **Hypothèse de descente** : la puissance reste constante en descente (pas de roue libre modélisée) ; le plafond de 70 km/h joue le rôle de limite de sécurité. Simplification volontaire.
6. **Par segment** : `durée = lengthKm / vitesseKmh × 3600` ; agrégation par km et D+/D− identiques à 07.3 (`track.kilometers`) ; `PacingResult` identique (`minutes = Math.round(totalSec / 60)`).
7. Sans altitude (`hasElevation = false`) : pente 0 partout.
8. **Vélo non déclaré** : l'appelant (07.5) passe `DEFAULT_BIKE_KG` quand `hasBike` est faux, et un CdA « Mains en bas » (0,32) ; cette fonction n'invente rien.
9. Garde-fous : `pmaWatts`, `riderKg`, `bikeKg ≥ 0`, `cdA` non finis ou ≤ 0 (sauf `bikeKg`, qui peut valoir 0) → lève une `Error` (la validation est faite en amont, 07.2).

### Exemples de référence (valeurs recalculées, à figer dans les tests)

Cas de base : PMA 300 W, intensité « Rythme modéré » (70 % → **210 W**), cycliste 75 kg + vélo 8 kg (**83 kg**), CdA 0,32 m².

1. Plat (pente 0) : `solveSpeedMs(210, 83, 0.32, 0)` → **34,29 km/h** (tolérance 0,05).
2. Autres intensités, mêmes paramètres, à plat : 60 % (180 W) → **32,32 km/h** ; 80 % (240 W) → **36,08 km/h** ; 85 % (255 W) → **36,91 km/h**.
3. Position : à plat, 210 W, CdA 0,26 (« Aéro ») → **36,56 km/h** ; CdA 0,40 (« Relevée ») → **32,00 km/h**.
4. Pente : +5 % → **15,30 km/h** ; +10 % → **8,56 km/h** ; −5 % → **57,72 km/h** ; −10 % → plafonné à **70 km/h**.
5. Masse : à +5 %, 210 W, 95 kg au lieu de 83 → **13,66 km/h** (plus lourd, plus lent en montée).
6. Trace plate de 10 km, cas de base → `totalSec` ≈ **1049,7 s**, `minutes` = **17** (17,50 min arrondi vers le bas à 17), 10 splits de ≈ 104,97 s.
7. Trace sans altitude de 10 km = même résultat que l'exemple 6.
8. Aller-retour symétrique ±5 % de 10 km au total → durée **supérieure** à celle de la trace plate (la montée coûte plus que la descente ne rapporte).
9. Monotonie : PMA plus haute → plus rapide ; CdA plus petit → plus rapide ; masse plus grande → plus lent en montée ; intensité plus haute → plus rapide.
10. `pmaWatts = 0` → lève une erreur ; `bikeKg = 0` → accepté.
11. Convergence : pour tout cas testé, l'écart entre les deux membres de l'équation à la vitesse trouvée est inférieur à 0,1 W (hors plafond).

### Partie A — Toi (avant)

Rien à installer. Vérifier que `npm run test:run` passe. **Relire et valider les coefficients** (Crr 0,005, rendement 0,975, plafond 70 km/h, vélo par défaut 9 kg) : hypothèses du point 5 de `evolution-app.md`. Les exemples chiffrés ci-dessus en dépendent : si tu changes une constante, l'agent doit s'arrêter et demander les nouvelles valeurs plutôt que de les recalculer en silence.

### Partie B — Agent (TDD strict)

1. `lib/pacingBike.test.ts` (constantes, exemples 1 à 5, 10, 11 sur `solveSpeedMs`) → `lib/pacingBike.ts` : constantes, `solveSpeedMs`.
2. `lib/pacingBike.test.ts` (exemples 6 à 9 sur de petites `Track` construites à la main) → `lib/pacingBike.ts` : `computeBikePacing`.

### Fichiers à créer / modifier

- specs/SPEC-07.4.md (créé)
- lib/pacingBike.ts + lib/pacingBike.test.ts (créer)

Aucun autre fichier n'est modifié. `lib/pacingRun.ts` n'est lu que pour ses types (aucune modification : si le type partagé ne convient pas, s'arrêter et demander).

### Contraintes

Voir [SPEC-07](SPEC-07.md) (contraintes communes). En plus :

- `lib/pacingBike.ts` ne contient aucune référence à React ni au stockage.
- Pas de dépendance de calcul numérique : la bissection est écrite à la main.
- Coefficients uniquement dans des constantes nommées exportées.
- Ne pas redéfinir `PacingSplit` / `PacingResult` : `import type` depuis `lib/pacingRun.ts`.

### Critères d'acceptation (vérifiables par commande)

- [ ] `npm run test:run`, `npm run typecheck` et `npm run lint` passent
- [ ] `lib/pacingBike.test.ts` couvre les exemples 1 à 11 avec les valeurs exactes ci-dessus
- [ ] `grep -nE "localStorage|fetch|from \"react\"" lib/pacingBike.ts` ne retourne rien
- [ ] `grep -n "type PacingResult\|type PacingSplit" lib/pacingBike.ts` ne retourne rien
- [ ] `git diff --stat` : seuls `lib/pacingBike.ts` et `lib/pacingBike.test.ts` sont ajoutés

### Partie C — Toi (après)

Rien de visible dans l'app. Comparer l'exemple 1 avec ton rythme réel à 70 % de ta PMA sur le plat. Commit uniquement après `npx tsc --noEmit` et les tests, avec ton accord.

### Hors périmètre

Roue libre et freinage en descente, vent, drafting (peloton), pression des pneus ou revêtement variable, puissance variable selon la pente (stratégie de course), fatigue progressive, VTT et gravel (Crr plus élevé : un seul Crr pour l'instant), interface (07.5).
