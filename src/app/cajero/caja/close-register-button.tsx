"use client";

import { useActionState } from "react";
import { closeCashRegister, type FormState } from "../actions";

const initialState: FormState = {};

export default function CloseRegisterButton({ pendingCount }: { pendingCount: number }) {
  const [state, formAction, pending] = useActionState(closeCashRegister, initialState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <button
        type="submit"
        disabled={pending || pendingCount === 0}
        className="rounded-full bg-wears-gold px-6 py-2.5 text-sm font-medium text-wears-black hover:bg-wears-tan disabled:opacity-50"
      >
        {pending ? "Cerrando caja..." : "Cerrar caja"}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      )}
    </form>
  );
}
