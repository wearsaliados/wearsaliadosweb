"use client";

import { useActionState, useRef, useEffect } from "react";
import { createProduct, type FormState } from "./actions";

const initialState: FormState = {};
const NEW_COLLECTION_VALUE = "__new__";

export default function ProductForm({
  collections,
}: {
  collections: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createProduct, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      <input
        name="sku"
        placeholder="SKU"
        required
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <input
        name="name"
        placeholder="Nombre del producto"
        required
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <input
        name="barcode"
        placeholder="Código de barras (opcional)"
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <select
        name="collectionId"
        defaultValue=""
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      >
        <option value="">Sin colección</option>
        {collections.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
        <option value={NEW_COLLECTION_VALUE}>+ Crear colección nueva...</option>
      </select>
      <input
        name="newCollectionName"
        placeholder="Si elegiste &quot;+ Crear colección nueva...&quot;, escribe aquí el nombre"
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <input
        name="price"
        type="number"
        min="0"
        step="1000"
        placeholder="Precio de venta"
        required
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <input
        name="cost"
        type="number"
        min="0"
        step="1000"
        placeholder="Costo"
        required
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <input
        name="manufacturingCost"
        type="number"
        min="0"
        step="1000"
        placeholder="Costo de fabricación"
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <input
        name="minStock"
        type="number"
        min="0"
        defaultValue={2}
        placeholder="Stock mínimo"
        required
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
      />
      <input
        name="imageUrl"
        placeholder="URL de imagen (opcional)"
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm sm:col-span-2"
      />
      <input
        name="description"
        placeholder="Descripción (opcional)"
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm sm:col-span-2 lg:col-span-3"
      />

      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-wears-gold px-5 py-2 text-sm font-medium text-wears-black hover:bg-wears-tan disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Agregar producto"}
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      </div>
    </form>
  );
}
