"use client";

import { useState, useActionState } from "react";
import { reverseSaleMovement, type FormState } from "./actions";

const initialState: FormState = {};

export default function ReverseMovementAction({
  movementId,
  productName,
}: {
  movementId: string;
  productName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    reverseSaleMovement.bind(null, movementId),
    initialState
  );

  const [handledSuccess, setHandledSuccess] = useState(state.success);
  if (state.success !== handledSuccess) {
    setHandledSuccess(state.success);
    if (state.success) setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-red-600 hover:underline"
      >
        Reversar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg">
            <h3 className="font-semibold text-wears-black">Reversar venta</h3>
            <p className="mt-1 text-sm text-wears-espresso/70">
              Devuelve la unidad de <strong>{productName}</strong> al inventario. Elige el
              motivo.
            </p>
            <form action={formAction} className="mt-4 flex flex-col gap-3">
              <select
                name="reason"
                required
                defaultValue=""
                className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  Motivo
                </option>
                <option value="CAMBIO">Cambio de talla</option>
                <option value="DISGUSTO">Disgusto del cliente</option>
                <option value="ERROR_FABRICACION">Error de fabricación</option>
              </select>
              <input
                name="note"
                placeholder="Detalle (opcional)"
                className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
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
                  {pending ? "Guardando..." : "Confirmar reversa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
