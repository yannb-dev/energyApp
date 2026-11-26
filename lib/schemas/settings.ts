import { z } from "zod";

import { athleteSettingsSchema } from "@/lib/schemas/athlete";
import { profileSchema } from "@/lib/schemas/profile";

/**
 * Formulaire « Paramètres » : profil, niveau d'activité et données athlète.
 * Objets imbriqués : les champs RHF s'appellent `profile.age`, `athlete.vmaKmh`…
 */
export const settingsFormSchema = z.object({
  profile: profileSchema,
  activityIndex: z.number().int(),
  athlete: athleteSettingsSchema,
});

export type SettingsFormValues = z.input<typeof settingsFormSchema>;
