"use client";

/**
 * Profil altimétrique et temps de passage d'une trace GPX (SPEC-08.5).
 * Rien à afficher hors mode GPX, sans trace ou sans issue exploitable.
 */

import ElevationProfile from "@/components/ElevationProfile";
import SplitsTable from "@/components/SplitsTable";
import { CARD_TITLE } from "@/components/forms/styles";
import { useActivity } from "@/components/providers/ActivityProvider";
import { useUserSettings } from "@/components/providers/UserSettingsProvider";
import { EMPTY_ATHLETE } from "@/lib/athleteStorage";
import { computeGpxOutcome } from "@/lib/gpxPacing";
import { findSport } from "@/lib/sports";

export default function CourseProfile() {
  const { profile, athlete } = useUserSettings();
  const { activity } = useActivity();
  const track = activity.track;
  const sport = findSport(activity.sportId);

  if (
    activity.inputMode !== "gpx" ||
    track === null ||
    sport === undefined ||
    profile === null
  ) {
    return null;
  }

  const outcome = computeGpxOutcome({
    track,
    sport,
    athlete: athlete ?? EMPTY_ATHLETE,
    weightKg: profile.weightKg,
    intensity: activity.intensity,
    terrain: activity.terrain,
    skiLevel: activity.skiLevel,
  });

  if (outcome.kind !== "ready") {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className={CARD_TITLE}>Profil altimétrique</h3>
      {track.hasElevation ? null : (
        <p className="text-sm text-muted">
          Altitude absente de la trace : profil plat, durée sans effet de pente.
        </p>
      )}
      <ElevationProfile track={track} />
      <SplitsTable
        result={outcome.result}
        bike={outcome.bike || sport.family === "skimo"}
      />
    </div>
  );
}
