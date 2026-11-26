import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { NumberField, TextField } from "@/components/forms/fields";

type Values = {
  name: string;
  kcal: string;
};

/** Les deux champs partagent une même erreur injectée, une par champ. */
function Fields({ error }: { error?: string }) {
  const { register } = useForm<Values>({
    defaultValues: { name: "", kcal: "" },
  });

  return (
    <>
      <TextField
        id="nom"
        label="Nom"
        registration={register("name")}
        error={error}
      />
      <NumberField
        id="kcal"
        label="Énergie"
        min={0}
        max={10}
        step={1}
        registration={register("kcal")}
        error={error}
      />
    </>
  );
}

describe("TextField et NumberField", () => {
  it("relient l'erreur au champ et l'annoncent (exemple 5)", () => {
    render(<Fields error="Champ obligatoire." />);

    for (const [label, id] of [
      ["Nom", "nom"],
      ["Énergie", "kcal"],
    ] as const) {
      const input = screen.getByLabelText(label);
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAttribute("aria-describedby", `${id}-erreur`);

      const message = document.getElementById(`${id}-erreur`);
      expect(message).toHaveAttribute("role", "alert");
      expect(message).toHaveTextContent("Champ obligatoire.");
    }
  });

  it("n'annoncent rien sans erreur (exemple 5)", () => {
    render(<Fields />);

    const input = screen.getByLabelText("Nom");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
