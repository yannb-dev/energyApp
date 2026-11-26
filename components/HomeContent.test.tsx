import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomeContent from "@/components/HomeContent";
import { PROFILE_STORAGE_KEY, type ProfileSettings } from "@/lib/profileStorage";
import { renderWithProviders } from "@/test/renderWithProviders";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
}));

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

/** Remplit un produit solide valide de référence. */
async function fillProduct(u: ReturnType<typeof userEvent.setup>) {
  await u.type(screen.getByLabelText("Marque"), "Overstims");
  await u.type(screen.getByLabelText("Nom du produit"), "Barre endurance");
  await u.selectOptions(screen.getByLabelText("Type"), "Barre");
  await u.type(screen.getByLabelText("Énergie (kcal)"), "200");
  await u.type(screen.getByLabelText("Glucides (g)"), "25");
  await u.type(screen.getByLabelText("Sel (g)"), "0.25");
  await u.type(screen.getByLabelText("Poids (g)"), "60");
}

/** Trace GPX plate de 10 km : 101 points espacés de 0,1 km. */
function flatGpx(): string {
  const step = (0.1 * 180) / (Math.PI * 6371);
  const points = Array.from({ length: 101 }, (_, index) => {
    const lat = (45 + index * step).toFixed(9);
    return `<trkpt lat="${lat}" lon="6"><ele>100</ele></trkpt>`;
  });
  return `<?xml version="1.0"?><gpx version="1.1"><trk><trkseg>${points.join("")}</trkseg></trk></gpx>`;
}

/** Simule l'aller-retour vers `/nutrition` : HomeContent est démonté puis remonté. */
function ToggleHome() {
  const [mounted, setMounted] = useState(true);

  return (
    <>
      <button type="button" onClick={() => setMounted((current) => !current)}>
        {mounted ? "Démonter" : "Remonter"}
      </button>
      {mounted ? <HomeContent /> : null}
    </>
  );
}

const showResults = () =>
  screen.getByRole("button", { name: "Voir mes résultats" });

describe("HomeContent", () => {
  beforeEach(() => {
    navigation.push.mockClear();
    window.localStorage.clear();
  });

  it("conserve sport, effort et mode après démontage / remontage (exemple 18)", async () => {
    renderWithProviders(<ToggleHome />);
    const u = userEvent.setup();

    await u.selectOptions(screen.getByLabelText("Sport"), "course-modere");
    await u.type(screen.getByLabelText("Distance (km)"), "10");
    await u.type(screen.getByLabelText("Allure (min/km)"), "5:00");
    await u.click(screen.getByRole("radio", { name: "Trace GPX" }));

    await u.click(screen.getByRole("button", { name: "Démonter" }));
    await u.click(screen.getByRole("button", { name: "Remonter" }));

    expect(screen.getByLabelText("Sport")).toHaveValue("course-modere");
    expect(screen.getByRole("radio", { name: "Trace GPX" })).toBeChecked();

    await u.click(screen.getByRole("radio", { name: "Saisie manuelle" }));

    expect(screen.getByLabelText("Distance (km)")).toHaveValue("10");
    expect(screen.getByLabelText("Allure (min/km)")).toHaveValue("5:00");
  });

  it("transmet la durée dérivée et l'effort au calcul de la nutrition (exemple 19)", async () => {
    storeProfile();
    renderWithProviders(<HomeContent />);
    const u = userEvent.setup();

    await fillProduct(u);
    await u.selectOptions(screen.getByLabelText("Sport"), "randonnee-modere");
    await u.type(screen.getByLabelText("Distance (km)"), "10");
    await u.type(screen.getByLabelText("Vitesse (km/h)"), "12");
    await u.click(showResults());

    expect(navigation.push).toHaveBeenCalledWith("/nutrition");
  });

  it("transmet une allure encodée dans l'URL du plan", async () => {
    storeProfile();
    renderWithProviders(<HomeContent />);
    const u = userEvent.setup();

    await u.selectOptions(screen.getByLabelText("Sport"), "course-modere");
    await fillProduct(u);
    await u.type(screen.getByLabelText("Distance (km)"), "10");
    await u.type(screen.getByLabelText("Allure (min/km)"), "5:00");
    await u.click(showResults());

    expect(navigation.push).toHaveBeenCalledWith("/nutrition");
  });

  it("une trace GPX alimente la nutrition comme la saisie manuelle (exemple 14)", async () => {
    renderWithProviders(<HomeContent />);
    const u = userEvent.setup();

    await u.click(screen.getByLabelText("Homme"));
    await u.type(screen.getByLabelText("Âge (ans)"), "30");
    await u.type(screen.getByLabelText("Poids (kg)"), "70");
    await u.type(screen.getByLabelText("Taille (cm)"), "175");
    await u.type(screen.getByLabelText("VMA (km/h)"), "16");
    await u.selectOptions(screen.getByLabelText("Sport"), "course-modere");
    await u.click(screen.getByRole("radio", { name: "Trace GPX" }));

    await u.upload(
      screen.getByLabelText("Trace GPX", { selector: 'input[type="file"]' }),
      new File([flatGpx()], "t.gpx"),
    );

    expect(await screen.findByTestId("gpx-duration")).toHaveTextContent(
      "54 min",
    );

    await fillProduct(u);
    await u.click(showResults());

    expect(navigation.push).toHaveBeenCalledWith("/nutrition");
  });

  it("profil vide : erreurs Paramètres et pas de navigation (exemple 5)", async () => {
    renderWithProviders(<HomeContent />);
    const u = userEvent.setup();

    await u.click(showResults());

    expect(screen.getByText("Choisis un sexe.")).toBeInTheDocument();
    expect(screen.getByText("L'âge est obligatoire.")).toBeInTheDocument();
    expect(screen.getByText("Le poids est obligatoire.")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText("Homme")).toHaveFocus(),
    );
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("profil enregistré, sport vide : erreur Sport et pas de navigation (exemple 6)", async () => {
    storeProfile();
    renderWithProviders(<HomeContent />);
    const u = userEvent.setup();

    await fillProduct(u);
    await u.click(showResults());

    expect(screen.getByText("Choisis un sport.")).toBeInTheDocument();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("profil, activité et nutrition valides : navigue vers les résultats (exemple 7)", async () => {
    storeProfile();
    renderWithProviders(<HomeContent />);
    const u = userEvent.setup();

    await u.selectOptions(screen.getByLabelText("Sport"), "course-modere");
    await u.type(screen.getByLabelText("Distance (km)"), "10");
    await u.type(screen.getByLabelText("Allure (min/km)"), "5:00");
    await fillProduct(u);
    await u.click(showResults());

    expect(navigation.push).toHaveBeenCalledWith("/nutrition");
  });

  it("sans durée calculable : message d'activité et pas de navigation", async () => {
    storeProfile();
    renderWithProviders(<HomeContent />);
    const u = userEvent.setup();

    await u.selectOptions(screen.getByLabelText("Sport"), "course-modere");
    await fillProduct(u);
    await u.click(showResults());

    expect(screen.getByText("Renseigne la durée dans le bloc Activité.")).toBeInTheDocument();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("produit incomplet : formule ouverte en erreur et pas de navigation", async () => {
    storeProfile();
    renderWithProviders(<HomeContent />);
    const u = userEvent.setup();

    await u.selectOptions(screen.getByLabelText("Sport"), "course-modere");
    await u.type(screen.getByLabelText("Distance (km)"), "10");
    await u.type(screen.getByLabelText("Allure (min/km)"), "5:00");
    await u.click(showResults());

    expect(screen.getByText("La marque est obligatoire.")).toBeInTheDocument();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("la page 1 ne montre que la saisie (exemple 8)", () => {
    renderWithProviders(<HomeContent />);

    expect(screen.queryByTestId("results")).not.toBeInTheDocument();
    expect(screen.queryByText("Calculer")).not.toBeInTheDocument();
    expect(showResults()).toBeInTheDocument();

    const activity = screen.getByRole("region", { name: "Activité" });
    expect(within(activity).getByText("Plafond à respecter")).toBeInTheDocument();
  });

  it("mode GPX : résumé seul, sans profil ni tableau (exemple 9)", async () => {
    renderWithProviders(<HomeContent />);
    const u = userEvent.setup();

    await u.click(screen.getByLabelText("Homme"));
    await u.type(screen.getByLabelText("Âge (ans)"), "30");
    await u.type(screen.getByLabelText("Poids (kg)"), "70");
    await u.type(screen.getByLabelText("Taille (cm)"), "175");
    await u.type(screen.getByLabelText("VMA (km/h)"), "16");
    await u.selectOptions(screen.getByLabelText("Sport"), "course-modere");
    await u.click(screen.getByRole("radio", { name: "Trace GPX" }));

    await u.upload(
      screen.getByLabelText("Trace GPX", { selector: 'input[type="file"]' }),
      new File([flatGpx()], "t.gpx"),
    );

    expect(await screen.findByTestId("gpx-summary")).toBeInTheDocument();
    expect(screen.queryByTestId("gpx-profile")).not.toBeInTheDocument();
    expect(screen.queryByTestId("gpx-splits")).not.toBeInTheDocument();
  });
});
