## SPEC-07.1 — Parser GPX et traitement de la trace

### Contexte

Première brique de [SPEC-07](SPEC-07.md). Elle transforme le texte d'un fichier `.gpx` en une **trace exploitable** : distance cumulée, altitude lissée, D+/D−, découpage en segments de 100 m (pour les modèles de 07.3 et 07.4) et en kilomètres (pour les temps de passage).

Uniquement de la logique pure dans `lib/` : pas d'interface, pas de lecture de fichier (le composant de 07.5 lira le fichier et passera le texte). Aucune dépendance : `DOMParser` (navigateur et jsdom). La durée n'est PAS calculée ici. Les timestamps éventuels de la trace sont ignorés.

TDD : test écrit et vu en échec AVANT le code.

### API : `lib/gpx.ts` (créer)

```ts
export type GpxPoint = { lat: number; lon: number; ele?: number };

export type GpxParseResult =
  | { ok: true; points: GpxPoint[] }
  | { ok: false; error: GpxError };

export type GpxError =
  | "too-large"
  | "invalid-xml"
  | "no-track"
  | "too-few-points"
  | "invalid-coordinates";

export type TrackSegment = {
  startKm: number; // distance cumulée au début du segment
  lengthKm: number; // 0,1 sauf le dernier segment (partiel)
  gradePct: number; // pente lissée, bornée à ±GRADE_PCT_MAX
  eleM: number; // altitude lissée au milieu du segment
};

export type TrackKm = {
  km: number;
  distanceKm: number;
  ascentM: number;
  descentM: number;
};
// km = 1, 2, … ; distanceKm = 1 sauf le dernier kilomètre (partiel)

export type Track = {
  distanceKm: number;
  ascentM: number; // D+ (m), lissé + hystérésis
  descentM: number; // D− (m), valeur positive
  hasElevation: boolean; // false : altitude absente, profil plat
  segments: TrackSegment[];
  kilometers: TrackKm[];
  profile: { km: number; eleM: number }[]; // un point par segment, pour le tracé
};

export function parseGpx(xml: string): GpxParseResult;
export function buildTrack(points: GpxPoint[]): Track;
```

### Constantes (exportées)

| Constante             | Valeur           | Rôle                                                                              |
| --------------------- | ---------------- | --------------------------------------------------------------------------------- |
| `GPX_MAX_BYTES`       | 10 × 1024 × 1024 | taille maximale du texte (mesurée en `xml.length` caractères comme approximation) |
| `SEGMENT_KM`          | 0,1              | pas de rééchantillonnage                                                          |
| `SMOOTHING_WINDOW_KM` | 0,3              | fenêtre de la moyenne glissante d'altitude (voir [calculSPEC-7.1](calculSPEC-7.1.md)) |
| `ASCENT_HYSTERESIS_M` | 3                | variation minimale pour compter du D+ / D−                                        |
| `GRADE_PCT_MAX`       | 45               | pente absolue maximale conservée                                                  |
| `EARTH_RADIUS_KM`     | 6371             | haversine                                                                         |

### Règles de `parseGpx`

- Texte plus long que `GPX_MAX_BYTES` → `too-large` (testé sans parser).
- XML mal formé (`parsererror`) → `invalid-xml`.
- Points = tous les `<trkpt>` de tous les `<trkseg>` de tous les `<trk>`, dans l'ordre du document, concaténés. Les `<wpt>` et `<rtept>` sont ignorés. Aucun `<trkpt>` → `no-track`.
- `lat` entre −90 et 90, `lon` entre −180 et 180, nombres finis, sinon `invalid-coordinates`.
- `<ele>` absent ou non numérique sur un point : `ele` absent pour ce point (pas une erreur).
- Moins de 2 points → `too-few-points`.
- Les espaces de noms GPX (`xmlns`) ne doivent pas gêner : chercher par nom local.

### Règles de `buildTrack`

1. **Distance** : haversine entre points consécutifs, cumulée. Les points successifs à moins de 1 m sont fusionnés (doublons, arrêts).
2. **Altitude** : si moins de la moitié des points ont une altitude → `hasElevation = false`, altitude 0 partout, pentes à 0, D+ = D− = 0. Sinon : les points sans altitude héritent par interpolation linéaire sur la distance (extrémités : valeur la plus proche).
3. **Rééchantillonnage** tous les `SEGMENT_KM` par interpolation linéaire de l'altitude sur la distance cumulée ; le dernier segment est partiel (longueur restante) ; un reliquat inférieur à 1 m est absorbé par le dernier segment, et de même pour le dernier kilomètre.
4. **Lissage** de l'altitude rééchantillonnée : pour chaque point i, moyenne des points j tels que `|distance(j) − distance(i)| ≤ SMOOTHING_WINDOW_KM / 2` (au pas de 0,1 km : i−1, i, i+1). Aux bords, la fenêtre est réduite **symétriquement** (même nombre de points de chaque côté) : le premier et le dernier point ne sont donc pas lissés. Sinon, une rampe régulière perdrait du D+ (exemple 2).
5. **Pente** d'un segment = (altitude fin − altitude début) / longueur × 100, calculée sur l'altitude lissée, bornée à ±`GRADE_PCT_MAX`.
6. **D+ / D−** : parcours de l'altitude lissée avec un seuil d'hystérésis par extremums. On garde un point d'ancrage (le dernier extremum validé) et l'extremum courant (le plus haut point en montée, le plus bas en descente). Le sens s'inverse quand l'altitude s'écarte de l'extremum courant de plus de `ASCENT_HYSTERESIS_M` dans l'autre sens. La montée (ou la descente) « ancrage → extremum » est alors comptée, et l'extremum devient le nouvel ancrage. En fin de trace, la variation en cours est ajoutée si elle dépasse le seuil. Le D+ total est la somme des montées retenues. Pseudo-code dans [calculSPEC-7.1](calculSPEC-7.1.md).
7. **Kilomètres** : agrégation des segments par tranche de 1 km (distance, D+, D− de la tranche, mêmes règles) ; le dernier kilomètre est partiel. La somme des `distanceKm` égale `distanceKm`.
8. `profile` : `{ km: startKm + lengthKm / 2, eleM }` par segment.

`buildTrack` ne vérifie pas `DISTANCE_KM_MIN/MAX` (`lib/effort.ts`) : c'est le rôle de 07.5, qui affiche l'erreur.

### Exemples de référence (à couvrir par des tests, GPX construits en chaîne dans le test)

1. Deux points `lat 45.000 → 45.009`, même `lon`, sans altitude → `distanceKm ≈ 1,0008` (tolérance 0,001), `hasElevation = false`, `ascentM = 0`, **10 segments** (le reliquat de 0,75 m est absorbé par le dernier, de longueur ≈ 0,1008), **1 seul** `TrackKm`.
2. Montée régulière de 5 % sur ≈ 1 km (altitude de 100 à 150 m) → `ascentM` entre 48 et 52, `descentM = 0`, `gradePct` des segments centraux entre 4,5 et 5,5.
3. Terrain plat avec bruit ±2 m en alternance (altitude 100, 102, 100, 102…) sur 2 km → `ascentM = 0` (le bruit passe sous l'hystérésis de 3 m).
4. Aller-retour : montée de 100 m sur 1 km puis descente de 100 m sur 1 km → `ascentM` et `descentM` entre 90 et 105 (le lissage sur 300 m arrondit le sommet, d'où ≈ 93 m attendu).
5. XML invalide → `invalid-xml` ; document sans `trkpt` → `no-track` ; un seul point → `too-few-points` ; `lat="91"` → `invalid-coordinates` ; texte de `GPX_MAX_BYTES + 1` caractères → `too-large`.
6. Deux `<trkseg>` dans un même `<trk>` → points concaténés ; un `<wpt>` est ignoré.
7. Altitude manquante sur un point au milieu, présente ailleurs → interpolée (pas de saut de pente) ; altitude présente sur moins de la moitié des points → `hasElevation = false`.
8. Pente extrême (saut de 100 m sur 10 m) → `gradePct` borné à 45.
9. Somme des `kilometers[i].distanceKm` = `distanceKm` (tolérance 1e-9) et somme des D+ par km ≈ `ascentM` (tolérance 3 m).
10. **Intégration sur de vraies traces** : le test lit `asset/bike.gpx` et `asset/run.gpx` avec `fs` (seul le test lit des fichiers, `lib/gpx.ts` n'en lit aucun) → `ascentM` de bike.gpx = 1902 ± 50 et de run.gpx = 1289 ± 50 (références Openrunner). Valeurs attendues avec ces règles : ≈ 1898 et ≈ 1304.

### Partie A — Toi (avant)

Rien à installer. Vérifier que `npm run test:run` passe avant de lancer l'agent. Optionnel : fournir un petit vrai fichier GPX (≤ 100 points, sans lieu sensible) pour le test d'intégration ; sinon l'agent utilise des GPX synthétiques.

### Partie B — Agent (TDD strict)

1. `lib/gpx.test.ts` (exemples 5 à 6 pour `parseGpx`) → `lib/gpx.ts` : constantes, `parseGpx`.
2. `lib/gpx.test.ts` (exemples 1 à 4, 7 à 9 pour `buildTrack`) → `lib/gpx.ts` : `buildTrack`.

Le test s'exécute avec jsdom (`DOMParser` disponible) ; vérifier l'environnement de `vitest.config.mts`.

### Fichiers à créer / modifier

- specs/SPEC-07.1.md (créé)
- specs/calculSPEC-7.1.md (créé) : méthode de calcul du D+
- lib/gpx.ts + lib/gpx.test.ts (créer)
- asset/bike.gpx, asset/run.gpx (existants, lus par le test, non modifiés)

Aucun autre fichier n'est modifié.

### Contraintes

Voir [SPEC-07](SPEC-07.md) (contraintes communes). En plus :

- `lib/gpx.ts` n'importe pas React, ne touche pas `localStorage`, ne lit aucun fichier.
- Distances et altitudes en nombres non arrondis ; l'arrondi est un affichage (07.5).
- Performance : une trace de 50 000 points doit être traitée en une passe linéaire (pas de boucle imbriquée sur les points) ; un test construit 50 000 points et vérifie qu'il se termine sans erreur.

### Critères d'acceptation (vérifiables par commande)

- [ ] `npm run test:run`, `npm run typecheck` et `npm run lint` passent
- [ ] `lib/gpx.test.ts` couvre les exemples 1 à 9 et le test de 50 000 points
- [ ] `grep -nE "localStorage|fetch|from \"react\"" lib/gpx.ts` ne retourne rien
- [ ] `git diff --stat` : seuls `lib/gpx.ts` et `lib/gpx.test.ts` sont ajoutés

### Partie C — Toi (après)

Rien de visible dans l'app à ce stade. Relire les constantes (fenêtre 50 m, hystérésis 3 m) : elles conditionnent le D+ affiché plus tard. Commit uniquement après `npx tsc --noEmit` et les tests, avec ton accord.

### Hors périmètre

Interface et lecture du fichier (07.5), calcul de durée (07.3, 07.4), timestamps et vitesse réelle de la trace, correction d'altitude par modèle numérique de terrain, formats TCX / FIT, simplification de la trace.
