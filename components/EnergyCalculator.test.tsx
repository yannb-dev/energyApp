import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import EnergyCalculator from "@/components/EnergyCalculator";

const user = () => userEvent.setup();

async function fillValidProfile() {
  const u = user();
  await u.click(screen.getByLabelText("Homme"));
  await u.type(screen.getByLabelText("Âge (ans)"), "30");
  await u.type(screen.getByLabelText("Poids (kg)"), "70");
  await u.type(screen.getByLabelText("Taille (cm)"), "175");
  await u.selectOptions(screen.getByLabelText("Sport"), "course-8");
  await u.type(screen.getByLabelText("Durée (minutes)"), "30");
  return u;
}

describe("EnergyCalculator", () => {
  it("expose chaque champ avec un label", () => {
    render(<EnergyCalculator />);

    expect(screen.getByLabelText("Homme")).toBeInTheDocument();
    expect(screen.getByLabelText("Femme")).toBeInTheDocument();
    expect(screen.getByLabelText("Âge (ans)")).toBeInTheDocument();
    expect(screen.getByLabelText("Poids (kg)")).toBeInTheDocument();
    expect(screen.getByLabelText("Taille (cm)")).toBeInTheDocument();
    expect(screen.getByLabelText("Niveau d'activité")).toBeInTheDocument();
    expect(screen.getByLabelText("Sport")).toBeInTheDocument();
    expect(screen.getByLabelText("Durée (minutes)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
  });

  it("propose les 5 paliers d'activité et démarre sur Léger", () => {
    render(<EnergyCalculator />);

    const slider = screen.getByLabelText("Niveau d'activité");
    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "4");
    expect(slider).toHaveValue("1");
    expect(screen.getAllByTestId("activity-level")).toHaveLength(5);
    expect(screen.getByTestId("activity-label")).toHaveTextContent("Léger");
  });

  it("affiche BMR, TDEE, kcal de l'effort et pourcentage pour un profil valide", async () => {
    render(<EnergyCalculator />);
    await fillValidProfile();

    expect(screen.getByTestId("bmr")).toHaveTextContent("1649");
    expect(screen.getByTestId("tdee")).toHaveTextContent("2267");
    expect(screen.getByTestId("effort-kcal")).toHaveTextContent("291");
    expect(screen.getByTestId("effort-share")).toHaveTextContent("13");
  });

  it("affiche la mention d'estimation indicative non médicale", () => {
    render(<EnergyCalculator />);

    expect(screen.getByText(/estimation indicative, non médicale/i)).toBeInTheDocument();
  });

  it("change le TDEE quand on déplace le slider", async () => {
    render(<EnergyCalculator />);
    await fillValidProfile();

    const slider = screen.getByLabelText("Niveau d'activité");
    fireEvent.change(slider, { target: { value: "0" } });
    expect(screen.getByTestId("activity-label")).toHaveTextContent("Sédentaire");
    const sedentaryTdee = screen.getByTestId("tdee").textContent;

    fireEvent.change(slider, { target: { value: "4" } });
    expect(screen.getByTestId("activity-label")).toHaveTextContent("Très actif");
    const veryActiveTdee = screen.getByTestId("tdee").textContent;

    expect(sedentaryTdee).not.toBe(veryActiveTdee);
    expect(screen.getByTestId("tdee")).toHaveTextContent("3133");
  });

  it("met à jour les kcal de l'effort quand on change de sport ou de durée", async () => {
    render(<EnergyCalculator />);
    const u = await fillValidProfile();

    expect(screen.getByTestId("effort-kcal")).toHaveTextContent("291");

    await u.selectOptions(screen.getByLabelText("Sport"), "ski-fond");
    expect(screen.getByTestId("effort-kcal")).toHaveTextContent("315");

    const duration = screen.getByLabelText("Durée (minutes)");
    await u.clear(duration);
    await u.type(duration, "60");
    expect(screen.getByTestId("effort-kcal")).toHaveTextContent("630");
  });

  it("affiche une erreur par champ vide et aucun résultat", async () => {
    render(<EnergyCalculator />);

    await user().click(screen.getByRole("button", { name: "Calculer" }));

    expect(screen.getByText("Choisis un sexe.")).toBeInTheDocument();
    expect(screen.getByText("L'âge est obligatoire.")).toBeInTheDocument();
    expect(screen.getByText("Le poids est obligatoire.")).toBeInTheDocument();
    expect(screen.getByText("La taille est obligatoire.")).toBeInTheDocument();
    expect(screen.getByText("Choisis un sport.")).toBeInTheDocument();
    expect(screen.getByText("La durée est obligatoire.")).toBeInTheDocument();
    expect(screen.queryByTestId("results")).not.toBeInTheDocument();
  });

  it("affiche une erreur et aucun résultat pour des valeurs hors bornes", async () => {
    render(<EnergyCalculator />);
    const u = await fillValidProfile();

    expect(screen.getByTestId("results")).toBeInTheDocument();

    const age = screen.getByLabelText("Âge (ans)");
    await u.clear(age);
    await u.type(age, "9");
    expect(screen.getByText(/L'âge doit être entre 10 et 100 ans/)).toBeInTheDocument();
    expect(screen.queryByTestId("results")).not.toBeInTheDocument();

    await u.clear(age);
    await u.type(age, "30");
    expect(screen.getByTestId("results")).toBeInTheDocument();

    const weight = screen.getByLabelText("Poids (kg)");
    await u.clear(weight);
    await u.type(weight, "29");
    expect(screen.getByText(/Le poids doit être entre 30 et 300 kg/)).toBeInTheDocument();
    expect(screen.queryByTestId("results")).not.toBeInTheDocument();

    await u.clear(weight);
    await u.type(weight, "0");
    expect(screen.queryByTestId("results")).not.toBeInTheDocument();

    const height = screen.getByLabelText("Taille (cm)");
    await u.clear(height);
    await u.type(height, "251");
    expect(screen.getByText(/La taille doit être entre 100 et 250 cm/)).toBeInTheDocument();
    expect(screen.queryByTestId("results")).not.toBeInTheDocument();

    const duration = screen.getByLabelText("Durée (minutes)");
    await u.clear(duration);
    await u.type(duration, "0");
    expect(screen.getByText(/La durée doit être entre 1 et 1440 minutes/)).toBeInTheDocument();
    expect(screen.queryByTestId("results")).not.toBeInTheDocument();
  });

  it("Reset vide les champs, efface les résultats et replace le focus sur le premier champ", async () => {
    render(<EnergyCalculator />);
    const u = await fillValidProfile();
    expect(screen.getByTestId("results")).toBeInTheDocument();

    await u.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.getByLabelText("Homme")).not.toBeChecked();
    expect(screen.getByLabelText("Femme")).not.toBeChecked();
    expect(screen.getByLabelText("Âge (ans)")).toHaveValue(null);
    expect(screen.getByLabelText("Poids (kg)")).toHaveValue(null);
    expect(screen.getByLabelText("Taille (cm)")).toHaveValue(null);
    expect(screen.getByLabelText("Durée (minutes)")).toHaveValue(null);
    expect(screen.getByLabelText("Sport")).toHaveValue("");
    expect(screen.getByLabelText("Niveau d'activité")).toHaveValue("1");
    expect(screen.getByTestId("activity-label")).toHaveTextContent("Léger");
    expect(screen.queryByTestId("results")).not.toBeInTheDocument();
    expect(screen.queryByText("Choisis un sexe.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Homme")).toHaveFocus();
  });

  it("préremplit la durée et notifie chaque saisie puis le Reset", async () => {
    const onMinutesChange = vi.fn();
    render(<EnergyCalculator initialMinutes="45" onMinutesChange={onMinutesChange} />);
    const u = user();

    expect(screen.getByLabelText("Durée (minutes)")).toHaveValue(45);

    const duration = screen.getByLabelText("Durée (minutes)");
    await u.clear(duration);
    await u.type(duration, "60");
    expect(onMinutesChange).toHaveBeenLastCalledWith("60");

    await u.click(screen.getByRole("button", { name: "Reset" }));
    expect(onMinutesChange).toHaveBeenLastCalledWith("");
  });
});
