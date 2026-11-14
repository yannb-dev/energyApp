import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("page d'accueil", () => {
  it("affiche le calculateur de dépense énergétique", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /dépense énergétique/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Âge (ans)")).toBeInTheDocument();
    expect(screen.getByLabelText("Niveau d'activité")).toBeInTheDocument();
    expect(screen.getByText(/estimation indicative, non médicale/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Durée de l'effort (min)")).toBeInTheDocument();
  });
});
