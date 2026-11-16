import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Home from "@/app/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("page d'accueil", () => {
  it("affiche le calculateur de dépense énergétique", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        name: /Gestion alimentaire sportive/i,
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Âge (ans)")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Niveau d'activité physique"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/estimation indicative, non médicale/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Durée (minutes)")).toBeInTheDocument();
  });
});
