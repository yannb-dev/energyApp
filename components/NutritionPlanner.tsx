"use client";

/**
 * Page 1 — alimentation (SPEC-08.5) : Produits et Boisson.
 * Les formulaires viennent de `useNutritionForms` ; « Voir mes résultats » est
 * délégué à `HomeContent`, qui orchestre les trois validations.
 */

import { FormProvider } from "react-hook-form";

import InfoTooltip from "@/components/InfoTooltip";
import { BottleIcon, SolidIcon } from "@/components/NutritionIcons";
import { DrinkFields } from "@/components/forms/DrinkFields";
import { ProductFields } from "@/components/forms/ProductFields";
import { BLOCK_ACTION, BUTTON_PRIMARY, BUTTON_SECONDARY, CARD, CARD_TITLE, FIELD, FIELD_LABEL } from "@/components/forms/styles";
import type { NutritionForms } from "@/components/forms/useNutritionForms";
import { useActivity } from "@/components/providers/ActivityProvider";
import { STRATEGY_HELP } from "@/lib/helpTexts";
import { productLabel, MAX_SELECTED_MESSAGE, MAX_SELECTED_PRODUCTS } from "@/lib/products";
import { strategyText } from "@/lib/strategies";

const ROW_ACTION =
  "flex h-11 min-w-11 items-center justify-center rounded-xl border border-line px-3 text-sm font-semibold text-ink transition duration-200 hover:border-accent hover:text-accent-strong focus-visible:ring-2 focus-visible:ring-accent-strong disabled:cursor-not-allowed disabled:opacity-40";
const PILL = "rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs font-medium text-accent";
const DURATION_ERROR = "Renseigne la durée dans le bloc Activité.";

/** Affichage : nombre à la française, sans zéros inutiles (« 0,25 », « 75 »). */
function frenchNumber(value: number): string {
  return String(value).replace(".", ",");
}

/** Chevron haut ou bas des boutons de réordonnancement. */
function Chevron({ direction }: { direction: "up" | "down" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path d={direction === "up" ? "M5 12.5 10 7.5 15 12.5" : "M5 7.5 10 12.5 15 7.5"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type NutritionPlannerProps = {
  forms: NutritionForms;
  onShowResults: () => void;
};

export default function NutritionPlanner({
  forms,
  onShowResults,
}: NutritionPlannerProps) {
  const { minutes } = useActivity();
  const {
    settings,
    productForm,
    capsForm,
    drinkForm,
    formOpen,
    openDrink,
    strategies,
    strategy,
    labels,
    patchSettings,
    handleAddProduct,
    handleEditProduct,
    handleCancelProduct,
    handleSubmitProduct,
    handleDeleteProduct,
    handleToggleProduct,
    handleMoveProduct,
    handleStrategy,
    handleValidateDrink,
    handleEditDrink,
    handleReset,
  } = forms;

  const selectedCount = settings.selectedIds.length;

  return (
    <div className="flex flex-col gap-4">
      <section className={`motion-safe:animate-rise ${CARD}`} aria-labelledby="titre-produits">
        <h2 id="titre-produits" className={CARD_TITLE}>Produits</h2>

        {formOpen ? (
          <>
            <FormProvider {...productForm}>
              <ProductFields />
            </FormProvider>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={handleSubmitProduct} className={BLOCK_ACTION}>Valider le produit</button>
              {settings.products.length > 0 ? (
                <button type="button" onClick={handleCancelProduct} className={BUTTON_SECONDARY}>
                  Annuler
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <button type="button" onClick={handleAddProduct} className={BLOCK_ACTION}>Ajouter un produit</button>
        )}

        {settings.products.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {settings.products.map((product) => {
              const selectedIndex = settings.selectedIds.indexOf(product.id);
              const selected = selectedIndex !== -1;
              const atMax = settings.selectedIds.length >= MAX_SELECTED_PRODUCTS;
              return (
                <li key={product.id} className="rounded-xl border border-line bg-surface-2 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="checkbox" aria-label={`Sélectionner ${product.name}`} checked={selected} disabled={!selected && atMax} onChange={() => handleToggleProduct(product.id)} className="h-5 w-5 accent-accent" />
                    <SolidIcon className="w-[6%]" type={product.type} />
                    <span className="text-sm font-medium text-ink">{product.name}</span>
                    <span className={PILL}>{product.type}</span>
                    {selected ? <span className={PILL}>{productLabel(selectedIndex)}</span> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    Glucides {frenchNumber(product.carbs)} g · Sel {frenchNumber(product.salt)} g
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {selected ? (
                      <>
                        <button type="button" aria-label={`Monter ${productLabel(selectedIndex)}`} disabled={selectedIndex === 0} onClick={() => handleMoveProduct(product.id, "up")} className={ROW_ACTION}><Chevron direction="up" /></button>
                        <button type="button" aria-label={`Descendre ${productLabel(selectedIndex)}`} disabled={selectedIndex === settings.selectedIds.length - 1} onClick={() => handleMoveProduct(product.id, "down")} className={ROW_ACTION}><Chevron direction="down" /></button>
                      </>
                    ) : null}
                    <button type="button" aria-label={`Modifier ${product.name}`} onClick={() => handleEditProduct(product)} className={ROW_ACTION}>Modifier</button>
                    <button type="button" aria-label={`Supprimer ${product.name}`} onClick={() => handleDeleteProduct(product.id)} className={ROW_ACTION}>Supprimer</button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {selectedCount >= MAX_SELECTED_PRODUCTS ? <p className="mt-3 text-xs text-muted">{MAX_SELECTED_MESSAGE}</p> : null}

        {strategy ? (
          <div className="mt-4">
            <div className="flex items-start justify-between gap-2">
              <label htmlFor="nutrition-strategy" className={FIELD_LABEL}>Stratégie d&apos;alimentation</label>
              <InfoTooltip id="help-strategy" label="Aide : stratégie d'alimentation" title="Stratégie d'alimentation">{STRATEGY_HELP}</InfoTooltip>
            </div>
            <div className="relative">
              <select id="nutrition-strategy" value={strategy.key} onChange={(event) => handleStrategy(event.target.value)} className={`${FIELD} appearance-none pr-10`}>
                {strategies.map((entry) => (<option key={entry.key} value={entry.key}>{entry.label}</option>))}
              </select>
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="pointer-events-none absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 text-muted">
                <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="mt-1 text-xs text-muted">{strategyText(strategy, labels)}</p>
          </div>
        ) : null}
      </section>

      <section className={`motion-safe:animate-rise rise-delay-1 ${CARD}`} aria-labelledby="titre-boisson">
        <h2 id="titre-boisson" className={CARD_TITLE}>Boisson</h2>
        <FormProvider {...drinkForm}>
          <label htmlFor="nutrition-drink-enabled" className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-ink">
            <input id="nutrition-drink-enabled" type="checkbox" {...drinkForm.register("drinkEnabled", { onChange: (event) => patchSettings({ drinkEnabled: event.target.checked }) })} className="h-5 w-5 accent-accent" />
            Ajouter une boisson énergétique
          </label>

          {settings.drinkEnabled ? (
            openDrink ? (
              <>
                <DrinkFields patchSettings={patchSettings} />
                <button type="button" onClick={handleValidateDrink} className={`mt-4 ${BLOCK_ACTION}`}>Valider la boisson</button>
              </>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BottleIcon className="w-[5%]" />
                    <span data-testid="drink-summary-name" className="text-sm font-semibold text-ink">{settings.drinkName}</span>
                  </div>
                  <p data-testid="drink-summary-details" className="text-sm text-muted">
                    {`Glucides ${settings.drinkCarbsPer100.replace(".", ",")} g/100 g · Sel ${settings.drinkSaltPer100.replace(".", ",")} g/100 g · ${settings.drinkConcentration.replace(".", ",")} g/L`}
                  </p>
                </div>
                <button type="button" onClick={handleEditDrink} className={BLOCK_ACTION}>Modifier la boisson</button>
              </div>
            )
          ) : null}
        </FormProvider>
      </section>

      {/* Seul « Voir mes résultats » soumet les plafonds : son isSubmitted remplace l'ancien drapeau de tentative. */}
      {capsForm.formState.isSubmitted && minutes === null ? (
        <p role="alert" className="text-sm text-danger">{DURATION_ERROR}</p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onShowResults} className={BUTTON_PRIMARY}>Voir mes résultats</button>
        <button type="button" onClick={handleReset} className={BUTTON_SECONDARY}>Réinitialiser la nutrition</button>
      </div>

      <p className="text-xs text-muted">Enregistré dans ce navigateur.</p>
    </div>
  );
}
