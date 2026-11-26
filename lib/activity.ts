import {
  computeEffortDuration,
  EMPTY_EFFORT,
  type EffortFormValues,
} from "@/lib/effort";
import type { Track } from "@/lib/gpx";
import type { IntensityId, SkiLevelId, TerrainId } from "@/lib/intensity";
import { findSport, supportsGpx } from "@/lib/sports";

/**
 * Modèle de l'activité (SPEC-08.3) : sport, mode de saisie, effort, trace GPX,
 * intensité et terrain. Pur, sans React : le provider ne fait que le brancher.
 */

export type InputMode = "manual" | "gpx";

export type ActivityState = {
  /** "" = aucun sport. */
  sportId: string;
  inputMode: InputMode;
  /** Saisie manuelle, en texte. */
  effort: EffortFormValues;
  /** Trace GPX : mémoire uniquement, jamais persistée. */
  track: Track | null;
  intensity: IntensityId;
  terrain: TerrainId;
  /** Niveau de ski, utilisé par le mode GPX du ski de randonnée. */
  skiLevel: SkiLevelId;
  /** Durée calculée par GpxActivity, en minutes ; null si non calculable. */
  gpxMinutes: number | null;
  /** MET moyen calculé par GpxActivity en ski ; null hors mode GPX prêt. */
  gpxMet: number | null;
};

export type ActivityAction =
  | { type: "sportChanged"; sportId: string }
  | { type: "inputModeChanged"; mode: InputMode }
  | { type: "effortChanged"; effort: EffortFormValues }
  | { type: "trackChanged"; track: Track | null }
  | { type: "intensityChanged"; intensity: IntensityId }
  | { type: "terrainChanged"; terrain: TerrainId }
  | { type: "skiLevelChanged"; skiLevel: SkiLevelId }
  | { type: "gpxMinutesChanged"; minutes: number | null }
  | { type: "gpxMetChanged"; met: number | null }
  | { type: "reset" };

export const INITIAL_ACTIVITY: ActivityState = {
  sportId: "",
  inputMode: "manual",
  effort: EMPTY_EFFORT,
  track: null,
  intensity: "moderate",
  terrain: "rolling",
  skiLevel: "intermediate",
  gpxMinutes: null,
  gpxMet: null,
};

export function activityReducer(
  state: ActivityState,
  action: ActivityAction,
): ActivityState {
  switch (action.type) {
    case "sportChanged": {
      const sport = findSport(action.sportId);
      if (!sport) {
        return { ...state, sportId: action.sportId };
      }

      const next: ActivityState = { ...state, sportId: action.sportId };
      // Sport sans GPX : retour en saisie manuelle, aucune trace conservée.
      if (!supportsGpx(sport)) {
        next.inputMode = "manual";
        next.track = null;
        next.gpxMinutes = null;
        next.gpxMet = null;
      }
      // Le sport ne change l'unité que si la vitesse est encore vide.
      if (state.effort.speed.trim() === "") {
        next.effort = { ...state.effort, speedUnit: sport.defaultSpeedUnit };
      }
      return next;
    }

    case "inputModeChanged": {
      if (action.mode === "gpx") {
        return { ...state, inputMode: action.mode };
      }
      return {
        ...state,
        inputMode: action.mode,
        track: null,
        gpxMinutes: null,
        gpxMet: null,
      };
    }

    case "effortChanged":
      return { ...state, effort: action.effort };

    case "trackChanged":
      return { ...state, track: action.track };

    case "intensityChanged":
      return { ...state, intensity: action.intensity };

    case "terrainChanged":
      return { ...state, terrain: action.terrain };

    case "skiLevelChanged":
      return { ...state, skiLevel: action.skiLevel };

    case "gpxMinutesChanged":
      return { ...state, gpxMinutes: action.minutes };

    case "gpxMetChanged":
      return { ...state, gpxMet: action.met };

    case "reset":
      return INITIAL_ACTIVITY;

    default:
      return state;
  }
}

/** Seule source de la durée pour les pages : trace GPX ou effort manuel. */
export function selectMinutes(state: ActivityState): number | null {
  const sport = findSport(state.sportId);
  if (state.inputMode === "gpx" && sport !== undefined && supportsGpx(sport)) {
    return state.gpxMinutes;
  }
  return computeEffortDuration(state.effort)?.minutes ?? null;
}

/** Seule source du MET pour les pages : MET GPX en ski, sinon MET du sport. */
export function selectMet(state: ActivityState): number | null {
  const sport = findSport(state.sportId);
  if (sport === undefined) {
    return null;
  }
  if (
    state.inputMode === "gpx" &&
    supportsGpx(sport) &&
    state.gpxMet !== null
  ) {
    return state.gpxMet;
  }
  return sport.met;
}
