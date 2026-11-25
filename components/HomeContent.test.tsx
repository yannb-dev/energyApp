import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomeContent from "@/components/HomeContent";
import { renderWithProviders } from "@/test/renderWithProviders";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
}));

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
    renderWithProviders(<HomeContent />);
    const u = userEvent.setup();

    await fillProduct(u);
    await u.type(screen.getByLabelText("Distance (km)"), "10");
    await u.type(screen.getByLabelText("Vitesse (km/h)"), "12");
    await u.click(screen.getByRole("button", { name: "Calculer ma nutrition" }));

    expect(navigation.push).toHaveBeenCalledWith("/nutrition");
  });

  it("transmet une allure encodée dans l'URL du plan", async () => {
    renderWithProviders(<HomeContent />);
    const u = userEvent.setup();

    await u.selectOptions(screen.getByLabelText("Sport"), "course-modere");
    await fillProduct(u);
    await u.type(screen.getByLabelText("Distance (km)"), "10");
    await u.type(screen.getByLabelText("Allure (min/km)"), "5:00");
    await u.click(screen.getByRole("button", { name: "Calculer ma nutrition" }));

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
    await u.click(screen.getByRole("button", { name: "Calculer ma nutrition" }));

    expect(navigation.push).toHaveBeenCalledWith("/nutrition");
  });
});
