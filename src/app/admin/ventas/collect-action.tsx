"use client";

import { useState, useActionState } from "react";
import { markSaleCollected, revertSaleCollected, type FormState } from "./actions";

const initialState: FormState = {};

export default function CollectAction({
  saleId,
  allyName,
  collected,
}: {
  saleId: string;
  allyName: string;
  collected: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    markSaleCollected.bind(null, saleId),
    initialState
  );

  const [handledSuccess, setHandledSuccess] = useState(state.success);
  if (state.success !== handledSuccess) {
    setHandledSuccess(state.success);
    if (state.success) setOpen(false);
  }

  if (collected) {
    return (
      <form action={revertSaleCollected.bind(null, saleId)}>
        <button
          type="submit"
          title="Marcar como por cobrar de nuevo"
          className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 hover:bg-emerald-200"
        >
          Cobrado
        </button>
      </form>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-200"
      >
        Por cobrar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg">
            <h3 className="font-semibold text-wears-black">Confirmar cobro</h3>
            <p className="mt-1 text-sm text-wears-espresso/70">
              Vas a marcar como cobrado el pago de <strong>{allyName}</strong>. Carga el
              comprobante de pago para dejar constancia.
            </p>
            <form action={formAction} className="mt-4 flex flex-col gap-3">
              <input
                type="file"
                name="comprobante"
                accept="image/*,application/pdf"
                required
                className="text-sm text-wears-espresso/70 file:mr-2 file:rounded-full file:border-0 file:bg-wears-gold/20 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-wears-espresso"
              />
              {state.error && <p className="text-sm text-red-600">{state.error}</p>}
              <div className="mt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-wears-tan/30 px-4 py-1.5 text-sm text-wears-espresso hover:border-wears-gold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-full bg-wears-gold px-4 py-1.5 text-sm font-medium text-wears-black hover:bg-wears-tan disabled:opacity-60"
                >
                  {pending ? "Guardando..." : "Confirmar cobro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
