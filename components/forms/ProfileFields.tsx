import { useFormContext, useWatch } from "react-hook-form";

import { FieldError } from "@/components/forms/FieldError";
import { CHIP, FIELD, FIELD_LABEL } from "@/components/forms/styles";
import {
  ACTIVITY_LEVELS,
  AGE_MAX,
  AGE_MIN,
  DEFAULT_ACTIVITY_INDEX,
  HEIGHT_CM_MAX,
  HEIGHT_CM_MIN,
  WEIGHT_KG_MAX,
  WEIGHT_KG_MIN,
} from "@/lib/energy";
import type { SettingsFormValues } from "@/lib/schemas/settings";

/** Sexe, âge, poids, taille et niveau d'activité du bloc Paramètres. */
export function ProfileFields() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<SettingsFormValues>();

  const activityIndex = useWatch({ control, name: "activityIndex" });
  const activityLevel =
    ACTIVITY_LEVELS[activityIndex] ?? ACTIVITY_LEVELS[DEFAULT_ACTIVITY_INDEX];

  const sexError = errors.profile?.sex?.message;
  const ageError = errors.profile?.age?.message;
  const weightError = errors.profile?.weightKg?.message;
  const heightError = errors.profile?.heightCm?.message;

  // Deux `register` du même nom : React Hook Form garde les refs du groupe et
  // le focus d'erreur tombe sur la première radio, « Homme ».
  return (
    <>
      <fieldset>
        <legend className={FIELD_LABEL}>Sexe</legend>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <input
              {...register("profile.sex")}
              id="sexe-homme"
              type="radio"
              value="male"
              className="peer sr-only"
            />
            <label htmlFor="sexe-homme" className={CHIP}>
              Homme
            </label>
          </div>
          <div className="relative">
            <input
              {...register("profile.sex")}
              id="sexe-femme"
              type="radio"
              value="female"
              className="peer sr-only"
            />
            <label htmlFor="sexe-femme" className={CHIP}>
              Femme
            </label>
          </div>
        </div>
        <FieldError id="erreur-sexe" message={sexError} />
      </fieldset>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="age" className={FIELD_LABEL}>
            Âge (ans)
          </label>
          <input
            id="age"
            type="number"
            inputMode="numeric"
            min={AGE_MIN}
            max={AGE_MAX}
            step={1}
            {...register("profile.age")}
            aria-invalid={ageError ? true : undefined}
            aria-describedby={ageError ? "erreur-age" : undefined}
            className={FIELD}
          />
          <FieldError id="erreur-age" message={ageError} />
        </div>

        <div>
          <label htmlFor="poids" className={FIELD_LABEL}>
            Poids (kg)
          </label>
          <input
            id="poids"
            type="number"
            inputMode="decimal"
            min={WEIGHT_KG_MIN}
            max={WEIGHT_KG_MAX}
            step={0.1}
            {...register("profile.weightKg")}
            aria-invalid={weightError ? true : undefined}
            aria-describedby={weightError ? "erreur-poids" : undefined}
            className={FIELD}
          />
          <FieldError id="erreur-poids" message={weightError} />
        </div>

        <div>
          <label htmlFor="taille" className={FIELD_LABEL}>
            Taille (cm)
          </label>
          <input
            id="taille"
            type="number"
            inputMode="decimal"
            min={HEIGHT_CM_MIN}
            max={HEIGHT_CM_MAX}
            step={0.1}
            {...register("profile.heightCm")}
            aria-invalid={heightError ? true : undefined}
            aria-describedby={heightError ? "erreur-taille" : undefined}
            className={FIELD}
          />
          <FieldError id="erreur-taille" message={heightError} />
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="activite" className={FIELD_LABEL}>
          Niveau d&apos;activité physique
        </label>
        <input
          id="activite"
          type="range"
          min={0}
          max={ACTIVITY_LEVELS.length - 1}
          step={1}
          {...register("activityIndex", { valueAsNumber: true })}
          aria-valuetext={activityLevel.label}
          className="h-11 w-full cursor-pointer accent-accent focus-visible:ring-2 focus-visible:ring-accent-strong"
        />
        <div className="flex justify-between gap-1 text-xs text-muted">
          {ACTIVITY_LEVELS.map((level) => (
            <span
              key={level.label}
              data-testid="activity-level"
              className={
                level.label === activityLevel.label
                  ? "font-semibold text-ink"
                  : "text-muted"
              }
            >
              {level.label}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">
          <span
            data-testid="activity-label"
            className="font-semibold text-accent"
          >
            {activityLevel.label}
          </span>{" "}
          <span data-testid="activity-label-detail" className=" text-muted">
            {activityLevel.detail}
          </span>
        </p>
      </div>
    </>
  );
}
