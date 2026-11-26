"use client";

/**
 * Résultats énergétiques (SPEC-08.5) : tuiles déplacées d'`EnergyCalculator`.
 * Calculés à partir du profil enregistré et de l'activité courante.
 */

import InfoTooltip from "@/components/InfoTooltip";
import { useActivity } from "@/components/providers/ActivityProvider";
import { useUserSettings } from "@/components/providers/UserSettingsProvider";
import {
  ACTIVITY_LEVELS,
  computeEnergyResults,
  DEFAULT_ACTIVITY_INDEX,
} from "@/lib/energy";
import { BMR_HELP, TDEE_HELP } from "@/lib/helpTexts";
import { findSport } from "@/lib/sports";

const TILE = "rounded-xl border border-line bg-surface-2 p-3";

export default function EnergySummary() {
  const { profile } = useUserSettings();
  const { activity, minutes, met } = useActivity();

  const sport = findSport(activity.sportId);
  const activityLevel =
    ACTIVITY_LEVELS[profile?.activityIndex ?? DEFAULT_ACTIVITY_INDEX] ??
    ACTIVITY_LEVELS[DEFAULT_ACTIVITY_INDEX];

  if (
    profile === null ||
    sport === undefined ||
    minutes === null ||
    met === null
  ) {
    return (
      <p className="text-sm text-muted">
        Renseigne ton profil et ton effort pour voir tes chiffres.
      </p>
    );
  }

  const results = computeEnergyResults(
    {
      sex: profile.sex,
      age: profile.age,
      weightKg: profile.weightKg,
      heightCm: profile.heightCm,
      sportId: activity.sportId,
      minutes: String(minutes),
    },
    activityLevel.coefficient,
    met,
  );

  if (results === null) {
    return (
      <p className="text-sm text-muted">
        Renseigne ton profil et ton effort pour voir tes chiffres.
      </p>
    );
  }

  return (
    <div data-testid="results" className="space-y-4">
      <div>
        <p className="text-sm text-muted">Coût de l&apos;effort</p>
        <p className="text-4xl font-bold leading-tight text-effort">
          <span data-testid="effort-kcal">
            {Math.round(results.effortKcal)}
          </span>
          <span className="ml-1 text-base font-medium text-muted">kcal</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className={TILE}>
          <div className="flex items-start justify-between gap-1">
            <p className="min-w-0 text-xs text-muted">Dépense journalière</p>
            <InfoTooltip
              id="help-tdee"
              label="Aide : dépense journalière"
              title="Dépense journalière"
            >
              {TDEE_HELP}
            </InfoTooltip>
          </div>
          <p className="text-lg font-semibold text-ink">
            <span data-testid="tdee">{Math.round(results.tdee)}</span>
            <span className="ml-1 text-xs font-normal text-muted">kcal</span>
          </p>
        </div>
        <div className={TILE}>
          <div className="flex items-start justify-between gap-1">
            <p className="min-w-0 text-xs text-muted">Métabolisme de base</p>
            <InfoTooltip
              id="help-bmr"
              label="Aide : métabolisme de base"
              title="Métabolisme de base"
            >
              {BMR_HELP}
            </InfoTooltip>
          </div>
          <p className="text-lg font-semibold text-ink">
            <span data-testid="bmr">{Math.round(results.bmr)}</span>
            <span className="ml-1 text-xs font-normal text-muted">kcal</span>
          </p>
        </div>
        <div className={TILE}>
          <p className="text-xs text-muted">Part de l&apos;effort</p>
          <p className="text-lg font-semibold text-ink">
            <span data-testid="effort-share">
              {Math.round(results.effortShare)}
            </span>
            <span className="ml-1 text-xs font-normal text-muted">%</span>
          </p>
        </div>
      </div>
    </div>
  );
}
