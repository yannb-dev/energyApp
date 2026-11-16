"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Bouton « ? » : cible tactile de 44 px, pastille visuelle de 24 px. */
const TRIGGER =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 focus-visible:ring-offset-surface";
const BADGE =
  "flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface-2 text-xs font-semibold text-accent";
/** Voile : le fond de l'application reste visible mais flou. */
const BACKDROP = "absolute inset-0 bg-canvas/80 backdrop-blur-sm";
/** Panneau : centré dans la vue, jamais plus haut ou plus large que l'écran. */
const PANEL =
  "relative z-10 max-h-[calc(100dvh_-_4rem)] w-full max-w-sm overflow-y-auto rounded-2xl border border-line bg-surface p-4 shadow-lg shadow-canvas/60 motion-safe:animate-rise";
const CLOSE =
  "-mt-2 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base text-muted outline-none transition-colors duration-200 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent-strong";

/** Panneau ouvert, s'il y en a un : un seul à la fois. */
let closeActivePanel: (() => void) | null = null;

export type InfoTooltipProps = {
  /** Identifiant unique : attributs ARIA du bouton et identifiant du panneau. */
  id: string;
  /** Nom accessible du bouton, ex. « Aide : métabolisme de base ». */
  label: string;
  /** Titre affiché en haut du panneau. */
  title: string;
  /** Contenu du panneau : texte venu de `lib/helpTexts.ts`. */
  children: ReactNode;
};

export default function InfoTooltip({ id, label, title, children }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Déclare ce panneau comme celui qui remplace tout autre panneau ouvert.
  useEffect(() => {
    if (!open) {
      return;
    }
    const unregister = () => setOpen(false);
    closeActivePanel = unregister;
    return () => {
      if (closeActivePanel === unregister) {
        closeActivePanel = null;
      }
    };
  }, [open]);

  // Échap et clic hors du panneau ferment ; le focus revient sur le bouton « ? ».
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePanel();
      }
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node | null;
      if (target === null) {
        return;
      }
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      closePanel();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [open]);

  /** Fermeture demandée par l'utilisateur : le focus revient sur le bouton. */
  function closePanel() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerClick() {
    if (open) {
      closePanel();
      return;
    }
    // Ouvrir une info-bulle ferme celle qui est ouverte.
    closeActivePanel?.();
    setOpen(true);
  }

  return (
    <div className="inline-flex shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        className={TRIGGER}
      >
        <span aria-hidden="true" className={BADGE}>
          ?
        </span>
      </button>

      {/* Portail : les cartes animées (`transform`) ne peuvent pas contenir un `fixed`. */}
      {open
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div aria-hidden="true" className={BACKDROP} />
              <div
                ref={panelRef}
                id={id}
                role="dialog"
                aria-labelledby={`${id}-titre`}
                className={PANEL}
              >
                <div className="flex items-start justify-between gap-2">
                  <p id={`${id}-titre`} className="pt-1 text-sm font-semibold text-ink">
                    {title}
                  </p>
                  <button
                    type="button"
                    onClick={closePanel}
                    aria-label="Fermer l'aide"
                    className={CLOSE}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted">{children}</p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
