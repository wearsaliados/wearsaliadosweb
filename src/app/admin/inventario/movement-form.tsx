"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { adjustInventory, type FormState } from "./actions";

const initialState: FormState = {};

type ReceivableProduct = {
  id: string;
  name: string;
  size: string | null;
  collectionName: string;
};

function modelNameOf(p: ReceivableProduct) {
  if (p.size && p.size !== "Única") {
    return p.name.replace(` — Talla ${p.size}`, "");
  }
  return p.name;
}

export default function MovementForm({
  locations,
  products,
}: {
  locations: { id: string; name: string }[];
  products: ReceivableProduct[];
}) {
  const [state, formAction, pending] = useActionState(adjustInventory, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [modelKey, setModelKey] = useState("");

  const [handledSuccess, setHandledSuccess] = useState(state.success);
  if (state.success !== handledSuccess) {
    setHandledSuccess(state.success);
    if (state.success) setModelKey("");
  }

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  // Agrupa por colección y, dentro de cada colección, por modelo (sin la talla).
  const groups = new Map<string, Map<string, ReceivableProduct[]>>();
  for (const p of products) {
    const byModel = groups.get(p.collectionName) ?? new Map<string, ReceivableProduct[]>();
    const model = modelNameOf(p);
    const list = byModel.get(model) ?? [];
    list.push(p);
    byModel.set(model, list);
    groups.set(p.collectionName, byModel);
  }
  const sortedCollections = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const [collectionName, modelName] = modelKey.split("::");
  const variants = (groups.get(collectionName)?.get(modelName) ?? [])
    .slice()
    .sort((a, b) => (a.size ?? "").localeCompare(b.size ?? "", undefined, { numeric: true }));

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <select
          name="locationId"
          required
          defaultValue=""
          className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Ubicación
          </option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        <select
          value={modelKey}
          onChange={(e) => setModelKey(e.target.value)}
          className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm sm:col-span-2"
        >
          <option value="">Producto</option>
          {sortedCollections.map(([cName, byModel]) => (
            <optgroup key={cName} label={cName}>
              {[...byModel.keys()]
                .sort((a, b) => a.localeCompare(b))
                .map((mName) => (
                  <option key={mName} value={`${cName}::${mName}`}>
                    {mName}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>

      {variants.length > 0 && (
        <div className="rounded-lg border border-wears-tan/30 p-3">
          <p className="mb-2 text-xs text-wears-espresso/60">
            Cantidad recibida por talla — deja en blanco las que no llegaron
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {variants.map((v) => (
              <label key={v.id} className="flex flex-col gap-1 text-xs text-wears-espresso/70">
                {v.size && v.size !== "Única" ? `Talla ${v.size}` : v.name}
                <input type="hidden" name="productId" value={v.id} />
                <input
                  type="number"
                  name="quantity"
                  min={0}
                  className="rounded-lg border border-wears-tan/30 px-2 py-1.5 text-sm"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      <input
        name="note"
        placeholder="Nota (opcional)"
        className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm sm:w-1/2"
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-wears-gold px-4 py-2 text-sm font-medium text-wears-black hover:bg-wears-tan disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Registrar entrada"}
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      </div>
    </form>
  );
}
