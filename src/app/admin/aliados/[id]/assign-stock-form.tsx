"use client";

import { useActionState, useRef, useEffect } from "react";
import { assignStockToAlly, type FormState } from "../actions";
import ProductSelect, { type ProductOption } from "@/components/product-select";

const initialState: FormState = {};

export default function AssignStockForm({
  allyId,
  products,
}: {
  allyId: string;
  products: ProductOption[];
}) {
  const [state, formAction, pending] = useActionState(assignStockToAlly, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
    >
      <input type="hidden" name="allyId" value={allyId} />
      <ProductSelect
        name="productId"
        required
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
        defaultValue=""
        products={products}
        onChange={(e) => {
          const opt = e.target.selectedOptions[0];
          const costInput = e.currentTarget.form?.elements.namedItem(
            "unitCost"
          ) as HTMLInputElement | null;
          if (costInput && opt?.dataset.cost) costInput.value = opt.dataset.cost;
        }}
      />
      <input
        name="quantity"
        type="number"
        min="1"
        placeholder="Cantidad"
        required
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <select
        name="acquisitionType"
        required
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
        defaultValue="PURCHASE"
      >
        <option value="PURCHASE">Comprada por el aliado</option>
        <option value="CONSIGNMENT">A consignación</option>
      </select>
      <input
        name="unitCost"
        type="number"
        min="0"
        step="1000"
        placeholder="Costo unitario"
        required
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-wears-gold px-4 py-2 text-sm font-medium text-wears-black hover:bg-wears-tan disabled:opacity-60"
      >
        {pending ? "Asignando..." : "Asignar al aliado"}
      </button>

      {state.error && (
        <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-5">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-emerald-600 sm:col-span-2 lg:col-span-5">
          {state.success}
        </p>
      )}
    </form>
  );
}
