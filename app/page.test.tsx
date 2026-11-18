import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Home from "@/app/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("page d'accueil", () => {
  it("n'affiche plus le titre « Gestion alimentaire sportive » (exemple 1)", () => {
    render(<Home />);

    expect(
      screen.queryByRole("heading", {
        name: /Gestion alimentaire sportive/i,
        level: 1,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Gestion alimentaire sportive/i),
    ).not.toBeInTheDocument();
  });

  it("garde un h1 neutre masqué et le paragraphe de présentation (exemple 2)", () => {
    render(<Home />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveClass("sr-only");
    expect(heading).toHaveTextContent("Accueil");
    expect(
      screen.getByText(/Métabolisme de base, dépense du jour/i),
    ).toBeInTheDocument();
  });

  it("affiche le calculateur de dépense énergétique", () => {
    render(<Home />);

    expect(screen.getByLabelText("Âge (ans)")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Niveau d'activité physique"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/estimation indicative, non médicale/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Distance (km)")).toBeInTheDocument();
  });
});
