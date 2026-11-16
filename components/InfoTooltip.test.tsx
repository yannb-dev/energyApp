import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import InfoTooltip from "@/components/InfoTooltip";

const user = () => userEvent.setup();

const LABEL = "Aide : dépense journalière";
const TITLE = "Dépense journalière";

/** Rend une info-bulle seule et retourne son bouton « ? ». */
function renderOne() {
  render(
    <InfoTooltip id="help-tdee" label={LABEL} title={TITLE}>
      Métabolisme de base × coefficient du niveau d&apos;activité.
    </InfoTooltip>,
  );
  return screen.getByRole("button", { name: LABEL });
}

describe("InfoTooltip", () => {
  it("est fermé au départ : aucun panneau, aria-expanded à false", () => {
    const trigger = renderOne();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-controls", "help-tdee");
    expect(trigger).toHaveTextContent("?");
  });

  it("s'ouvre au clic et se referme au second clic", async () => {
    const u = user();
    const trigger = renderOne();

    await u.click(trigger);

    const panel = screen.getByRole("dialog", { name: TITLE });
    expect(panel).toHaveAttribute("id", "help-tdee");
    expect(panel).toHaveTextContent("Métabolisme de base × coefficient du niveau d'activité.");
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await u.click(trigger);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("se ferme avec le bouton « × » et rend le focus au bouton « ? »", async () => {
    const u = user();
    const trigger = renderOne();

    await u.click(trigger);
    await u.click(screen.getByRole("button", { name: "Fermer l'aide" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("se ferme avec la touche Échap et rend le focus au bouton « ? »", async () => {
    const u = user();
    const trigger = renderOne();

    await u.click(trigger);
    await u.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("se ferme au clic extérieur et rend le focus au bouton « ? »", async () => {
    const u = user();
    render(
      <>
        <InfoTooltip id="help-tdee" label={LABEL} title={TITLE}>
          Métabolisme de base × coefficient du niveau d&apos;activité.
        </InfoTooltip>
        <p>Texte extérieur</p>
      </>,
    );
    const trigger = screen.getByRole("button", { name: LABEL });

    await u.click(trigger);
    expect(screen.getByRole("dialog", { name: TITLE })).toBeInTheDocument();

    await u.click(screen.getByText("Texte extérieur"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("rend le panneau dans un portail, hors du conteneur du bouton", async () => {
    const u = user();
    const trigger = renderOne();

    await u.click(trigger);

    const panel = screen.getByRole("dialog", { name: TITLE });
    expect(trigger.parentElement).not.toContainElement(panel);
    expect(document.body).toContainElement(panel);
  });

  it("n'ouvre qu'un seul panneau à la fois", async () => {
    const u = user();
    render(
      <>
        <InfoTooltip id="help-bmr" label="Aide : métabolisme de base" title="Métabolisme de base">
          Énergie dépensée au repos.
        </InfoTooltip>
        <InfoTooltip id="help-tdee" label={LABEL} title={TITLE}>
          Métabolisme de base × coefficient du niveau d&apos;activité.
        </InfoTooltip>
      </>,
    );
    const bmr = screen.getByRole("button", { name: "Aide : métabolisme de base" });
    const tdee = screen.getByRole("button", { name: LABEL });

    await u.click(bmr);
    expect(screen.getByRole("dialog", { name: "Métabolisme de base" })).toBeInTheDocument();

    await u.click(tdee);

    expect(screen.queryByRole("dialog", { name: "Métabolisme de base" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: TITLE })).toBeInTheDocument();
    expect(bmr).toHaveAttribute("aria-expanded", "false");
    expect(tdee).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });
});
