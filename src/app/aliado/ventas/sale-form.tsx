"use client";

import { useActionState, useRef, useEffect } from "react";
import { registerSale, type FormState } from "./actions";

const initialState: FormState = {};

export default function SaleForm({
  items,
}: {
  items: { productId: string; name: string; quantity: number; price: number }[];
}) {
  const [state, formAction, pending] = useActionState(registerSale, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  const sellable = items.filter((i) => i.quantity > 0);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <select
        name="productId"
        required
        defaultValue=""
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      >
        <option value="" disabled>
          Producto vendido
        </option>
        {sellable.map((i) => (
          <option key={i.productId} value={i.productId}>
            {i.name} ({i.quantity} disponibles)
          </option>
        ))}
      </select>
      <input
        name="quantity"
        type="number"
        min="1"
        placeholder="Cantidad vendida"
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
        disabled={pending || sellable.length === 0}
        className="rounded-full bg-wears-gold px-4 py-2 text-sm font-medium text-wears-black hover:bg-wears-tan disabled:opacity-60"
      >
        {pending ? "Registrando..." : "Registrar venta"}
      </button>

      {state.error && (
        <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-4">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-emerald-600 sm:col-span-2 lg:col-span-4">
          {state.success}
        </p>
      )}
      {sellable.length === 0 && (
        <p className="text-sm text-wears-espresso/50 sm:col-span-2 lg:col-span-4">
          No tienes unidades disponibles para vender en este momento.
        </p>
      )}
    </form>
  );
}
