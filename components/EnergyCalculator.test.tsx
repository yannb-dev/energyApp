import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import EnergyCalculator from "@/components/EnergyCalculator";
import useSettingsForm from "@/components/forms/useSettingsForm";
import {
  ATHLETE_STORAGE_KEY,
  type AthleteSettings,
} from "@/lib/athleteStorage";
import type { ActivityState } from "@/lib/activity";
import { PROFILE_STORAGE_KEY, type ProfileSettings } from "@/lib/profileStorage";
import {
  ActivityProbe,
  renderWithProviders,
} from "@/test/renderWithProviders";

// Le mode GPX est couvert par GpxActivity.test.tsx : ici on ne vérifie que le câblage.
vi.mock("@/components/GpxActivity", async () => {
  const { useActivity } = await import(
    "@/components/providers/ActivityProvider"
  );

  function GpxActivityMock({
    onEditSettings,
  }: {
    onEditSettings: () => void;
  }) {
    const { dispatch } = useActivity();
    return (
      <div>
        <button
          type="button"
          onClick={() =>
            dispatch({ type: "gpxMinutesChanged", minutes: 54 })
          }
        >
          Simuler la trace
        </button>
        <button type="button" onClick={onEditSettings}>
          Rouvrir les paramètres
        </button>
      </div>
    );
  }

  return { __esModule: true, default: GpxActivityMock };
});

const user = () => userEvent.setup();

/** Monte le bloc Paramètres + Activité comme le fait `HomeContent`. */
function CalculatorHarness() {
  const settings = useSettingsForm();
  return (
    <EnergyCalculator
      settings={settings}
      showEmptyErrors={false}
      onReset={() => {}}
      caps={<p>Plafond à respecter</p>}
    />
  );
}

/** Un champ vide n'affiche son erreur qu'après une tentative : le probe suit la durée publiée. */
function renderCalculator(
  options: { activity?: Partial<ActivityState> } = {},
) {
  return renderWithProviders(
    <>
      <CalculatorHarness />
      <ActivityProbe />
    </>,
    options,
  );
}

function minutesText(): string {
  return screen.getByTestId("activity-minutes").textContent ?? "";
}

/** Profil enregistré de référence : femme, 35 ans, niveau « Modéré ». */
const PROFILE: ProfileSettings = {
  sex: "female",
  age: "35",
  weightKg: "65",
  heightCm: "168",
  activityIndex: 2,
};

function storeProfile(profile: ProfileSettings = PROFILE) {
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

function storedProfile(): unknown {
  const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  return raw === null ? null : JSON.parse(raw);
}

/** Données athlète enregistrées de référence. */
const ATHLETE: AthleteSettings = {
  vmaKmh: "16",
  pmaWatts: "250",
  hasBike: true,
  bikeKg: "8",
  bikePosition: "hoods",
};

function storeAthlete(athlete: AthleteSettings = ATHLETE) {
  window.localStorage.setItem(ATHLETE_STORAGE_KEY, JSON.stringify(athlete));
}

function storedAthlete(): unknown {
  const raw = window.localStorage.getItem(ATHLETE_STORAGE_KEY);
  return raw === null ? null : JSON.parse(raw);
}

/** Profil seul, sans le sport ni l'effort. */
async function fillProfile(u: ReturnType<typeof userEvent.setup>) {
  await u.click(screen.getByLabelText("Homme"));
  await u.type(screen.getByLabelText("Âge (ans)"), "30");
  await u.type(screen.getByLabelText("Poids (kg)"), "70");
  await u.type(screen.getByLabelText("Taille (cm)"), "175");
}

/** Profil complet : course à pied, 10 km à 5:00 min/km, soit 50 min. */
async function fillValidProfile() {
  const u = user();
  await fillProfile(u);
  await u.selectOptions(screen.getByLabelText("Sport"), "course-modere");
  await u.type(screen.getByLabelText("Distance (km)"), "10");
  await u.type(screen.getByLabelText("Allure (min/km)"), "5:00");
  return u;
}

const kmhRadio = () => screen.getByRole("radio", { name: "km/h" });
const minkmRadio = () => screen.getByRole("radio", { name: "min/km" });
const validateButton = () => screen.getByRole("button", { name: "Valider" });
const editButton = () =>
  screen.getByRole("button", { name: "Modifier mes paramètres" });

describe("EnergyCalculator", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("expose chaque champ avec un label", () => {
    renderCalculator();

    expect(screen.getByLabelText("Homme")).toBeInTheDocument();
    expect(screen.getByLabelText("Femme")).toBeInTheDocument();
    expect(screen.getByLabelText("Âge (ans)")).toBeInTheDocument();
    expect(screen.getByLabelText("Poids (kg)")).toBeInTheDocument();
    expect(screen.getByLabelText("Taille (cm)")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Niveau d'activité physique"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Sport")).toBeInTheDocument();
    expect(screen.getByLabelText("Distance (km)")).toBeInTheDocument();
    expect(screen.getByLabelText("Vitesse (km/h)")).toBeInTheDocument();
    expect(kmhRadio()).toBeChecked();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
  });

  it("propose les 5 paliers d'activité et démarre sur Léger", () => {
    renderCalculator();

    const slider = screen.getByLabelText("Niveau d'activité physique");
    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "4");
    expect(slider).toHaveValue("1");
    expect(screen.getAllByTestId("activity-level")).toHaveLength(5);
    expect(screen.getByTestId("activity-label")).toHaveTextContent("Léger");
  });

  it("affiche la mention d'estimation indicative non médicale", () => {
    renderCalculator();

    expect(
      screen.getByText(/estimation indicative, non médicale/i),
    ).toBeInTheDocument();
  });

  it("affiche une erreur pour des valeurs hors bornes", async () => {
    renderCalculator();
    const u = await fillValidProfile();

    const age = screen.getByLabelText("Âge (ans)");
    await u.clear(age);
    await u.type(age, "9");
    expect(
      screen.getByText(/L'âge doit être entre 10 et 100 ans/),
    ).toBeInTheDocument();

    await u.clear(age);
    await u.type(age, "30");
    expect(
      screen.queryByText(/L'âge doit être entre 10 et 100 ans/),
    ).not.toBeInTheDocument();

    const weight = screen.getByLabelText("Poids (kg)");
    await u.clear(weight);
    await u.type(weight, "29");
    expect(
      screen.getByText(/Le poids doit être entre 30 et 300 kg/),
    ).toBeInTheDocument();

    const height = screen.getByLabelText("Taille (cm)");
    await u.clear(height);
    await u.type(height, "251");
    expect(
      screen.getByText(/La taille doit être entre 100 et 250 cm/),
    ).toBeInTheDocument();
  });

  it("affiche les erreurs de distance, de format et de durée calculée", async () => {
    renderCalculator();
    const u = await fillValidProfile();

    const distance = screen.getByLabelText("Distance (km)");
    await u.clear(distance);
    await u.type(distance, "0");
    expect(
      screen.getByText("La distance doit être entre 0,1 et 1000 km."),
    ).toBeInTheDocument();

    await u.clear(distance);
    await u.type(distance, "10");

    const pace = screen.getByLabelText("Allure (min/km)");
    await u.clear(pace);
    await u.type(pace, "abc");
    expect(
      screen.getByText("L'allure doit être au format mm:ss (ex. 5:30)."),
    ).toBeInTheDocument();

    await u.clear(pace);
    await u.type(pace, "0:00");
    expect(
      screen.getByText("L'allure doit être entre 0:36 et 60:00 min/km."),
    ).toBeInTheDocument();

    await u.clear(pace);
    await u.type(pace, "5:00");
    await u.clear(distance);
    await u.type(distance, "1000");
    expect(
      screen.getByText("La durée calculée doit être entre 1 minute et 24 h."),
    ).toBeInTheDocument();
  });

  it("signale l'erreur de distance et d'erreur-vitesse avec les bons ids", async () => {
    renderCalculator();
    const u = await fillValidProfile();

    const pace = screen.getByLabelText("Allure (min/km)");
    await u.clear(pace);
    await u.type(pace, "abc");

    expect(pace).toHaveAttribute("aria-invalid", "true");
    expect(pace).toHaveAttribute("aria-describedby", "erreur-vitesse");
    expect(document.getElementById("erreur-vitesse")).toHaveAttribute(
      "role",
      "alert",
    );

    const distance = screen.getByLabelText("Distance (km)");
    await u.clear(distance);
    await u.type(distance, "0");
    expect(distance).toHaveAttribute("aria-describedby", "erreur-distance");
    expect(document.getElementById("erreur-distance")).toHaveAttribute(
      "role",
      "alert",
    );
  });

  it("choisit l'unité selon le sport quand la vitesse est vide", async () => {
    renderCalculator();
    const u = user();

    await u.selectOptions(screen.getByLabelText("Sport"), "course-modere");
    expect(minkmRadio()).toBeChecked();
    expect(screen.getByLabelText("Allure (min/km)")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Vitesse (km/h)"),
    ).not.toBeInTheDocument();

    await u.selectOptions(
      screen.getByLabelText("Sport"),
      "velo-route-vtt-modere",
    );
    expect(kmhRadio()).toBeChecked();
    expect(screen.getByLabelText("Vitesse (km/h)")).toBeInTheDocument();
  });

  it("conserve l'unité et la valeur saisies quand le sport change", async () => {
    renderCalculator();
    const u = user();

    await u.selectOptions(
      screen.getByLabelText("Sport"),
      "velo-route-vtt-modere",
    );
    await u.type(screen.getByLabelText("Vitesse (km/h)"), "25");

    await u.selectOptions(screen.getByLabelText("Sport"), "course-modere");

    expect(kmhRadio()).toBeChecked();
    expect(screen.getByLabelText("Vitesse (km/h)")).toHaveValue("25");
    expect(
      screen.queryByLabelText("Allure (min/km)"),
    ).not.toBeInTheDocument();
  });

  it("convertit la valeur saisie lors d'une bascule d'unité", async () => {
    renderCalculator();
    const u = user();

    await fillProfile(u);
    await u.selectOptions(
      screen.getByLabelText("Sport"),
      "velo-route-vtt-modere",
    );
    await u.type(screen.getByLabelText("Distance (km)"), "10");
    await u.type(screen.getByLabelText("Vitesse (km/h)"), "12");

    expect(screen.getByTestId("effort-duration")).toHaveTextContent(
      "Durée de l'effort : 50 min · soit 5:00 min/km",
    );

    await u.click(minkmRadio());

    expect(screen.getByLabelText("Allure (min/km)")).toHaveValue("5:00");
    expect(screen.getByTestId("effort-duration")).toHaveTextContent(
      "Durée de l'effort : 50 min · soit 12 km/h",
    );
  });

  it("affiche la ligne de durée seulement quand elle est calculable", async () => {
    renderCalculator();
    const u = user();

    expect(screen.queryByTestId("effort-duration")).not.toBeInTheDocument();

    await u.type(screen.getByLabelText("Distance (km)"), "10");
    await u.type(screen.getByLabelText("Vitesse (km/h)"), "12");

    const status = screen.getByTestId("effort-duration");
    expect(status).toHaveTextContent("50 min");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(minutesText()).toBe("50");

    await u.clear(screen.getByLabelText("Distance (km)"));

    expect(screen.queryByTestId("effort-duration")).not.toBeInTheDocument();
    expect(minutesText()).toBe("");
  });

  it("préremplit l'effort et publie chaque changement puis le Reset", async () => {
    renderCalculator({
      activity: {
        effort: { distanceKm: "10", speed: "12", speedUnit: "kmh" },
      },
    });
    const u = user();

    expect(screen.getByLabelText("Distance (km)")).toHaveValue("10");
    expect(screen.getByLabelText("Vitesse (km/h)")).toHaveValue("12");
    expect(screen.getByTestId("effort-duration")).toHaveTextContent("50 min");
    expect(minutesText()).toBe("50");

    await u.clear(screen.getByLabelText("Distance (km)"));
    await u.type(screen.getByLabelText("Distance (km)"), "20");
    expect(minutesText()).toBe("100");

    await u.click(screen.getByRole("button", { name: "Reset" }));
    expect(minutesText()).toBe("");
  });

  describe("profil « Paramètres »", () => {
    it("démarre en édition quand aucun profil n'est enregistré (exemple 7)", () => {
      renderCalculator();

      expect(validateButton()).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Modifier mes paramètres" }),
      ).not.toBeInTheDocument();
      expect(screen.getByLabelText("Âge (ans)")).toBeInTheDocument();
    });

    it("affiche les erreurs et n'enregistre rien pour un profil vide (exemple 8)", async () => {
      renderCalculator();

      await user().click(validateButton());

      expect(screen.getByText("Choisis un sexe.")).toBeInTheDocument();
      expect(screen.getByText("L'âge est obligatoire.")).toBeInTheDocument();
      expect(screen.getByText("Le poids est obligatoire.")).toBeInTheDocument();
      expect(screen.getByText("La taille est obligatoire.")).toBeInTheDocument();
      expect(storedProfile()).toBeNull();
      expect(screen.getByLabelText("Âge (ans)")).toBeInTheDocument();
      expect(screen.getByLabelText("Homme")).toHaveFocus();
    });

    it("enregistre le profil et replie le bloc (exemple 9)", async () => {
      renderCalculator();
      const u = user();

      await fillProfile(u);
      await u.click(validateButton());

      expect(storedProfile()).toEqual({
        sex: "male",
        age: "30",
        weightKg: "70",
        heightCm: "175",
        activityIndex: 1,
      });
      expect(screen.queryByLabelText("Âge (ans)")).not.toBeInTheDocument();
      expect(editButton()).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Valider" })).not.toBeInTheDocument();
    });

    it("replie le bloc avec un profil enregistré (exemple 10)", () => {
      storeProfile();
      renderCalculator();

      expect(screen.queryByLabelText("Âge (ans)")).not.toBeInTheDocument();
      expect(editButton()).toHaveAttribute("aria-expanded", "false");
    });

    it("affiche « obligatoire » dès qu'un âge saisi est vidé (exemple 6)", async () => {
      renderCalculator();
      const u = user();

      const age = screen.getByLabelText("Âge (ans)");
      await u.type(age, "30");
      expect(
        screen.queryByText("L'âge est obligatoire."),
      ).not.toBeInTheDocument();

      await u.clear(age);
      expect(screen.getByText("L'âge est obligatoire.")).toBeInTheDocument();
      expect(validateButton()).toBeInTheDocument();
    });

    it("réaffiche les valeurs enregistrées et place le focus en tête (exemple 11)", async () => {
      storeProfile();
      renderCalculator();

      await user().click(editButton());

      expect(screen.getByLabelText("Femme")).toBeChecked();
      expect(screen.getByLabelText("Âge (ans)")).toHaveValue(35);
      expect(screen.getByLabelText("Poids (kg)")).toHaveValue(65);
      expect(screen.getByLabelText("Taille (cm)")).toHaveValue(168);
      expect(screen.getByLabelText("Niveau d'activité physique")).toHaveValue("2");
      expect(screen.getByLabelText("Homme")).toHaveFocus();
      expect(validateButton()).toBeInTheDocument();
    });

    it("met à jour le profil à la seconde validation (exemple 12)", async () => {
      storeProfile();
      renderCalculator();
      const u = user();

      await u.click(editButton());
      await u.clear(screen.getByLabelText("Âge (ans)"));
      await u.type(screen.getByLabelText("Âge (ans)"), "40");
      await u.click(validateButton());

      expect(storedProfile()).toMatchObject({ age: "40" });
      expect(screen.queryByLabelText("Âge (ans)")).not.toBeInTheDocument();
      expect(editButton()).toBeInTheDocument();
    });

    it("valide malgré un sport ou un effort manquants (exemple 13)", async () => {
      renderCalculator();
      const u = user();

      await fillProfile(u);
      await u.click(validateButton());

      expect(storedProfile()).not.toBeNull();
      expect(screen.queryByText("Choisis un sport.")).not.toBeInTheDocument();
      expect(
        screen.queryByText("La distance est obligatoire."),
      ).not.toBeInTheDocument();
    });

    it("« Valider » n'envoie pas le formulaire (exemple 16)", async () => {
      renderCalculator();
      const u = user();

      await fillProfile(u);
      await u.click(validateButton());

      expect(screen.queryByText("Choisis un sport.")).not.toBeInTheDocument();
      expect(
        screen.queryByText("La vitesse est obligatoire."),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("La distance est obligatoire."),
      ).not.toBeInTheDocument();
    });

    it("Reset vide sport, distance et vitesse mais garde le profil (exemple 15)", async () => {
      renderCalculator();
      const u = await fillValidProfile();
      await u.click(validateButton());

      const saved = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      expect(saved).not.toBeNull();

      await u.click(screen.getByRole("button", { name: "Reset" }));

      expect(screen.getByLabelText("Sport")).toHaveValue("");
      expect(screen.getByLabelText("Distance (km)")).toHaveValue("");
      expect(screen.getByLabelText("Vitesse (km/h)")).toHaveValue("");
      expect(screen.queryByLabelText("Âge (ans)")).not.toBeInTheDocument();
      expect(editButton()).toBeInTheDocument();
      expect(window.localStorage.getItem(PROFILE_STORAGE_KEY)).toBe(saved);
      expect(screen.getByLabelText("Sport")).toHaveFocus();
      expect(minutesText()).toBe("");
    });
  });

  describe("athlète « Paramètres »", () => {
    it("affiche les champs du vélo seulement quand il est coché (exemple 7)", async () => {
      renderCalculator();
      const u = user();

      expect(
        screen.queryByLabelText("Poids du vélo (kg)"),
      ).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Position aéro")).not.toBeInTheDocument();

      await u.click(screen.getByLabelText("Ajouter un vélo"));

      expect(screen.getByLabelText("Poids du vélo (kg)")).toBeInTheDocument();
      expect(screen.getByLabelText("Position aéro")).toBeInTheDocument();
      expect(screen.getByLabelText("Position aéro")).toHaveValue("hoods");

      await u.click(screen.getByLabelText("Ajouter un vélo"));

      expect(
        screen.queryByLabelText("Poids du vélo (kg)"),
      ).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Position aéro")).not.toBeInTheDocument();
    });

    it("bloque l'enregistrement pour une VMA hors bornes (exemple 8)", async () => {
      renderCalculator();
      const u = user();

      await fillProfile(u);
      await u.type(screen.getByLabelText("VMA (km/h)"), "45");
      await u.click(validateButton());

      expect(
        screen.getByText("La VMA doit être entre 8 et 30 km/h."),
      ).toBeInTheDocument();
      expect(window.localStorage.getItem(ATHLETE_STORAGE_KEY)).toBeNull();
      expect(window.localStorage.getItem(PROFILE_STORAGE_KEY)).toBeNull();
      expect(
        screen.queryByRole("button", { name: "Modifier mes paramètres" }),
      ).not.toBeInTheDocument();
      expect(screen.getByLabelText("VMA (km/h)")).toHaveFocus();
    });

    it("enregistre profil et données athlète puis replie le bloc (exemple 9)", async () => {
      renderCalculator();
      const u = user();

      await fillProfile(u);
      await u.type(screen.getByLabelText("VMA (km/h)"), "16");
      await u.click(screen.getByLabelText("Ajouter un vélo"));
      await u.type(screen.getByLabelText("Poids du vélo (kg)"), "8");
      await u.click(validateButton());

      expect(storedProfile()).not.toBeNull();
      expect(storedAthlete()).toEqual({
        vmaKmh: "16",
        pmaWatts: "",
        hasBike: true,
        bikeKg: "8",
        bikePosition: "hoods",
      });
      expect(editButton()).toBeInTheDocument();
      expect(screen.queryByLabelText("VMA (km/h)")).not.toBeInTheDocument();
    });

    it("préremplit VMA, PMA et vélo au rechargement (exemple 10)", async () => {
      storeProfile();
      storeAthlete({ ...ATHLETE, bikePosition: "aero" });
      renderCalculator();

      expect(screen.queryByLabelText("VMA (km/h)")).not.toBeInTheDocument();

      await user().click(editButton());

      expect(screen.getByLabelText("VMA (km/h)")).toHaveValue("16");
      expect(screen.getByLabelText("PMA (W)")).toHaveValue("250");
      expect(screen.getByLabelText("Ajouter un vélo")).toBeChecked();
      expect(screen.getByLabelText("Poids du vélo (kg)")).toHaveValue("8");
      expect(screen.getByLabelText("Position aéro")).toHaveValue("aero");
    });

    it("replie le bloc avec un profil seul et laisse l'athlète vide (exemple 11)", async () => {
      storeProfile();
      renderCalculator();

      expect(editButton()).toHaveAttribute("aria-expanded", "false");

      await user().click(editButton());

      expect(screen.getByLabelText("VMA (km/h)")).toHaveValue("");
      expect(screen.getByLabelText("PMA (W)")).toHaveValue("");
      expect(screen.getByLabelText("Ajouter un vélo")).not.toBeChecked();
    });
  });

  describe("mode GPX (SPEC-07.5)", () => {
    it("n'affiche le sélecteur de mode que pour les sports GPX (exemple 12)", async () => {
      renderCalculator();
      const u = user();

      expect(
        screen.queryByRole("radiogroup", { name: "Mode de saisie" }),
      ).not.toBeInTheDocument();

      await u.selectOptions(screen.getByLabelText("Sport"), "course-modere");

      expect(
        screen.getByRole("radiogroup", { name: "Mode de saisie" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("radio", { name: "Saisie manuelle" }),
      ).toBeChecked();

      await u.selectOptions(screen.getByLabelText("Sport"), "randonnee-modere");

      expect(
        screen.queryByRole("radiogroup", { name: "Mode de saisie" }),
      ).not.toBeInTheDocument();
    });

    it("repasse en saisie manuelle quand le sport ne supporte plus le GPX (exemple 12)", async () => {
      renderCalculator();
      const u = user();

      await u.selectOptions(screen.getByLabelText("Sport"), "course-modere");
      await u.click(screen.getByRole("radio", { name: "Trace GPX" }));

      expect(
        screen.getByRole("button", { name: "Simuler la trace" }),
      ).toBeInTheDocument();
      expect(screen.queryByLabelText("Distance (km)")).not.toBeInTheDocument();

      await u.click(screen.getByRole("button", { name: "Simuler la trace" }));
      expect(minutesText()).toBe("54");

      await u.selectOptions(screen.getByLabelText("Sport"), "randonnee-modere");

      expect(screen.getByLabelText("Distance (km)")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Simuler la trace" }),
      ).not.toBeInTheDocument();
      expect(minutesText()).toBe("");
    });

    it("conserve les champs manuels quand on change de mode (exemple 12)", async () => {
      renderCalculator();
      const u = user();

      await u.selectOptions(screen.getByLabelText("Sport"), "course-modere");
      await u.type(screen.getByLabelText("Distance (km)"), "10");

      await u.click(screen.getByRole("radio", { name: "Trace GPX" }));
      await u.click(screen.getByRole("radio", { name: "Saisie manuelle" }));

      expect(screen.getByLabelText("Distance (km)")).toHaveValue("10");
    });

    it("la saisie manuelle publie la durée comme avant (exemple 13)", async () => {
      renderCalculator();
      await fillValidProfile();

      expect(screen.getByTestId("effort-duration")).toHaveTextContent("50 min");
      expect(
        screen.queryByRole("button", { name: "Simuler la trace" }),
      ).not.toBeInTheDocument();
    });
  });
});
