/**
 * Profil altimétrique d'une trace : SVG écrit à la main, sans dépendance.
 * Axe X en kilomètres, axe Y en mètres, marge de 10 % en altitude.
 */

import type { Track } from "@/lib/gpx";
import { buildProfileSummary } from "@/lib/pacingFormat";

/** Coordonnées du cadre de tracé, en unités du `viewBox`. */
const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 240;
const PAD_LEFT = 48;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 32;

/** Marge d'altitude de part et d'autre de la courbe (10 % de l'amplitude). */
const ELEVATION_MARGIN_RATIO = 0.1;

/** Espacement des repères de l'axe X selon la distance (km). */
export const TICK_STEP_KM_SHORT = 1;
export const TICK_STEP_KM_MEDIUM = 5;
export const TICK_STEP_KM_LONG = 10;

/** Pas des repères : 1 km jusqu'à 10 km, 5 km jusqu'à 50 km, 10 km au-delà. */
export function tickStepKm(distanceKm: number): number {
  if (distanceKm <= 10) {
    return TICK_STEP_KM_SHORT;
  }
  if (distanceKm <= 50) {
    return TICK_STEP_KM_MEDIUM;
  }
  return TICK_STEP_KM_LONG;
}

type ElevationProfileProps = {
  track: Track;
};

export default function ElevationProfile({ track }: ElevationProfileProps) {
  if (!track.hasElevation || track.profile.length < 2 || track.distanceKm <= 0) {
    return null;
  }

  const plotWidth = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = VIEW_HEIGHT - PAD_TOP - PAD_BOTTOM;

  let lowest = track.profile[0].eleM;
  let highest = track.profile[0].eleM;
  for (const point of track.profile) {
    lowest = Math.min(lowest, point.eleM);
    highest = Math.max(highest, point.eleM);
  }
  const span = highest - lowest;
  const margin = span > 0 ? span * ELEVATION_MARGIN_RATIO : 10;
  const floorM = lowest - margin;
  const ceilingM = highest + margin;

  const xOf = (km: number): number =>
    PAD_LEFT + (Math.min(Math.max(km, 0), track.distanceKm) / track.distanceKm) * plotWidth;
  const yOf = (eleM: number): number =>
    PAD_TOP + (1 - (eleM - floorM) / (ceilingM - floorM)) * plotHeight;

  const linePoints = track.profile
    .map((point) => `${xOf(point.km).toFixed(1)},${yOf(point.eleM).toFixed(1)}`)
    .join(" ");

  const firstX = xOf(track.profile[0].km).toFixed(1);
  const lastX = xOf(track.profile[track.profile.length - 1].km).toFixed(1);
  const baselineY = (PAD_TOP + plotHeight).toFixed(1);
  const areaPath = `M ${firstX} ${baselineY} L ${linePoints.replaceAll(" ", " L ")} L ${lastX} ${baselineY} Z`;

  const step = tickStepKm(track.distanceKm);
  const ticks: number[] = [];
  for (let km = 0; km <= track.distanceKm + 1e-9; km += step) {
    ticks.push(Number(km.toFixed(6)));
  }

  return (
    <svg
      data-testid="gpx-profile"
      role="img"
      aria-label={buildProfileSummary(track)}
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      className="motion-safe:animate-rise h-auto w-full"
    >
      <g aria-hidden="true">
        <line
          x1={PAD_LEFT}
          y1={PAD_TOP + plotHeight}
          x2={VIEW_WIDTH - PAD_RIGHT}
          y2={PAD_TOP + plotHeight}
          className="stroke-line"
          strokeWidth={1}
        />
        {ticks.map((km) => (
          <g key={km}>
            <line
              x1={xOf(km)}
              y1={PAD_TOP}
              x2={xOf(km)}
              y2={PAD_TOP + plotHeight}
              className="stroke-line"
              strokeWidth={1}
            />
            <text
              x={xOf(km)}
              y={VIEW_HEIGHT - 12}
              textAnchor="middle"
              fontSize={12}
              className="fill-muted"
            >
              {String(Math.round(km))}
            </text>
          </g>
        ))}
        <text
          x={PAD_LEFT - 8}
          y={PAD_TOP + 4}
          textAnchor="end"
          fontSize={12}
          className="fill-muted"
        >
          {Math.round(ceilingM)}
        </text>
        <text
          x={PAD_LEFT - 8}
          y={PAD_TOP + plotHeight}
          textAnchor="end"
          fontSize={12}
          className="fill-muted"
        >
          {Math.round(floorM)}
        </text>
      </g>

      <path d={areaPath} className="fill-effort opacity-20" />
      <polyline
        points={linePoints}
        className="fill-none stroke-effort"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
