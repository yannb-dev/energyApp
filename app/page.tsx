import { Suspense } from "react";

import HomeContent from "@/components/HomeContent";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Gestion alimentaire sportive
        </h1>
        <p className="text-sm text-muted">
          Métabolisme de base, dépense du jour et coût énergétique et gestion de
          l'alimentation pendant l'effort.
        </p>
      </header>
      <Suspense>
        <HomeContent />
      </Suspense>
    </main>
  );
}
