"use client";

import { useActionState, useRef, useEffect } from "react";
import { addLedgerEntry, type FormState } from "../actions";

const initialState: FormState = {};

export default function LedgerForm({ allyId }: { allyId: string }) {
  const [state, formAction, pending] = useActionState(addLedgerEntry, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="allyId" value={allyId} />
      <select
        name="type"
        required
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
        defaultValue="PAYMENT"
      >
        <option value="PAYMENT">Pago recibido (abona)</option>
        <option value="ADJUSTMENT">Ajuste (carga deuda)</option>
      </select>
      <input
        name="amount"
        type="number"
        min="0"
        step="1000"
        placeholder="Monto"
        required
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <input
        name="description"
        placeholder="Descripción (opcional)"
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-wears-gold px-4 py-1.5 text-sm font-medium text-wears-gold hover:bg-wears-gold hover:text-wears-black disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Registrar movimiento"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
