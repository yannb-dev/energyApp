export type GpxPoint = { lat: number; lon: number; ele?: number };

export type GpxError =
  | "too-large"
  | "invalid-xml"
  | "no-track"
  | "too-few-points"
  | "invalid-coordinates";

export type GpxParseResult =
  | { ok: true; points: GpxPoint[] }
  | { ok: false; error: GpxError };

export type TrackSegment = {
  /** Distance cumulée au début du segment. */
  startKm: number;
  /** 0,1 sauf le dernier segment (partiel). */
  lengthKm: number;
  /** Pente lissée, bornée à ±GRADE_PCT_MAX. */
  gradePct: number;
  /** Altitude lissée au milieu du segment. */
  eleM: number;
};

export type TrackKm = {
  /** 1, 2, … */
  km: number;
  /** 1 sauf le dernier kilomètre (partiel). */
  distanceKm: number;
  ascentM: number;
  descentM: number;
};

export type Track = {
  distanceKm: number;
  /** D+ (m), lissé + hystérésis. */
  ascentM: number;
  /** D− (m), valeur positive. */
  descentM: number;
  /** false : altitude absente, profil plat. */
  hasElevation: boolean;
  segments: TrackSegment[];
  kilometers: TrackKm[];
  /** Un point par segment, pour le tracé. */
  profile: { km: number; eleM: number }[];
};

/** Taille maximale du texte, mesurée en `xml.length` caractères comme approximation. */
export const GPX_MAX_BYTES = 10 * 1024 * 1024;

/** Pas de rééchantillonnage de la trace. */
export const SEGMENT_KM = 0.1;

/** Fenêtre (km) de la moyenne glissante d'altitude, appliquée par demi-fenêtre. */
export const SMOOTHING_WINDOW_KM = 0.3;

/** Variation minimale (m) pour compter du D+ ou du D−. */
export const ASCENT_HYSTERESIS_M = 3;

/** Pente absolue maximale conservée (%). */
export const GRADE_PCT_MAX = 45;

/** Rayon terrestre (km) pour la formule de haversine. */
export const EARTH_RADIUS_KM = 6371;

/** Points successifs à moins de 1 m fusionnés (doublons, arrêts). */
const MIN_POINT_GAP_KM = 0.001;

/** Reliquat sous 1 m absorbé par le dernier segment et le dernier kilomètre. */
const MIN_REMAINDER_KM = 0.001;

const SEGMENTS_PER_KM = Math.round(1 / SEGMENT_KM);
const METERS_PER_KM = 1000;

const LAT_LIMIT = 90;
const LON_LIMIT = 180;

/** Éléments descendants dont le nom local vaut `name`, quel que soit l'espace de noms. */
function descendantsByLocalName(parent: Element, name: string): Element[] {
  const found: Element[] = [];
  const walk = (node: Element): void => {
    for (const child of Array.from(node.children)) {
      if (child.localName === name) {
        found.push(child);
      }
      walk(child);
    }
  };
  walk(parent);
  return found;
}

function firstChildByLocalName(parent: Element, name: string): Element | null {
  for (const child of Array.from(parent.children)) {
    if (child.localName === name) {
      return child;
    }
  }
  return null;
}

function readCoordinate(
  node: Element,
  attribute: "lat" | "lon",
  limit: number,
): number | null {
  const raw = node.getAttribute(attribute);
  if (raw === null) {
    return null;
  }
  const text = raw.trim();
  if (text === "") {
    return null;
  }
  const value = Number(text);
  if (!Number.isFinite(value) || value < -limit || value > limit) {
    return null;
  }
  return value;
}

/** `<ele>` absente ou non numérique : pas d'altitude pour ce point, ce n'est pas une erreur. */
function readElevation(node: Element): number | undefined {
  const ele = firstChildByLocalName(node, "ele");
  if (ele === null) {
    return undefined;
  }
  const text = (ele.textContent ?? "").trim();
  if (text === "") {
    return undefined;
  }
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

function hasParseError(document: Document): boolean {
  const root = document.documentElement;
  if (root === null) {
    return true;
  }
  if (root.localName === "parsererror") {
    return true;
  }
  return document.getElementsByTagNameNS("*", "parsererror").length > 0;
}

/** Texte d'un fichier `.gpx` vers des points exploitables ; aucune lecture de fichier ici. */
export function parseGpx(xml: string): GpxParseResult {
  if (xml.length > GPX_MAX_BYTES) {
    return { ok: false, error: "too-large" };
  }

  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (hasParseError(document)) {
    return { ok: false, error: "invalid-xml" };
  }

  const nodes = descendantsByLocalName(document.documentElement, "trkpt");
  if (nodes.length === 0) {
    return { ok: false, error: "no-track" };
  }

  const points: GpxPoint[] = [];
  for (const node of nodes) {
    const lat = readCoordinate(node, "lat", LAT_LIMIT);
    const lon = readCoordinate(node, "lon", LON_LIMIT);
    if (lat === null || lon === null) {
      return { ok: false, error: "invalid-coordinates" };
    }
    const ele = readElevation(node);
    points.push(ele === undefined ? { lat, lon } : { lat, lon, ele });
  }

  if (points.length < 2) {
    return { ok: false, error: "too-few-points" };
  }

  return { ok: true, points };
}

function haversineKm(from: GpxPoint, to: GpxPoint): number {
  const toRadians = Math.PI / 180;
  const deltaLat = (to.lat - from.lat) * toRadians;
  const deltaLon = (to.lon - from.lon) * toRadians;
  const lat1 = from.lat * toRadians;
  const lat2 = to.lat * toRadians;
  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function emptyTrack(): Track {
  return {
    distanceKm: 0,
    ascentM: 0,
    descentM: 0,
    hasElevation: false,
    segments: [],
    kilometers: [],
    profile: [],
  };
}

/** Altitudes manquantes comblées par interpolation linéaire sur la distance. */
function interpolateElevations(points: GpxPoint[], distances: number[]): number[] {
  const elevations = points.map((point) =>
    point.ele === undefined || !Number.isFinite(point.ele) ? Number.NaN : point.ele,
  );

  // Prochain point connu, pour interpoler sans boucle imbriquée.
  const nextDefined: number[] = new Array(points.length).fill(-1);
  let next = -1;
  for (let index = points.length - 1; index >= 0; index -= 1) {
    if (Number.isFinite(elevations[index])) {
      next = index;
    }
    nextDefined[index] = next;
  }

  let previous = -1;
  for (let index = 0; index < points.length; index += 1) {
    if (Number.isFinite(elevations[index])) {
      previous = index;
      continue;
    }
    const following = nextDefined[index];
    if (previous < 0 && following < 0) {
      elevations[index] = 0;
    } else if (previous < 0) {
      elevations[index] = elevations[following];
    } else if (following < 0) {
      elevations[index] = elevations[previous];
    } else {
      const span = distances[following] - distances[previous];
      const ratio = span > 0 ? (distances[index] - distances[previous]) / span : 0;
      elevations[index] =
        elevations[previous] + (elevations[following] - elevations[previous]) * ratio;
    }
  }

  return elevations;
}

/**
 * Moyenne glissante d'altitude : points à ±SMOOTHING_WINDOW_KM / 2, réduite
 * symétriquement aux bords (le premier et le dernier point ne sont pas lissés).
 */
function smoothElevations(sampled: number[], distances: number[]): number[] {
  const halfWindowKm = SMOOTHING_WINDOW_KM / 2;
  const smoothed: number[] = [];

  for (let index = 0; index < sampled.length; index += 1) {
    let radius = 1;
    while (
      index - radius >= 0 &&
      index + radius < sampled.length &&
      distances[index] - distances[index - radius] <= halfWindowKm &&
      distances[index + radius] - distances[index] <= halfWindowKm
    ) {
      radius += 1;
    }

    let sum = 0;
    let count = 0;
    for (let cursor = index - radius + 1; cursor <= index + radius - 1; cursor += 1) {
      sum += sampled[cursor];
      count += 1;
    }
    smoothed.push(sum / count);
  }

  return smoothed;
}

/**
 * D+ / D− par extremums successifs séparés de ASCENT_HYSTERESIS_M.
 * Chaque montée (descente) retenue est répartie sur les kilomètres traversés,
 * au prorata des pas montants (descendants) : la somme par km redonne le total.
 */
function analyseElevation(
  series: number[],
  kmOfStep: number[],
  kmCount: number,
): {
  ascentM: number;
  descentM: number;
  ascentByKm: number[];
  descentByKm: number[];
} {
  const ascentByKm: number[] = new Array(kmCount).fill(0);
  const descentByKm: number[] = new Array(kmCount).fill(0);

  if (series.length === 0) {
    return { ascentM: 0, descentM: 0, ascentByKm, descentByKm };
  }

  const lastStep = kmOfStep.length - 1;

  /** Répartit `amount` sur les pas [from, to) dans le sens `direction`. */
  const spread = (from: number, to: number, amount: number, direction: 1 | -1, buckets: number[]): void => {
    if (amount <= 0) {
      return;
    }
    let slopeSum = 0;
    for (let index = from; index < to; index += 1) {
      const delta = (series[index + 1] - series[index]) * direction;
      if (delta > 0) {
        slopeSum += delta;
      }
    }
    if (slopeSum <= 0) {
      const bucket = kmOfStep[Math.min(Math.max(to - 1, 0), lastStep)];
      buckets[bucket] += amount;
      return;
    }
    for (let index = from; index < to; index += 1) {
      const delta = (series[index + 1] - series[index]) * direction;
      if (delta > 0) {
        buckets[kmOfStep[Math.min(index, lastStep)]] += (amount * delta) / slopeSum;
      }
    }
  };

  let ascentM = 0;
  let descentM = 0;
  let anchor = series[0];
  let anchorIndex = 0;
  let extreme = series[0];
  let extremeIndex = 0;
  let state: 0 | 1 | -1 = 0;

  for (let index = 1; index < series.length; index += 1) {
    const value = series[index];

    if (state >= 0) {
      if (value > extreme) {
        extreme = value;
        extremeIndex = index;
      }
      if (state === 0 && value - anchor > ASCENT_HYSTERESIS_M) {
        state = 1;
      }
      if (state === 1 && extreme - value > ASCENT_HYSTERESIS_M) {
        ascentM += extreme - anchor;
        spread(anchorIndex, extremeIndex, extreme - anchor, 1, ascentByKm);
        anchor = extreme;
        anchorIndex = extremeIndex;
        extreme = value;
        extremeIndex = index;
        state = -1;
      } else if (state === 0 && anchor - value > ASCENT_HYSTERESIS_M) {
        state = -1;
        extreme = value;
        extremeIndex = index;
      }
    } else {
      if (value < extreme) {
        extreme = value;
        extremeIndex = index;
      }
      if (value - extreme > ASCENT_HYSTERESIS_M) {
        descentM += anchor - extreme;
        spread(anchorIndex, extremeIndex, anchor - extreme, -1, descentByKm);
        anchor = extreme;
        anchorIndex = extremeIndex;
        extreme = value;
        extremeIndex = index;
        state = 1;
      }
    }
  }

  if (state === 1) {
    ascentM += extreme - anchor;
    spread(anchorIndex, extremeIndex, extreme - anchor, 1, ascentByKm);
  }
  if (state === -1) {
    descentM += anchor - extreme;
    spread(anchorIndex, extremeIndex, anchor - extreme, -1, descentByKm);
  }

  return { ascentM, descentM, ascentByKm, descentByKm };
}

/** Trace exploitable depuis des points validés ; ne lève jamais et ne lit aucun fichier. */
export function buildTrack(points: GpxPoint[]): Track {
  const kept: GpxPoint[] = [];
  const distances: number[] = [];
  let distanceKm = 0;

  for (const point of points) {
    if (kept.length > 0) {
      const step = haversineKm(kept[kept.length - 1], point);
      if (step < MIN_POINT_GAP_KM) {
        continue;
      }
      distanceKm += step;
    }
    kept.push(point);
    distances.push(distanceKm);
  }

  if (kept.length < 2 || distanceKm <= 0) {
    return emptyTrack();
  }

  const withElevation = kept.filter((point) => point.ele !== undefined).length;
  const hasElevation = withElevation * 2 >= kept.length;
  const elevations = hasElevation
    ? interpolateElevations(kept, distances)
    : kept.map(() => 0);

  // Rééchantillonnage : un point tous les SEGMENT_KM, dernier segment partiel.
  const fullSegments = Math.floor(distanceKm / SEGMENT_KM + 1e-9);
  const remainderKm = distanceKm - fullSegments * SEGMENT_KM;
  const segmentCount =
    fullSegments === 0
      ? 1
      : remainderKm <= MIN_REMAINDER_KM
        ? fullSegments
        : fullSegments + 1;

  const bounds: number[] = [];
  for (let index = 0; index < segmentCount; index += 1) {
    bounds.push(index * SEGMENT_KM);
  }
  bounds.push(distanceKm);

  const sampled: number[] = [];
  let cursor = 0;
  for (const target of bounds) {
    while (cursor < kept.length - 2 && distances[cursor + 1] < target) {
      cursor += 1;
    }
    const span = distances[cursor + 1] - distances[cursor];
    const ratio = span > 0 ? Math.min(1, Math.max(0, (target - distances[cursor]) / span)) : 0;
    sampled.push(elevations[cursor] + (elevations[cursor + 1] - elevations[cursor]) * ratio);
  }

  const smoothed = smoothElevations(sampled, bounds);

  // Kilomètres : même découpage, même reliquat absorbé par le dernier.
  const fullKilometers = Math.floor(distanceKm + 1e-9);
  const remainderWholeKm = distanceKm - fullKilometers;
  const kmCount =
    fullKilometers === 0
      ? 1
      : remainderWholeKm <= MIN_REMAINDER_KM
        ? fullKilometers
        : fullKilometers + 1;

  const kmOfStep: number[] = [];
  for (let index = 0; index < segmentCount; index += 1) {
    kmOfStep.push(Math.min(Math.floor(index / SEGMENTS_PER_KM), kmCount - 1));
  }

  const segments: TrackSegment[] = [];
  const profile: { km: number; eleM: number }[] = [];
  for (let index = 0; index < segmentCount; index += 1) {
    const startKm = bounds[index];
    const lengthKm = bounds[index + 1] - bounds[index];
    const deltaM = smoothed[index + 1] - smoothed[index];
    const gradePct =
      lengthKm > 0
        ? Math.max(
            -GRADE_PCT_MAX,
            Math.min(GRADE_PCT_MAX, (deltaM / (lengthKm * METERS_PER_KM)) * 100),
          )
        : 0;
    const eleM = (smoothed[index] + smoothed[index + 1]) / 2;
    segments.push({ startKm, lengthKm, gradePct, eleM });
    profile.push({ km: startKm + lengthKm / 2, eleM });
  }

  const totals = analyseElevation(smoothed, kmOfStep, kmCount);

  const kilometers: TrackKm[] = [];
  for (let km = 1; km <= kmCount; km += 1) {
    const first = (km - 1) * SEGMENTS_PER_KM;
    const last = Math.min(km * SEGMENTS_PER_KM, segmentCount);
    kilometers.push({
      km,
      distanceKm: bounds[last] - bounds[first],
      ascentM: totals.ascentByKm[km - 1],
      descentM: totals.descentByKm[km - 1],
    });
  }

  return {
    distanceKm,
    ascentM: totals.ascentM,
    descentM: totals.descentM,
    hasElevation,
    segments,
    kilometers,
    profile,
  };
}
