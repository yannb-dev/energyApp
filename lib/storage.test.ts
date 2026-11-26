import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { hasItem, loadItem, removeItems, saveItem } from "@/lib/storage";

/** Schéma local : aucune dépendance de domaine. */
const schema = z.object({ a: z.string() });

const originalStorageDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "localStorage",
);

/** Rend l'accès à globalThis.localStorage impossible, comme un navigateur qui refuse. */
function denyStorageAccess() {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("stockage refusé");
    },
  });
}

function restoreStorageAccess() {
  if (originalStorageDescriptor) {
    Object.defineProperty(globalThis, "localStorage", originalStorageDescriptor);
    return;
  }
  delete (globalThis as { localStorage?: Storage }).localStorage;
}

describe("storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    restoreStorageAccess();
    window.localStorage.clear();
  });

  it("retourne null et false quand la clé est absente", () => {
    expect(loadItem("absente", schema)).toBeNull();
    expect(hasItem("absente")).toBe(false);
  });

  it("retourne null pour un JSON invalide", () => {
    window.localStorage.setItem("k", "{pas du json");

    expect(loadItem("k", schema)).toBeNull();
  });

  it("retourne null quand le schéma échoue et retire les clés inconnues", () => {
    window.localStorage.setItem("k", JSON.stringify({ a: 1 }));

    expect(loadItem("k", schema)).toBeNull();

    window.localStorage.setItem("k", JSON.stringify({ a: "x", b: 2 }));

    expect(loadItem("k", schema)).toEqual({ a: "x" });
  });

  it("renvoie la valeur transformée par le schéma", () => {
    const transformed = schema.transform((values) => values.a.length);
    window.localStorage.setItem("k", JSON.stringify({ a: "abcd" }));

    expect(loadItem("k", transformed)).toBe(4);
  });

  it("ne lève pas quand getItem lève", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("stockage indisponible");
    });

    expect(() => loadItem("k", schema)).not.toThrow();
    expect(loadItem("k", schema)).toBeNull();
    expect(hasItem("k")).toBe(false);
  });

  it("ne lève pas quand l'accès à localStorage lève", () => {
    denyStorageAccess();

    expect(() => loadItem("k", schema)).not.toThrow();
    expect(loadItem("k", schema)).toBeNull();
    expect(hasItem("k")).toBe(false);
  });

  it("fait un aller-retour et ne lève pas quand setItem lève", () => {
    saveItem("k", { a: "x" });

    expect(hasItem("k")).toBe(true);
    expect(loadItem("k", schema)).toEqual({ a: "x" });

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota dépassé");
    });

    expect(() => saveItem("k2", { a: "y" })).not.toThrow();
  });

  it("efface plusieurs clés et ne lève pas quand removeItem lève", () => {
    saveItem("k1", { a: "x" });
    saveItem("k2", { a: "y" });

    removeItems("k1", "k2");

    expect(hasItem("k1")).toBe(false);
    expect(hasItem("k2")).toBe(false);

    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("stockage indisponible");
    });

    expect(() => removeItems("k1", "k2")).not.toThrow();
  });
});
