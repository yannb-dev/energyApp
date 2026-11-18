/**
 * Formatage du parcours GPX : horloge des temps de passage et résumé du profil.
 * Aucun calcul de modèle ici : uniquement de la présentation.
 */

import type { Track } from "@/lib/gpx";

/** Affichage à la française : un nombre arrondi à une décimale, virgule comprise. */
function frenchOneDecimal(value: number): string {
  return String(Math.round(value * 10) / 10).replace(".", ",");
}

/** « 53:34 », « 1:05:09 » : h:mm:ss au-delà d'une heure, m:ss en dessous. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.round(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  const pad = (value: number): string => String(value).padStart(2, "0");

  if (hours === 0) {
    return `${minutes}:${pad(rest)}`;
  }
  return `${hours}:${pad(minutes)}:${pad(rest)}`;
}

/** Texte de l'`aria-label` du profil altimétrique : distance, altitude, D+. */
export function buildProfileSummary(track: Track): string {
  const distanceKm = frenchOneDecimal(track.distanceKm);

  if (!track.hasElevation || track.profile.length === 0) {
    return `Profil de ${distanceKm} km, altitude absente de la trace.`;
  }

  let lowest = track.profile[0].eleM;
  let highest = track.profile[0].eleM;
  for (const point of track.profile) {
    lowest = Math.min(lowest, point.eleM);
    highest = Math.max(highest, point.eleM);
  }

  return (
    `Profil de ${distanceKm} km, altitude de ${Math.round(lowest)} à ${Math.round(highest)} m, ` +
    `${Math.round(track.ascentM)} m de dénivelé positif`
  );
}
