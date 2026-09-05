"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { registerGiveaway, type FormState } from "./actions";
import ModelSizeSelect, { type SizedProduct } from "@/components/model-size-select";

const initialState: FormState = {};

export default function GiveawayForm({
  locations,
  products,
}: {
  locations: { id: string; name: string }[];
  products: SizedProduct[];
}) {
  const [state, formAction, pending] = useActionState(registerGiveaway, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [formVersion, setFormVersion] = useState(0);

  const [handledSuccess, setHandledSuccess] = useState(state.success);
  if (state.success !== handledSuccess) {
    setHandledSuccess(state.success);
    if (state.success) setFormVersion((v) => v + 1);
  }

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7"
    >
      <select
        name="locationId"
        required
        defaultValue=""
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      >
        <option value="" disabled>
          Ubicación de origen
        </option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      <ModelSizeSelect
        key={formVersion}
        name="productId"
        products={products}
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <input
        name="quantity"
        type="number"
        min={1}
        placeholder="Cantidad"
        required
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <select
        name="reason"
        required
        defaultValue=""
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      >
        <option value="" disabled>
          Motivo
        </option>
        <option value="PUBLICIDAD">Inversión de publicidad</option>
        <option value="EMBAJADOR">Embajador de marca</option>
      </select>
      <input
        name="note"
        placeholder="Detalle (opcional)"
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-wears-gold px-4 py-2 text-sm font-medium text-wears-black hover:bg-wears-tan disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Registrar entrega"}
      </button>
      {state.error && (
        <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-7">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-emerald-600 sm:col-span-2 lg:col-span-7">{state.success}</p>
      )}
    </form>
  );
}
