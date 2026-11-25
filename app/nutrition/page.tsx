import NutritionPlanView from "@/components/NutritionPlanView";

export default function NutritionPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Plan de nutrition
        </h1>
        <p className="text-sm text-muted">
          Unités solides, boisson et progression des apports pendant l&apos;effort.
        </p>
      </header>
      <NutritionPlanView />
    </main>
  );
}
