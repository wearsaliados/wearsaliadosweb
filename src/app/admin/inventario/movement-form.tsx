"use client";

import { useActionState, useRef, useEffect } from "react";
import { adjustInventory, type FormState } from "./actions";

const initialState: FormState = {};

export default function MovementForm({
  locations,
  products,
}: {
  locations: { id: string; name: string }[];
  products: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(adjustInventory, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
    >
      <select
        name="locationId"
        required
        defaultValue=""
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      >
        <option value="" disabled>
          Ubicación
        </option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      <select
        name="productId"
        required
        defaultValue=""
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      >
        <option value="" disabled>
          Producto
        </option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <input
        name="quantity"
        type="number"
        min={1}
        placeholder="Cantidad recibida"
        required
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <input
        name="note"
        placeholder="Nota (opcional)"
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-wears-gold px-4 py-2 text-sm font-medium text-wears-black hover:bg-wears-tan disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Registrar entrada"}
      </button>
      {state.error && (
        <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-5">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-emerald-600 sm:col-span-2 lg:col-span-5">
          {state.success}
        </p>
      )}
    </form>
  );
}
