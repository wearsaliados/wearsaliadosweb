"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { STOCK_STATUS_LABEL, STOCK_STATUS_CLASSES, getStockStatus } from "@/lib/inventory";

export type ReadonlyItem = {
  id: string;
  name: string;
  size: string | null;
  quantity: number;
  minStock: number;
  collectionId: string;
  collectionName: string;
};

function modelNameOf(item: ReadonlyItem) {
  if (item.size && item.size !== "Única") {
    return item.name.replace(` — Talla ${item.size}`, "");
  }
  return item.name;
}

type Step = "collection" | "model" | "size";

export default function InventarioReadonly({ items }: { items: ReadonlyItem[] }) {
  const [step, setStep] = useState<Step>("collection");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [modelName, setModelName] = useState<string | null>(null);

  if (items.length === 0) {
    return <p className="py-3 text-center text-sm text-wears-espresso/50">Sin existencias registradas.</p>;
  }

  const collections = Array.from(
    items.reduce((map, i) => {
      if (!map.has(i.collectionId)) {
        map.set(i.collectionId, { id: i.collectionId, name: i.collectionName, count: 0 });
      }
      map.get(i.collectionId)!.count += i.quantity;
      return map;
    }, new Map<string, { id: string; name: string; count: number }>())
  ).map(([, v]) => v);

  const itemsInCollection = items.filter((i) => i.collectionId === collectionId);
  const models = Array.from(
    itemsInCollection.reduce((map, i) => {
      const key = modelNameOf(i);
      if (!map.has(key)) map.set(key, { name: key, variants: 0, stock: 0 });
      const m = map.get(key)!;
      m.variants += 1;
      m.stock += i.quantity;
      return map;
    }, new Map<string, { name: string; variants: number; stock: number }>())
  ).map(([, v]) => v);

  const variantsOfModel = itemsInCollection.filter((i) => modelNameOf(i) === modelName);

  function goBack() {
    if (step === "size") {
      setModelName(null);
      setStep("model");
    } else if (step === "model") {
      setCollectionId(null);
      setStep("collection");
    }
  }

  const collectionName = collections.find((c) => c.id === collectionId)?.name;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1 text-xs text-wears-espresso/60">
        {step !== "collection" && (
          <button
            type="button"
            onClick={goBack}
            className="mr-2 flex items-center gap-1 rounded-full border border-wears-tan/30 px-2 py-1 text-wears-espresso hover:border-wears-gold"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Atrás
          </button>
        )}
        {collectionName && <span className="font-medium text-wears-black">{collectionName}</span>}
        {modelName && (
          <>
            <span>›</span>
            <span className="font-medium text-wears-black">{modelName}</span>
          </>
        )}
      </div>

      {step === "collection" && (
        <div className="grid grid-cols-2 gap-2">
          {collections.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCollectionId(c.id);
                setStep("model");
              }}
              className="flex flex-col items-start gap-0.5 rounded-lg border border-wears-tan/30 p-3 text-left transition hover:border-wears-gold hover:bg-wears-gold/5"
            >
              <span className="text-sm font-medium text-wears-black">{c.name}</span>
              <span className="text-xs text-wears-espresso/60">{c.count} unidades</span>
            </button>
          ))}
        </div>
      )}

      {step === "model" && (
        <div className="grid grid-cols-2 gap-2">
          {models.map((m) => (
            <button
              key={m.name}
              type="button"
              onClick={() => {
                setModelName(m.name);
                setStep("size");
              }}
              className="flex flex-col items-start gap-0.5 rounded-lg border border-wears-tan/30 p-3 text-left transition hover:border-wears-gold hover:bg-wears-gold/5"
            >
              <span className="text-sm font-medium text-wears-black">{m.name}</span>
              <span className="text-xs text-wears-espresso/60">
                {m.variants > 1 ? `${m.stock} unidades en varias tallas` : `${m.stock} unidades`}
              </span>
            </button>
          ))}
        </div>
      )}

      {step === "size" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-wears-tan/20 text-left text-wears-espresso/60">
                <th className="py-2 pr-4">{variantsOfModel[0]?.size ? "Talla" : "Producto"}</th>
                <th className="py-2 pr-4">Disponible</th>
                <th className="py-2 pr-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {variantsOfModel.map((item) => {
                const status = getStockStatus(item.quantity, item.minStock);
                return (
                  <tr key={item.id} className="border-b border-wears-tan/10">
                    <td className="py-2 pr-4 font-medium">
                      {item.size && item.size !== "Única" ? item.size : item.name}
                    </td>
                    <td className="py-2 pr-4">{item.quantity}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs ${STOCK_STATUS_CLASSES[status]}`}
                      >
                        {STOCK_STATUS_LABEL[status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
