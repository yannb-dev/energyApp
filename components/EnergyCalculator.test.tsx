import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import EnergyCalculator from "@/components/EnergyCalculator";

const user = () => userEvent.setup();

/** Profil seul, sans le sport ni l'effort. */
async function fillProfile(u: ReturnType<typeof userEvent.setup>) {
  await u.click(screen.getByLabelText("Homme"));
  await u.type(screen.getByLabelText("Âge (ans)"), "30");
  await u.type(screen.getByLabelText("Poids (kg)"), "70");
  await u.type(screen.getByLabelText("Taille (cm)"), "175");
}

/** Profil complet : course à pied, 10 km à 5:00 min/km, soit 50 min. */
async function fillValidProfile() {
  const u = user();
  await fillProfile(u);
  await u.selectOptions(screen.getByLabelText("Sport"), "course-modere");
  await u.type(screen.getByLabelText("Distance (km)"), "10");
  await u.type(screen.getByLabelText("Allure (min/km)"), "5:00");
  return u;
}

const kmhRadio = () => screen.getByRole("radio", { name: "km/h" });
const minkmRadio = () => screen.getByRole("radio", { name: "min/km" });

describe("EnergyCalculator", () => {
  it("expose chaque champ avec un label", () => {
    render(<EnergyCalculator />);

    expect(screen.getByLabelText("Homme")).toBeInTheDocument();
    expect(screen.getByLabelText("Femme")).toBeInTheDocument();
    expect(screen.getByLabelText("Âge (ans)")).toBeInTheDocument();
    expect(screen.getByLabelText("Poids (kg)")).toBeInTheDocument();
    expect(screen.getByLabelText("Taille (cm)")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Niveau d'activité physique"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Sport")).toBeInTheDocument();
    expect(screen.getByLabelText("Distance (km)")).toBeInTheDocument();
    expect(screen.getByLabelText("Vitesse (km/h)")).toBeInTheDocument();
    expect(kmhRadio()).toBeChecked();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
  });

  it("propose les 5 paliers d'activité et démarre sur Léger", () => {
    render(<EnergyCalculator />);

    const slider = screen.getByLabelText("Niveau d'activité physique");
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
    expect(screen.getByTestId("effort-kcal")).toHaveTextContent("484");
    expect(screen.getByTestId("effort-share")).toHaveTextContent("21");
  });

  it("affiche la mention d'estimation indicative non médicale", () => {
    render(<EnergyCalculator />);

    expect(
      screen.getByText(/estimation indicative, non médicale/i),
    ).toBeInTheDocument();
  });

  it("change le TDEE quand on déplace le slider", async () => {
    render(<EnergyCalculator />);
    await fillValidProfile();

    const slider = screen.getByLabelText("Niveau d'activité physique");
    fireEvent.change(slider, { target: { value: "0" } });
    expect(screen.getByTestId("activity-label")).toHaveTextContent(
      "Sédentaire",
    );
    const sedentaryTdee = screen.getByTestId("tdee").textContent;

    fireEvent.change(slider, { target: { value: "4" } });
    expect(screen.getByTestId("activity-label")).toHaveTextContent(
      "Très actif",
    );
    const veryActiveTdee = screen.getByTestId("tdee").textContent;

    expect(sedentaryTdee).not.toBe(veryActiveTdee);
    expect(screen.getByTestId("tdee")).toHaveTextContent("3133");
  });

  it("met à jour les kcal de l'effort quand on change de sport ou de distance", async () => {
    render(<EnergyCalculator />);
    const u = await fillValidProfile();

    expect(screen.getByTestId("effort-kcal")).toHaveTextContent("484");

    await u.selectOptions(screen.getByLabelText("Sport"), "Trail (modéré)");
    expect(screen.getByTestId("effort-kcal")).toHaveTextContent("525");

    const distance = screen.getByLabelText("Distance (km)");
    await u.clear(distance);
    await u.type(distance, "20");
    expect(screen.getByTestId("effort-kcal")).toHaveTextContent("1050");
  });

  it("affiche une erreur par champ vide et aucun résultat", async () => {
    render(<EnergyCalculator />);

    await user().click(screen.getByRole("button", { name: "Calculer" }));

    expect(screen.getByText("Choisis un sexe.")).toBeInTheDocument();
    expect(screen.getByText("L'âge est obligatoire.")).toBeInTheDocument();
    expect(screen.getByText("Le poids est obligatoire.")).toBeInTheDocument();
    expect(screen.getByText("La taille est obligatoire.")).toBeInTheDocument();
    expect(screen.getByText("Choisis un sport.")).toBeInTheDocument();
    expect(screen.getByText("La distance est obligatoire.")).toBeInTheDocument();
    expect(screen.getByText("La vitesse est obligatoire.")).toBeInTheDocument();
    expect(screen.queryByTestId("results")).not.toBeInTheDocument();
  });

  it("affiche une erreur et aucun résultat pour des valeurs hors bornes", async () => {
    render(<EnergyCalculator />);
    const u = await fillValidProfile();

    expect(screen.getByTestId("results")).toBeInTheDocument();

    const age = screen.getByLabelText("Âge (ans)");
    await u.clear(age);
    await u.type(age, "9");
    expect(
      screen.getByText(/L'âge doit être entre 10 et 100 ans/),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("results")).not.toBeInTheDocument();

    await u.clear(age);
    await u.type(age, "30");
    expect(screen.getByTestId("results")).toBeInTheDocument();

    const weight = screen.getByLabelText("Poids (kg)");
    await u.clear(weight);
    await u.type(weight, "29");
    expect(
      screen.getByText(/Le poids doit être entre 30 et 300 kg/),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("results")).not.toBeInTheDocument();

    await u.clear(weight);
    await u.type(weight, "0");
    expect(screen.queryByTestId("results")).not.toBeInTheDocument();

    const height = screen.getByLabelText("Taille (cm)");
    await u.clear(height);
    await u.type(height, "251");
    expect(
      screen.getByText(/La taille doit être entre 100 et 250 cm/),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("results")).not.toBeInTheDocument();
  });

  it("affiche les erreurs de distance, de format et de durée calculée", async () => {
    render(<EnergyCalculator />);
    const u = await fillValidProfile();

    const distance = screen.getByLabelText("Distance (km)");
    await u.clear(distance);
    await u.type(distance, "0");
    expect(
      screen.getByText("La distance doit être entre 0,1 et 1000 km."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("results")).not.toBeInTheDocument();

    await u.clear(distance);
    await u.type(distance, "10");
    expect(screen.getByTestId("results")).toBeInTheDocument();

    const pace = screen.getByLabelText("Allure (min/km)");
    await u.clear(pace);
    await u.type(pace, "abc");
    expect(
      screen.getByText("L'allure doit être au format mm:ss (ex. 5:30)."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("results")).not.toBeInTheDocument();

    await u.clear(pace);
    await u.type(pace, "0:00");
    expect(
      screen.getByText("L'allure doit être entre 0:36 et 60:00 min/km."),
    ).toBeInTheDocument();

    await u.clear(pace);
    await u.type(pace, "5:00");
    await u.clear(distance);
    await u.type(distance, "1000");
    expect(
      screen.getByText("La durée calculée doit être entre 1 minute et 24 h."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("results")).not.toBeInTheDocument();
  });

  it("signale l'erreur de distance et d'erreur-vitesse avec les bons ids", async () => {
    render(<EnergyCalculator />);
    const u = await fillValidProfile();

    const pace = screen.getByLabelText("Allure (min/km)");
    await u.clear(pace);
    await u.type(pace, "abc");

    expect(pace).toHaveAttribute("aria-invalid", "true");
    expect(pace).toHaveAttribute("aria-describedby", "erreur-vitesse");
    expect(document.getElementById("erreur-vitesse")).toHaveAttribute(
      "role",
      "alert",
    );

    const distance = screen.getByLabelText("Distance (km)");
    await u.clear(distance);
    await u.type(distance, "0");
    expect(distance).toHaveAttribute("aria-describedby", "erreur-distance");
    expect(document.getElementById("erreur-distance")).toHaveAttribute(
      "role",
      "alert",
    );
  });

  it("choisit l'unité selon le sport quand la vitesse est vide (exemple 13)", async () => {
    render(<EnergyCalculator />);
    const u = user();

    await u.selectOptions(screen.getByLabelText("Sport"), "course-modere");
    expect(minkmRadio()).toBeChecked();
    expect(screen.getByLabelText("Allure (min/km)")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Vitesse (km/h)"),
    ).not.toBeInTheDocument();

    await u.selectOptions(
      screen.getByLabelText("Sport"),
      "velo-route-vtt-modere",
    );
    expect(kmhRadio()).toBeChecked();
    expect(screen.getByLabelText("Vitesse (km/h)")).toBeInTheDocument();
  });

  it("conserve l'unité et la valeur saisies quand le sport change (exemple 14)", async () => {
    render(<EnergyCalculator />);
    const u = user();

    await u.selectOptions(
      screen.getByLabelText("Sport"),
      "velo-route-vtt-modere",
    );
    await u.type(screen.getByLabelText("Vitesse (km/h)"), "25");

    await u.selectOptions(screen.getByLabelText("Sport"), "course-modere");

    expect(kmhRadio()).toBeChecked();
    expect(screen.getByLabelText("Vitesse (km/h)")).toHaveValue("25");
    expect(
      screen.queryByLabelText("Allure (min/km)"),
    ).not.toBeInTheDocument();
  });

  it("convertit la valeur saisie lors d'une bascule d'unité (exemple 15)", async () => {
    render(<EnergyCalculator />);
    const u = user();

    await fillProfile(u);
    await u.selectOptions(
      screen.getByLabelText("Sport"),
      "velo-route-vtt-modere",
    );
    await u.type(screen.getByLabelText("Distance (km)"), "10");
    await u.type(screen.getByLabelText("Vitesse (km/h)"), "12");

    expect(screen.getByTestId("effort-duration")).toHaveTextContent(
      "Durée de l'effort : 50 min · soit 5:00 min/km",
    );

    await u.click(minkmRadio());

    expect(screen.getByLabelText("Allure (min/km)")).toHaveValue("5:00");
    expect(screen.getByTestId("effort-duration")).toHaveTextContent(
      "Durée de l'effort : 50 min · soit 12 km/h",
    );
    expect(screen.getByTestId("effort-kcal")).toHaveTextContent("467");
  });

  it("affiche la ligne de durée seulement quand elle est calculable (exemple 16)", async () => {
    const onMinutesChange = vi.fn();
    render(<EnergyCalculator onMinutesChange={onMinutesChange} />);
    const u = user();

    expect(screen.queryByTestId("effort-duration")).not.toBeInTheDocument();

    await u.type(screen.getByLabelText("Distance (km)"), "10");
    await u.type(screen.getByLabelText("Vitesse (km/h)"), "12");

    const status = screen.getByTestId("effort-duration");
    expect(status).toHaveTextContent("50 min");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(onMinutesChange).toHaveBeenLastCalledWith("50");

    await u.clear(screen.getByLabelText("Distance (km)"));

    expect(screen.queryByTestId("effort-duration")).not.toBeInTheDocument();
    expect(onMinutesChange).toHaveBeenLastCalledWith("");
  });

  it("Reset vide les champs, l'effort, la ligne de durée et notifie la page (exemple 17)", async () => {
    const onMinutesChange = vi.fn();
    render(<EnergyCalculator onMinutesChange={onMinutesChange} />);
    const u = await fillValidProfile();
    expect(screen.getByTestId("results")).toBeInTheDocument();
    expect(screen.getByTestId("effort-duration")).toBeInTheDocument();

    await u.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.getByLabelText("Homme")).not.toBeChecked();
    expect(screen.getByLabelText("Femme")).not.toBeChecked();
    expect(screen.getByLabelText("Âge (ans)")).toHaveValue(null);
    expect(screen.getByLabelText("Poids (kg)")).toHaveValue(null);
    expect(screen.getByLabelText("Taille (cm)")).toHaveValue(null);
    expect(screen.getByLabelText("Distance (km)")).toHaveValue("");
    expect(screen.getByLabelText("Vitesse (km/h)")).toHaveValue("");
    expect(kmhRadio()).toBeChecked();
    expect(screen.getByLabelText("Sport")).toHaveValue("");
    expect(screen.getByLabelText("Niveau d'activité physique")).toHaveValue(
      "1",
    );
    expect(screen.getByTestId("activity-label")).toHaveTextContent("Léger");
    expect(screen.queryByTestId("results")).not.toBeInTheDocument();
    expect(screen.queryByTestId("effort-duration")).not.toBeInTheDocument();
    expect(screen.queryByText("Choisis un sexe.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Homme")).toHaveFocus();
    expect(onMinutesChange).toHaveBeenLastCalledWith("");
  });

  it("propose une aide « ? » sur le métabolisme de base et la dépense journalière", async () => {
    render(<EnergyCalculator />);
    const u = await fillValidProfile();

    const bmr = screen.getByRole("button", { name: "Aide : métabolisme de base" });
    const tdee = screen.getByRole("button", { name: "Aide : dépense journalière" });

    expect(bmr).toHaveAttribute("aria-expanded", "false");
    expect(tdee).toHaveAttribute("aria-expanded", "false");
    expect(bmr).toHaveAttribute("aria-controls", "help-bmr");
    expect(tdee).toHaveAttribute("aria-controls", "help-tdee");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await u.click(bmr);

    expect(bmr).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "Métabolisme de base" })).toHaveTextContent(
      "Mifflin-St Jeor",
    );

    await u.click(tdee);

    expect(tdee).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("dialog", { name: "Métabolisme de base" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Dépense journalière" })).toHaveTextContent(
      "Sédentaire",
    );
  });

  it("préremplit l'effort et notifie chaque changement puis le Reset", async () => {
    const onMinutesChange = vi.fn();
    render(
      <EnergyCalculator
        initialEffort={{ distanceKm: "10", speed: "12", speedUnit: "kmh" }}
        onMinutesChange={onMinutesChange}
      />,
    );
    const u = user();

    expect(screen.getByLabelText("Distance (km)")).toHaveValue("10");
    expect(screen.getByLabelText("Vitesse (km/h)")).toHaveValue("12");
    expect(screen.getByTestId("effort-duration")).toHaveTextContent("50 min");
    expect(onMinutesChange).toHaveBeenLastCalledWith("50");

    await u.clear(screen.getByLabelText("Distance (km)"));
    await u.type(screen.getByLabelText("Distance (km)"), "20");
    expect(onMinutesChange).toHaveBeenLastCalledWith("100");

    await u.click(screen.getByRole("button", { name: "Reset" }));
    expect(onMinutesChange).toHaveBeenLastCalledWith("");
  });
});
