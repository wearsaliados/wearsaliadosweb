"use client";

import { useActionState } from "react";
import { markCommissionPaid, type FormState } from "../actions";

const initialState: FormState = {};

export default function MarkPaidForm({
  cashierId,
  month,
  amount,
}: {
  cashierId: string;
  month: string;
  amount: number;
}) {
  const [state, formAction, pending] = useActionState(
    markCommissionPaid.bind(null, cashierId),
    initialState
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="month" value={month} />
      <input
        name="amount"
        type="number"
        min="0"
        step="0.5"
        defaultValue={amount}
        required
        className="w-24 rounded-lg border border-wears-tan/30 px-2 py-1 text-xs"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs text-amber-700 hover:bg-amber-100 disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Marcar pagada"}
      </button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
