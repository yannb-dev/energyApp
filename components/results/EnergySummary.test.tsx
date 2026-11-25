import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import EnergySummary from "@/components/results/EnergySummary";
import type { ActivityState } from "@/lib/activity";
import { PROFILE_STORAGE_KEY, type ProfileSettings } from "@/lib/profileStorage";
import { renderWithProviders } from "@/test/renderWithProviders";

/** Profil enregistré de référence : homme, 30 ans, niveau « Léger ». */
const PROFILE: ProfileSettings = {
  sex: "male",
  age: "30",
  weightKg: "70",
  heightCm: "175",
  activityIndex: 1,
};

function storeProfile(overrides: Partial<ProfileSettings> = {}) {
  window.localStorage.setItem(
    PROFILE_STORAGE_KEY,
    JSON.stringify({ ...PROFILE, ...overrides }),
  );
}

/** Course à pied, 10 km à 5:00 min/km, soit 50 min. */
const RUN_50: Partial<ActivityState> = {
  sportId: "course-modere",
  effort: { distanceKm: "10", speed: "5:00", speedUnit: "minkm" },
};

describe("EnergySummary", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("affiche les valeurs de référence du profil enregistré (exemple 10)", () => {
    storeProfile();
    renderWithProviders(<EnergySummary />, { activity: RUN_50 });

    expect(screen.getByTestId("bmr")).toHaveTextContent("1649");
    expect(screen.getByTestId("tdee")).toHaveTextContent("2267");
    expect(screen.getByTestId("effort-kcal")).toHaveTextContent("484");
    expect(screen.getByTestId("effort-share")).toHaveTextContent("21");
  });

  it("suit le niveau d'activité enregistré (exemple 10)", () => {
    storeProfile({ activityIndex: 0 });
    renderWithProviders(<EnergySummary />, { activity: RUN_50 });
    expect(screen.getByTestId("tdee")).toHaveTextContent("1979");
  });

  it("suit le niveau d'activité « Très actif » (exemple 10)", () => {
    storeProfile({ activityIndex: 4 });
    renderWithProviders(<EnergySummary />, { activity: RUN_50 });
    expect(screen.getByTestId("tdee")).toHaveTextContent("3133");
  });

  it("suit le sport et la durée de l'activité (exemple 10)", () => {
    storeProfile();
    renderWithProviders(<EnergySummary />, {
      activity: {
        sportId: "velo-route-vtt-modere",
        effort: { distanceKm: "10", speed: "12", speedUnit: "kmh" },
      },
    });
    expect(screen.getByTestId("effort-kcal")).toHaveTextContent("467");
  });

  it("propose une aide « ? » sur le métabolisme de base et la dépense journalière (exemple 10)", async () => {
    storeProfile();
    renderWithProviders(<EnergySummary />, { activity: RUN_50 });

    const bmr = screen.getByRole("button", {
      name: "Aide : métabolisme de base",
    });
    const tdee = screen.getByRole("button", {
      name: "Aide : dépense journalière",
    });

    expect(bmr).toHaveAttribute("aria-expanded", "false");
    expect(tdee).toHaveAttribute("aria-expanded", "false");
    expect(bmr).toHaveAttribute("aria-controls", "help-bmr");
    expect(tdee).toHaveAttribute("aria-controls", "help-tdee");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const u = userEvent.setup();
    await u.click(bmr);

    expect(bmr).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("dialog", { name: "Métabolisme de base" }),
    ).toHaveTextContent("Mifflin-St Jeor");

    await u.click(tdee);

    expect(tdee).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.queryByRole("dialog", { name: "Métabolisme de base" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Dépense journalière" }),
    ).toHaveTextContent("Sédentaire");
  });

  it("invite à renseigner le profil sans données", () => {
    renderWithProviders(<EnergySummary />, { activity: RUN_50 });

    expect(
      screen.getByText(
        "Renseigne ton profil et ton effort pour voir tes chiffres.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("results")).not.toBeInTheDocument();
  });
});
