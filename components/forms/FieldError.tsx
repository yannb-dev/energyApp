import { ERROR_TEXT } from "@/components/forms/styles";

type FieldErrorProps = {
  /** Id référencé par `aria-describedby` du champ. */
  id: string;
  message?: string;
};

/** Message d'erreur d'un champ ; ne rend rien tant qu'il n'y a rien à dire. */
export function FieldError({ id, message }: FieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} role="alert" className={ERROR_TEXT}>
      {message}
    </p>
  );
}
