"use client";

import { useActionState } from "react";
import { updateCashierCommission, type FormState } from "../actions";

const initialState: FormState = {};

export default function CommissionForm({
  cashierId,
  commissionPerSale,
}: {
  cashierId: string;
  commissionPerSale: number;
}) {
  const [state, formAction, pending] = useActionState(
    updateCashierCommission.bind(null, cashierId),
    initialState
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-wears-espresso/70">
        Monto fijo por venta marcada con comisión
        <input
          name="commissionPerSale"
          type="number"
          min="0"
          step="0.5"
          defaultValue={commissionPerSale}
          required
          className="w-28 rounded-lg border border-wears-tan/30 px-3 py-1.5 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-wears-gold px-4 py-1.5 text-sm font-medium text-wears-black hover:bg-wears-tan disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar"}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">{state.success}</p>}
    </form>
  );
}
