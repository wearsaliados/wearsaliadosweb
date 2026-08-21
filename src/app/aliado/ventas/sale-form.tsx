"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { registerSale, type FormState } from "./actions";
import { formatUSD } from "@/lib/inventory";

const initialState: FormState = {};

type SellableItem = { productId: string; name: string; quantity: number; price: number };

export default function SaleForm({ items }: { items: SellableItem[] }) {
  const [state, formAction, pending] = useActionState(registerSale, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [search, setSearch] = useState("");

  const sellable = items.filter((i) => i.quantity > 0);
  const visible = sellable.filter((i) =>
    i.name.toLowerCase().includes(search.trim().toLowerCase())
  );
  const selected = sellable.find((i) => i.productId === selectedId) ?? null;

  const [handledSuccess, setHandledSuccess] = useState(state.success);
  if (state.success !== handledSuccess) {
    setHandledSuccess(state.success);
    if (state.success) {
      setSelectedId(null);
      setQuantity(1);
    }
  }

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  function selectProduct(item: SellableItem) {
    setSelectedId(item.productId);
    setQuantity(1);
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="productId" value={selectedId ?? ""} />
      <input type="hidden" name="quantity" value={quantity} />

      <div>
        <p className="mb-2 text-sm text-wears-espresso/60">
          Toca el producto que vendiste
        </p>
        {sellable.length > 8 && (
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar modelo o talla..."
            className="mb-3 w-full rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
          />
        )}
        <div className="grid max-h-[420px] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((item) => {
            const active = item.productId === selectedId;
            return (
              <button
                key={item.productId}
                type="button"
                onClick={() => selectProduct(item)}
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
                  active
                    ? "border-wears-gold bg-wears-gold/10 ring-2 ring-wears-gold"
                    : "border-wears-tan/30 hover:border-wears-gold/60"
                }`}
              >
                <span className="text-sm font-medium text-wears-black">{item.name}</span>
                <span className="text-xs text-wears-espresso/60">
                  {item.quantity} disponibles
                </span>
                <span className="text-sm font-semibold text-wears-gold">
                  {formatUSD(item.price)}
                </span>
              </button>
            );
          })}
          {visible.length === 0 && sellable.length > 0 && (
            <p className="col-span-full text-sm text-wears-espresso/50">
              Sin resultados para &quot;{search}&quot;.
            </p>
          )}
        </div>
      </div>

      {selected && (
        <div className="flex flex-wrap items-center gap-5 rounded-xl border border-wears-gold/40 bg-wears-gold/5 p-4">
          <div>
            <p className="text-xs text-wears-espresso/60">Vendiendo</p>
            <p className="font-medium text-wears-black">{selected.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-wears-tan/40 text-lg font-medium text-wears-black hover:border-wears-gold"
              aria-label="Restar unidad"
            >
              −
            </button>
            <span className="w-8 text-center text-lg font-semibold text-wears-black">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(selected.quantity, q + 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-wears-tan/40 text-lg font-medium text-wears-black hover:border-wears-gold"
              aria-label="Sumar unidad"
            >
              +
            </button>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-wears-espresso/60">Total</p>
            <p className="text-lg font-semibold text-wears-black">
              {formatUSD(quantity * selected.price)}
            </p>
          </div>
        </div>
      )}

      <input
        name="note"
        placeholder="Nota (opcional)"
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !selected}
          className="rounded-full bg-wears-gold px-6 py-2.5 text-sm font-medium text-wears-black hover:bg-wears-tan disabled:opacity-50"
        >
          {pending ? "Registrando..." : "Registrar venta"}
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      </div>

      {sellable.length === 0 && (
        <p className="text-sm text-wears-espresso/50">
          No tienes unidades disponibles para vender en este momento.
        </p>
      )}
    </form>
  );
}
