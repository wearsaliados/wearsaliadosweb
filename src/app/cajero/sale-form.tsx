"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { registerCashierSale, type FormState } from "./actions";
import ModelSizeSelect, { type SizedProduct } from "@/components/model-size-select";

const initialState: FormState = {};

export default function SaleForm({
  locations,
  defaultLocationId,
  products,
}: {
  locations: { id: string; name: string }[];
  defaultLocationId: string;
  products: SizedProduct[];
}) {
  const [state, formAction, pending] = useActionState(registerCashierSale, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [unitPrice, setUnitPrice] = useState("");

  const [handledSuccess, setHandledSuccess] = useState(state.success);
  if (state.success !== handledSuccess) {
    setHandledSuccess(state.success);
    if (state.success) {
      setFormVersion((v) => v + 1);
      setUnitPrice("");
    }
  }

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <select
        name="locationId"
        required
        defaultValue={defaultLocationId}
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      >
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
        onProductChange={(p) => setUnitPrice(p?.price !== undefined ? String(p.price) : "")}
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />

      <input
        name="quantity"
        type="number"
        min={1}
        defaultValue={1}
        placeholder="Cantidad"
        required
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />

      <div className="flex items-center gap-1">
        <span className="text-sm text-wears-espresso/60">$</span>
        <input
          name="unitPrice"
          type="number"
          step="0.01"
          min={0}
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          placeholder="Precio de venta"
          required
          className="w-full rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
        />
      </div>

      <select
        name="paymentMethod"
        required
        defaultValue=""
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      >
        <option value="" disabled>
          Tipo de pago
        </option>
        <option value="EFECTIVO">Efectivo</option>
        <option value="BOLIVARES">Bolívares</option>
        <option value="USDT">USDT</option>
        <option value="BANESCO_PANAMA">Banesco Panamá</option>
      </select>

      <label className="flex items-center gap-2 rounded-lg border border-wears-tan/30 px-3 py-2 text-sm text-wears-espresso/70">
        <input type="checkbox" name="commissionEligible" className="h-4 w-4" />
        Marcar comisión de venta
      </label>

      <input
        name="note"
        placeholder="Nota (opcional)"
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm sm:col-span-2"
      />

      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-wears-gold px-5 py-2 text-sm font-medium text-wears-black hover:bg-wears-tan disabled:opacity-60"
        >
          {pending ? "Registrando..." : "Registrar venta"}
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      </div>
    </form>
  );
}
