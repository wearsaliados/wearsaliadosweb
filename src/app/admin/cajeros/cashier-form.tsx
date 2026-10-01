"use client";

import { useActionState, useRef, useEffect } from "react";
import { createCashier, type FormState } from "./actions";

const initialState: FormState = {};

export default function CashierForm() {
  const [state, formAction, pending] = useActionState(createCashier, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      <input
        name="name"
        placeholder="Nombre del cajero"
        required
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <input
        name="email"
        type="text"
        placeholder="Correo o usuario de acceso"
        required
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <input
        name="password"
        type="text"
        placeholder="Contraseña (opcional, si no la dejas se genera una temporal)"
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <input
        name="commissionPerSale"
        type="number"
        min="0"
        step="0.5"
        defaultValue="0"
        placeholder="Comisión fija por venta ($)"
        required
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <div className="sm:col-span-2 flex flex-col gap-2">
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-full bg-wears-gold px-5 py-2 text-sm font-medium text-wears-black hover:bg-wears-tan disabled:opacity-60"
        >
          {pending ? "Creando..." : "Crear cajero"}
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {state.success}
          </p>
        )}
      </div>
    </form>
  );
}
