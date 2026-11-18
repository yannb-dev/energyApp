import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildTrack,
  ASCENT_HYSTERESIS_M,
  EARTH_RADIUS_KM,
  GPX_MAX_BYTES,
  GRADE_PCT_MAX,
  parseGpx,
  SEGMENT_KM,
  SMOOTHING_WINDOW_KM,
  type GpxPoint,
  type Track,
} from "@/lib/gpx";

type RawPoint = { lat: number; lon: number; ele?: number };

function trkpt(point: RawPoint): string {
  const ele = point.ele === undefined ? "" : `<ele>${point.ele}</ele>`;
  return `<trkpt lat="${point.lat}" lon="${point.lon}">${ele}</trkpt>`;
}

/** GPX construit en chaîne : un trk, un trkseg par tableau de points. */
function gpxDocument(segments: RawPoint[][]): string {
  const body = segments
    .map((segment) => `<trkseg>${segment.map(trkpt).join("")}</trkseg>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1"><trk>${body}</trk></gpx>`;
}

describe("parseGpx", () => {
  it("lit les points avec leur altitude quand elle est présente", () => {
    const xml = gpxDocument([
      [
        { lat: 45, lon: 6, ele: 100 },
        { lat: 45.001, lon: 6.001 },
      ],
    ]);

    expect(parseGpx(xml)).toEqual({
      ok: true,
      points: [
        { lat: 45, lon: 6, ele: 100 },
        { lat: 45.001, lon: 6.001 },
      ],
    });
  });

  it("ignore une altitude non numérique sans échouer", () => {
    const xml = `<gpx version="1.1"><trk><trkseg><trkpt lat="45" lon="6"><ele>abc</ele></trkpt><trkpt lat="45.001" lon="6"><ele>120</ele></trkpt></trkseg></trk></gpx>`;

    expect(parseGpx(xml)).toEqual({
      ok: true,
      points: [
        { lat: 45, lon: 6 },
        { lat: 45.001, lon: 6, ele: 120 },
      ],
    });
  });

  it("retourne invalid-xml pour un XML mal formé (exemple 5)", () => {
    expect(parseGpx("<gpx><trk><trkseg>")).toEqual({
      ok: false,
      error: "invalid-xml",
    });
  });

  it("retourne no-track quand aucun trkpt n'est présent (exemple 5)", () => {
    expect(parseGpx(gpxDocument([]))).toEqual({ ok: false, error: "no-track" });
    expect(
      parseGpx('<gpx version="1.1"><wpt lat="45" lon="6"><ele>900</ele></wpt></gpx>'),
    ).toEqual({ ok: false, error: "no-track" });
  });

  it("retourne too-few-points avec un seul trkpt (exemple 5)", () => {
    expect(parseGpx(gpxDocument([[{ lat: 45, lon: 6 }]]))).toEqual({
      ok: false,
      error: "too-few-points",
    });
  });

  it("retourne invalid-coordinates hors bornes (exemple 5)", () => {
    expect(
      parseGpx(
        gpxDocument([
          [
            { lat: 91, lon: 6 },
            { lat: 45, lon: 6 },
          ],
        ]),
      ),
    ).toEqual({ ok: false, error: "invalid-coordinates" });

    expect(
      parseGpx(
        gpxDocument([
          [
            { lat: 45, lon: 181 },
            { lat: 45, lon: 6 },
          ],
        ]),
      ),
    ).toEqual({ ok: false, error: "invalid-coordinates" });
  });

  it("retourne invalid-coordinates pour une coordonnée absente ou non numérique", () => {
    const missing = `<gpx version="1.1"><trk><trkseg><trkpt lon="6"/><trkpt lat="45" lon="6"/></trkseg></trk></gpx>`;
    const notANumber = `<gpx version="1.1"><trk><trkseg><trkpt lat="abc" lon="6"/><trkpt lat="45" lon="6"/></trkseg></trk></gpx>`;

    expect(parseGpx(missing)).toEqual({ ok: false, error: "invalid-coordinates" });
    expect(parseGpx(notANumber)).toEqual({
      ok: false,
      error: "invalid-coordinates",
    });
  });

  it("retourne too-large au-delà de GPX_MAX_BYTES, sans parser le texte (exemple 5)", () => {
    expect(parseGpx("x".repeat(GPX_MAX_BYTES + 1))).toEqual({
      ok: false,
      error: "too-large",
    });
  });

  it("concatène les trkseg d'un même trk et ignore les wpt (exemple 6)", () => {
    const xml = `<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
      <wpt lat="44" lon="5"><ele>900</ele></wpt>
      <trk>
        <trkseg>${trkpt({ lat: 45, lon: 6 })}${trkpt({ lat: 45.001, lon: 6 })}</trkseg>
        <trkseg>${trkpt({ lat: 45.002, lon: 6 })}</trkseg>
      </trk>
    </gpx>`;

    const result = parseGpx(xml);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.points.map((point) => point.lat)).toEqual([
        45, 45.001, 45.002,
      ]);
    }
  });

  it("ne se laisse pas gêner par les espaces de noms préfixés", () => {
    const xml = `<g:gpx xmlns:g="http://www.topografix.com/GPX/1/1"><g:trk><g:trkseg><g:trkpt lat="45" lon="6"><g:ele>100</g:ele></g:trkpt><g:trkpt lat="45.001" lon="6"/></g:trkseg></g:trk></g:gpx>`;

    expect(parseGpx(xml)).toEqual({
      ok: true,
      points: [
        { lat: 45, lon: 6, ele: 100 },
        { lat: 45.001, lon: 6 },
      ],
    });
  });
});

describe("constantes exportées", () => {
  it("reprend les valeurs de la SPEC", () => {
    expect(GPX_MAX_BYTES).toBe(10 * 1024 * 1024);
    expect(SEGMENT_KM).toBe(0.1);
    expect(SMOOTHING_WINDOW_KM).toBe(0.3);
    expect(ASCENT_HYSTERESIS_M).toBe(3);
    expect(GRADE_PCT_MAX).toBe(45);
    expect(EARTH_RADIUS_KM).toBe(6371);
  });
});

/** Pas d'environ 100 m vers le nord (0,0009° de latitude). */
const STEP_DEG = 0.0009;

/** Trace construite en chaîne de caractères, puis relue par `parseGpx`. */
function parsedPoints(xml: string): GpxPoint[] {
  const parsed = parseGpx(xml);
  if (!parsed.ok) {
    throw new Error(`GPX de test invalide : ${parsed.error}`);
  }
  return parsed.points;
}

function trackFromElevations(
  elevations: (number | undefined)[],
  stepDeg = STEP_DEG,
): GpxPoint[] {
  return parsedPoints(
    gpxDocument([
      elevations.map((ele, index) => ({
        lat: 45 + index * stepDeg,
        lon: 6,
        ele,
      })),
    ]),
  );
}

/** Critère 9 : les kilomètres redisent la distance et le D+ de la trace. */
function expectKilometersConsistent(track: Track): void {
  const distanceSum = track.kilometers.reduce(
    (total, kilometer) => total + kilometer.distanceKm,
    0,
  );
  expect(Math.abs(distanceSum - track.distanceKm)).toBeLessThan(1e-9);

  const ascentSum = track.kilometers.reduce(
    (total, kilometer) => total + kilometer.ascentM,
    0,
  );
  expect(Math.abs(ascentSum - track.ascentM)).toBeLessThanOrEqual(3);
}

describe("buildTrack", () => {
  it("découpe une trace sans altitude en 10 segments et 1 km (exemple 1)", () => {
    const track = buildTrack(
      parsedPoints(gpxDocument([[
        { lat: 45, lon: 6 },
        { lat: 45.009, lon: 6 },
      ]])),
    );

    expect(Math.abs(track.distanceKm - 1.0008)).toBeLessThan(0.001);
    expect(track.hasElevation).toBe(false);
    expect(track.ascentM).toBe(0);
    expect(track.descentM).toBe(0);
    expect(track.segments).toHaveLength(10);
    expect(Math.abs(track.segments[9].lengthKm - 0.1008)).toBeLessThan(0.001);
    expect(track.profile).toHaveLength(10);
    expect(track.kilometers).toHaveLength(1);
    expect(track.segments.every((segment) => segment.gradePct === 0)).toBe(true);
    expect(track.segments.every((segment) => segment.eleM === 0)).toBe(true);
    expectKilometersConsistent(track);
  });

  it("compte le D+ d'une rampe régulière de 5 % (exemple 2)", () => {
    const elevations = Array.from({ length: 11 }, (_, index) => 100 + index * 5);
    const track = buildTrack(trackFromElevations(elevations));

    expect(track.ascentM).toBeGreaterThan(48);
    expect(track.ascentM).toBeLessThan(52);
    expect(track.descentM).toBe(0);
    for (const segment of track.segments.slice(3, 8)) {
      expect(segment.gradePct).toBeGreaterThan(4.5);
      expect(segment.gradePct).toBeLessThan(5.5);
    }
    expectKilometersConsistent(track);
  });

  it("ignore un bruit de ±2 m resté sous l'hystérésis (exemple 3)", () => {
    const elevations = Array.from({ length: 21 }, (_, index) =>
      index % 2 === 0 ? 100 : 102,
    );
    const track = buildTrack(trackFromElevations(elevations));

    expect(track.ascentM).toBe(0);
    expect(track.descentM).toBe(0);
    expectKilometersConsistent(track);
  });

  it("compte la montée puis la descente d'un aller-retour (exemple 4)", () => {
    const ascent = Array.from({ length: 11 }, (_, index) => index * 10);
    const descent = Array.from({ length: 10 }, (_, index) => 90 - index * 10);
    const track = buildTrack(trackFromElevations([...ascent, ...descent]));

    expect(track.ascentM).toBeGreaterThan(90);
    expect(track.ascentM).toBeLessThan(105);
    expect(track.descentM).toBeGreaterThan(90);
    expect(track.descentM).toBeLessThan(105);
    expectKilometersConsistent(track);
  });

  it("interpole une altitude manquante au milieu de la trace (exemple 7)", () => {
    const elevations = [
      100, 110, 120, 130, 140, undefined, 160, 170, 180, 190, 200,
    ];
    const track = buildTrack(trackFromElevations(elevations));

    expect(track.hasElevation).toBe(true);
    for (const segment of track.segments) {
      expect(segment.gradePct).toBeGreaterThan(9);
      expect(segment.gradePct).toBeLessThan(11);
    }
    expect(track.ascentM).toBeGreaterThan(95);
    expect(track.ascentM).toBeLessThan(105);
  });

  it("passe en profil plat sous la moitié des points avec altitude (exemple 7)", () => {
    const track = buildTrack(
      trackFromElevations([undefined, undefined, undefined, 150]),
    );

    expect(track.hasElevation).toBe(false);
    expect(track.ascentM).toBe(0);
    expect(track.descentM).toBe(0);
    expect(track.segments.every((segment) => segment.gradePct === 0)).toBe(true);
    expect(track.segments.every((segment) => segment.eleM === 0)).toBe(true);
  });

  it("borne la pente d'un mur à ±45 % (exemple 8)", () => {
    const track = buildTrack(trackFromElevations([100, 200], 0.00009));

    expect(track.segments).toHaveLength(1);
    expect(track.segments[0].gradePct).toBe(GRADE_PCT_MAX);
  });

  it("place le profil au milieu de chaque segment (exemple 1 et règle 8)", () => {
    const track = buildTrack(trackFromElevations([100, 150]));

    expect(track.profile[0].km).toBeGreaterThan(0);
    expect(track.profile[0].km).toBeLessThan(0.1);
    expect(track.profile).toHaveLength(track.segments.length);
  });

  it("fusionne deux points séparés de moins d'un mètre", () => {
    const xml = gpxDocument([
      [
        { lat: 45, lon: 6, ele: 100 },
        { lat: 45.000001, lon: 6, ele: 100 },
        { lat: 45.009, lon: 6, ele: 200 },
      ],
    ]);
    const parsed = parseGpx(xml);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const track = buildTrack(parsed.points);
    expect(Math.abs(track.distanceKm - 1.0008)).toBeLessThan(0.002);
    expect(track.segments).toHaveLength(10);
  });

  it("traite 50 000 points en une passe linéaire", () => {
    const points: GpxPoint[] = Array.from({ length: 50_000 }, (_, index) => ({
      lat: 45 + index * STEP_DEG,
      lon: 6,
      ele: 300 + Math.sin(index / 200) * 120,
    }));

    const started = Date.now();
    const track = buildTrack(points);

    expect(Date.now() - started).toBeLessThan(5000);
    expect(track.distanceKm).toBeGreaterThan(5000);
    expect(track.segments.length).toBeGreaterThan(50_000);
    expect(Number.isFinite(track.ascentM)).toBe(true);
    expect(Number.isFinite(track.descentM)).toBe(true);
  }, 20_000);
});

describe("buildTrack sur les traces réelles (exemple 10)", () => {
  const readGpx = (name: string): string =>
    readFileSync(resolve(process.cwd(), "asset", name), "utf8");

  it("retrouve le D+ de bike.gpx (1902 m ± 50, ≈ 1898 avec ces règles)", () => {
    const parsed = parseGpx(readGpx("bike.gpx"));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const track = buildTrack(parsed.points);
    expect(Math.abs(track.distanceKm - 93.7)).toBeLessThan(0.5);
    expect(Math.abs(track.ascentM - 1902)).toBeLessThanOrEqual(50);
    expect(Math.abs(track.ascentM - 1898)).toBeLessThanOrEqual(25);
    expect(track.hasElevation).toBe(true);
    expectKilometersConsistent(track);
  }, 20_000);

  it("retrouve le D+ de run.gpx (1289 m ± 50, ≈ 1304 avec ces règles)", () => {
    const parsed = parseGpx(readGpx("run.gpx"));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const track = buildTrack(parsed.points);
    expect(Math.abs(track.distanceKm - 23.1)).toBeLessThan(0.5);
    expect(Math.abs(track.ascentM - 1289)).toBeLessThanOrEqual(50);
    expect(Math.abs(track.ascentM - 1304)).toBeLessThanOrEqual(25);
    expect(track.hasElevation).toBe(true);
    expectKilometersConsistent(track);
  }, 20_000);
});
