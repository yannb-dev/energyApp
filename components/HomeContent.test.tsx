import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomeContent from "@/components/HomeContent";

const navigation = vi.hoisted(() => ({ search: new URLSearchParams(), push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => navigation.search,
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

describe("HomeContent", () => {
  beforeEach(() => {
    navigation.search = new URLSearchParams();
    navigation.push.mockClear();
    window.localStorage.clear();
  });

  it("restaure la distance, la vitesse et l'unité de l'URL (exemple 18)", () => {
    navigation.search = new URLSearchParams("km=10&v=5:00&u=minkm");

    render(<HomeContent />);

    expect(screen.getByLabelText("Distance (km)")).toHaveValue("10");
    expect(screen.getByLabelText("Allure (min/km)")).toHaveValue("5:00");
    expect(screen.getByRole("radio", { name: "min/km" })).toBeChecked();
  });

  it("ignore les trois paramètres quand l'unité est inconnue (exemple 18)", () => {
    navigation.search = new URLSearchParams("km=10&v=5:00&u=xx");

    render(<HomeContent />);

    expect(screen.getByLabelText("Distance (km)")).toHaveValue("");
    expect(screen.getByLabelText("Vitesse (km/h)")).toHaveValue("");
  });

  it("ignore les trois paramètres quand la distance est invalide (exemple 18)", () => {
    navigation.search = new URLSearchParams("km=abc&v=5:00&u=minkm");

    render(<HomeContent />);

    expect(screen.getByLabelText("Distance (km)")).toHaveValue("");
    expect(screen.getByLabelText("Vitesse (km/h)")).toHaveValue("");
  });

  it("ignore les paramètres incomplets et l'ancien paramètre min", () => {
    navigation.search = new URLSearchParams("km=10&min=120");

    render(<HomeContent />);

    expect(screen.getByLabelText("Distance (km)")).toHaveValue("");
    expect(screen.getByLabelText("Vitesse (km/h)")).toHaveValue("");
  });

  it("transmet la durée dérivée et l'effort au calcul de la nutrition (exemple 19)", async () => {
    render(<HomeContent />);
    const u = userEvent.setup();

    await fillProduct(u);
    await u.type(screen.getByLabelText("Distance (km)"), "10");
    await u.type(screen.getByLabelText("Vitesse (km/h)"), "12");
    await u.click(screen.getByRole("button", { name: "Calculer ma nutrition" }));

    expect(navigation.push).toHaveBeenCalledWith(
      "/nutrition?min=50&km=10&v=12&u=kmh",
    );
  });

  it("transmet une allure encodée dans l'URL du plan", async () => {
    render(<HomeContent />);
    const u = userEvent.setup();

    await u.selectOptions(screen.getByLabelText("Sport"), "course-modere");
    await fillProduct(u);
    await u.type(screen.getByLabelText("Distance (km)"), "10");
    await u.type(screen.getByLabelText("Allure (min/km)"), "5:00");
    await u.click(screen.getByRole("button", { name: "Calculer ma nutrition" }));

    expect(navigation.push).toHaveBeenCalledWith(
      "/nutrition?min=50&km=10&v=5%3A00&u=minkm",
    );
  });
});
