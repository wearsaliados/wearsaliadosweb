"use client";

import { useActionState, useRef, useEffect } from "react";
import { createCollection, type FormState } from "./actions";

const initialState: FormState = {};

export default function CollectionForm() {
  const [state, formAction, pending] = useActionState(createCollection, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <input
        name="name"
        placeholder="Nombre de la colección"
        required
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <input
        name="launchNote"
        placeholder="Nota de lanzamiento (opcional)"
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <input
        name="imageUrl"
        placeholder="URL de imagen (opcional)"
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <label className="flex items-center gap-2 text-sm text-wears-espresso/70">
        <input type="checkbox" name="upcoming" />
        Próxima colección (se anuncia a aliados)
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-wears-gold px-4 py-1.5 text-sm font-medium text-wears-gold hover:bg-wears-gold hover:text-wears-black disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Agregar colección"}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
