import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import NutritionPage from "@/app/nutrition/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("page plan de nutrition", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("affiche le titre et invite à revenir au formulaire sans données", async () => {
    render(<NutritionPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Plan de nutrition" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Données introuvables")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Revenir au formulaire" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
