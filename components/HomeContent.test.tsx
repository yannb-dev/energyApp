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

  it("restaure la durée de l'URL dans le bloc Activité", () => {
    navigation.search = new URLSearchParams("min=120");

    render(<HomeContent />);

    expect(screen.getByLabelText("Durée (minutes)")).toHaveValue(120);
  });

  it("ignore une durée invalide dans l'URL", () => {
    navigation.search = new URLSearchParams("min=0");

    render(<HomeContent />);

    expect(screen.getByLabelText("Durée (minutes)")).toHaveValue(null);
  });

  it("transmet la durée saisie au calcul de la nutrition", async () => {
    render(<HomeContent />);
    const u = userEvent.setup();

    await fillProduct(u);
    await u.type(screen.getByLabelText("Durée (minutes)"), "90");
    await u.click(screen.getByRole("button", { name: "Calculer ma nutrition" }));

    expect(navigation.push).toHaveBeenCalledWith("/nutrition?min=90");
  });
});
