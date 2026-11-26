import type { z } from "zod";

/**
 * Seul point d'accès au localStorage du projet.
 * Aucun import de domaine : ce module ne connaît que des clés et des schémas.
 */

/** localStorage, ou null s'il est indisponible (navigateur qui refuse, mode privé…). */
function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Relit une valeur enregistrée et la valide avec son schéma.
 * null si le stockage est indisponible, si la clé est absente, si le JSON est
 * invalide ou si le schéma échoue.
 */
export function loadItem<S extends z.ZodType>(
  key: string,
  schema: S,
): z.output<S> | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }

  if (raw === null) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = schema.safeParse(parsed);
  return result.success ? result.data : null;
}

/** true si la clé existe ; false si elle est absente ou si le stockage est indisponible. */
export function hasItem(key: string): boolean {
  const storage = getStorage();
  if (!storage) {
    return false;
  }

  try {
    return storage.getItem(key) !== null;
  } catch {
    return false;
  }
}

/** Enregistre une valeur en JSON ; silencieux si le stockage est indisponible. */
export function saveItem(key: string, value: unknown): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Stockage indisponible : l'application continue sans persistance.
  }
}

/** Efface une ou plusieurs clés ; silencieux si le stockage est indisponible. */
export function removeItems(...keys: string[]): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    for (const key of keys) {
      storage.removeItem(key);
    }
  } catch {
    // Stockage indisponible : l'application continue sans persistance.
  }
}
