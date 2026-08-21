"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { transferStock, type FormState } from "./actions";

const initialState: FormState = {};

export default function TransferForm({
  locations,
  allies,
  products,
}: {
  locations: { id: string; name: string }[];
  allies: { id: string; locationId: string; businessName: string }[];
  products: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(transferStock, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [destination, setDestination] = useState("");

  const [handledSuccess, setHandledSuccess] = useState(state.success);
  if (state.success !== handledSuccess) {
    setHandledSuccess(state.success);
    if (state.success) setDestination("");
  }

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  const isAllyDestination = allies.some((a) => a.locationId === destination);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select
          name="fromLocationId"
          required
          defaultValue=""
          className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Origen (de dónde sale)
          </option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        <select
          name="toLocationId"
          required
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Destino — motivo de la salida
          </option>
          <optgroup label="Canales Wears">
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                Entregado a {l.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Aliados comerciales">
            {allies.map((a) => (
              <option key={a.locationId} value={a.locationId}>
                Entregado a aliado: {a.businessName}
              </option>
            ))}
          </optgroup>
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
          placeholder="Cantidad"
          required
          className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
        />
      </div>

      {isAllyDestination && (
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-wears-gold/30 bg-wears-gold/5 p-3 sm:grid-cols-2">
          <select
            name="acquisitionType"
            defaultValue="CONSIGNMENT"
            className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
          >
            <option value="CONSIGNMENT">A consignación</option>
            <option value="PURCHASE">Comprada por el aliado</option>
          </select>
          <input
            name="unitCost"
            type="number"
            step="0.01"
            min={0}
            placeholder="Costo unitario (opcional, usa el costo del producto)"
            className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-wears-gold px-5 py-2 text-sm font-medium text-wears-black hover:bg-wears-tan disabled:opacity-60"
        >
          {pending ? "Transfiriendo..." : "Transferir stock"}
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      </div>
    </form>
  );
}
