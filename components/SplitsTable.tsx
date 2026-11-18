/**
 * Temps de passage par kilomètre : tableau accessible, hauteur bornée,
 * aucun défilement horizontal.
 */

import { formatPace } from "@/lib/effort";
import { formatClock } from "@/lib/pacingFormat";
import type { PacingResult } from "@/lib/pacingRun";

/** Un kilomètre est « partiel » dès qu'il est plus court que 0,999 km. */
const FULL_KM_TOLERANCE = 0.001;

/** Affichage à la française : une décimale, virgule comprise. */
function frenchOneDecimal(value: number): string {
  return String(Math.round(value * 10) / 10).replace(".", ",");
}

type SplitsTableProps = {
  result: PacingResult;
  /** Vrai pour le vélo : la colonne vitesse remplace l'allure. */
  bike: boolean;
};

export default function SplitsTable({ result, bike }: SplitsTableProps) {
  // Libellé de chaque ligne : numéro du kilomètre, ou distance réelle du dernier partiel.
  const kmLabels: string[] = [];
  let travelledKm = 0;
  for (const split of result.splits) {
    travelledKm += split.distanceKm;
    const partial = split.distanceKm < 1 - FULL_KM_TOLERANCE;
    kmLabels.push(partial ? frenchOneDecimal(travelledKm) : String(split.km));
  }

  return (
    <div className="max-h-80 w-full overflow-x-hidden overflow-y-auto rounded-xl border border-line">
      <table
        data-testid="gpx-splits"
        className="w-full table-fixed border-collapse text-xs sm:text-sm"
      >
        <caption className="sr-only">Temps de passage par kilomètre</caption>
        <thead className="sticky top-0 bg-surface-2 text-muted">
          <tr>
            <th scope="col" className="w-1/5 px-2 py-2 text-left font-semibold">
              Km
            </th>
            <th scope="col" className="w-1/3 px-2 py-2 text-left font-semibold">
              Temps de passage
            </th>
            <th scope="col" className="w-1/4 px-2 py-2 text-left font-semibold">
              {bike ? "Vitesse" : "Allure"}
            </th>
            <th scope="col" className="px-2 py-2 text-right font-semibold">
              D+
            </th>
          </tr>
        </thead>
        <tbody>
          {result.splits.map((split, index) => {
            return (
              <tr key={split.km} className="border-t border-line">
                <td className="px-2 py-1.5 text-left text-ink">
                  {kmLabels[index]}
                </td>
                <td className="px-2 py-1.5 text-left text-muted">
                  {formatClock(split.cumulativeSec)}
                </td>
                <td className="px-2 py-1.5 text-left text-muted">
                  {bike
                    ? `${frenchOneDecimal(split.speedKmh)} km/h`
                    : formatPace(split.paceSecPerKm)}
                </td>
                <td className="px-2 py-1.5 text-right text-muted">
                  {Math.round(split.ascentM)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
