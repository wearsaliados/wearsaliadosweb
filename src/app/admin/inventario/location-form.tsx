"use client";

import { useActionState, useRef, useEffect } from "react";
import { createLocation, type FormState } from "./actions";

const initialState: FormState = {};

export default function LocationForm() {
  const [state, formAction, pending] = useActionState(createLocation, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <input
        name="name"
        placeholder="Nombre del punto"
        required
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <select
        name="type"
        required
        defaultValue="STORE"
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      >
        <option value="STORE">Punto físico</option>
        <option value="FACTORY">Fábrica</option>
        <option value="WEB">Tienda en línea</option>
      </select>
      <input
        name="address"
        placeholder="Dirección (opcional)"
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-wears-gold px-4 py-1.5 text-sm font-medium text-wears-gold hover:bg-wears-gold hover:text-wears-black disabled:opacity-60"
      >
        {pending ? "Creando..." : "Agregar ubicación"}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
