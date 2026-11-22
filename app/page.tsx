import { Suspense } from "react";

import HomeContent from "@/components/HomeContent";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-8">
      <header className="space-y-1">
        <div className="w-full flex justify-center items-center mb-12 mt-12">
          <img className="w-[50%]" src="/title_logo.png" alt="titleLogo" />
        </div>

        <h1 className="sr-only">Accueil</h1>
        <p className="text-sm text-muted">
          Métabolisme de base, dépense du jour et coût énergétique et gestion de
          l&apos;alimentation pendant l&apos;effort.
        </p>
      </header>
      <Suspense>
        <HomeContent />
      </Suspense>
    </main>
  );
}
