import { useFormContext, useWatch } from "react-hook-form";

import { FieldError } from "@/components/forms/FieldError";
import { FIELD, FIELD_LABEL } from "@/components/forms/styles";
import InfoTooltip from "@/components/InfoTooltip";
import { PMA_HELP, VMA_HELP } from "@/lib/helpTexts";
import { BIKE_POSITIONS } from "@/lib/intensity";
import type { SettingsFormValues } from "@/lib/schemas/settings";

/** VMA, PMA, vélo, poids du vélo et position aéro du bloc Paramètres. */
export function AthleteFields() {
  const {
    register,
    control,
    setValue,
    formState: { errors, dirtyFields, isSubmitted },
  } = useFormContext<SettingsFormValues>();

  const hasBike = useWatch({ control, name: "athlete.hasBike" });
  const bikeKg = useWatch({ control, name: "athlete.bikeKg" });

  const vmaError = errors.athlete?.vmaKmh?.message;
  const pmaError = errors.athlete?.pmaWatts?.message;
  const bikeKgMessage = errors.athlete?.bikeKg?.message;
  // Comme avant : le poids du vélo n'affiche rien tant qu'il n'a pas été saisi
  // ni qu'aucune validation n'a eu lieu.
  const bikeKgError =
    bikeKgMessage &&
    (bikeKg.trim() !== "" ||
      isSubmitted ||
      Boolean(dirtyFields.athlete?.bikeKg))
      ? bikeKgMessage
      : undefined;

  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="vma" className={FIELD_LABEL}>
            VMA (km/h)
          </label>
          <input
            id="vma"
            type="text"
            inputMode="decimal"
            {...register("athlete.vmaKmh")}
            aria-invalid={vmaError ? true : undefined}
            aria-describedby={vmaError ? "erreur-vma" : undefined}
            className={FIELD}
          />
          <FieldError id="erreur-vma" message={vmaError} />
          <div className="mt-1 flex justify-end">
            <InfoTooltip id="help-vma" label="Aide : VMA" title="VMA">
              {VMA_HELP}
            </InfoTooltip>
          </div>
        </div>

        <div>
          <label htmlFor="pma" className={FIELD_LABEL}>
            PMA (W)
          </label>
          <input
            id="pma"
            type="text"
            inputMode="numeric"
            {...register("athlete.pmaWatts")}
            aria-invalid={pmaError ? true : undefined}
            aria-describedby={pmaError ? "erreur-pma" : undefined}
            className={FIELD}
          />
          <FieldError id="erreur-pma" message={pmaError} />
          <div className="mt-1 flex justify-end">
            <InfoTooltip id="help-pma" label="Aide : PMA" title="PMA">
              {PMA_HELP}
            </InfoTooltip>
          </div>
        </div>
      </div>

      <div className="mt-2">
        <label
          htmlFor="ajouter-velo"
          className="flex h-11 w-fit cursor-pointer items-center gap-3 text-sm font-medium text-ink"
        >
          <input
            id="ajouter-velo"
            type="checkbox"
            {...register("athlete.hasBike", {
              // Sans vélo, le poids du vélo est oublié.
              onChange: (event) => {
                if (!event.target.checked) {
                  setValue("athlete.bikeKg", "");
                }
              },
            })}
            className="h-5 w-5 rounded border-line accent-accent focus-visible:ring-2 focus-visible:ring-accent-strong"
          />
          Ajouter un vélo
        </label>
      </div>

      {hasBike ? (
        <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="poids-velo" className={FIELD_LABEL}>
              Poids du vélo (kg)
            </label>
            <input
              id="poids-velo"
              type="text"
              inputMode="decimal"
              {...register("athlete.bikeKg")}
              aria-invalid={bikeKgError ? true : undefined}
              aria-describedby={
                bikeKgError ? "erreur-poids-velo" : undefined
              }
              className={FIELD}
            />
            <FieldError id="erreur-poids-velo" message={bikeKgError} />
          </div>

          <div>
            <label htmlFor="position-aero" className={FIELD_LABEL}>
              Position aéro
            </label>
            <select
              id="position-aero"
              {...register("athlete.bikePosition")}
              className={FIELD}
            >
              {BIKE_POSITIONS.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
    </>
  );
}
