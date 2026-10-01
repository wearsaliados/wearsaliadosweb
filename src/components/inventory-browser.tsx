"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { STOCK_STATUS_LABEL, STOCK_STATUS_CLASSES, getStockStatus } from "@/lib/inventory";

export type BrowserItem = {
  id: string;
  name: string;
  size: string | null;
  quantity: number;
  minStock: number;
  acquisitionType: "PURCHASE" | "CONSIGNMENT";
  collectionId: string;
  collectionName: string;
  collectionImageUrl: string | null;
};

function modelNameOf(item: BrowserItem) {
  if (item.size && item.size !== "Única") {
    return item.name.replace(` — Talla ${item.size}`, "");
  }
  return item.name;
}

type Step = "collection" | "model" | "size";

export default function InventoryBrowser({ items }: { items: BrowserItem[] }) {
  const [step, setStep] = useState<Step>("collection");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [modelName, setModelName] = useState<string | null>(null);

  const collections = Array.from(
    items.reduce((map, i) => {
      if (!map.has(i.collectionId)) {
        map.set(i.collectionId, {
          id: i.collectionId,
          name: i.collectionName,
          count: 0,
          imageUrl: i.collectionImageUrl,
        });
      }
      map.get(i.collectionId)!.count += i.quantity;
      return map;
    }, new Map<string, { id: string; name: string; count: number; imageUrl: string | null }>())
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

  function chooseCollection(id: string) {
    setCollectionId(id);
    setStep("model");
  }

  function chooseModel(name: string) {
    setModelName(name);
    setStep("size");
  }

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

  if (items.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-wears-espresso/50">
        Aún no tienes inventario asignado. Contacta a Wears.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {collections.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => chooseCollection(c.id)}
              className="flex flex-col items-start gap-1 overflow-hidden rounded-xl border border-wears-tan/30 text-left transition hover:border-wears-gold hover:bg-wears-gold/5"
            >
              {c.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.imageUrl} alt="" className="aspect-square w-full object-cover" />
              )}
              <span className="flex flex-col gap-1 p-4">
                <span className="text-sm font-medium text-wears-black">{c.name}</span>
                <span className="text-xs text-wears-espresso/60">{c.count} disponibles</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {step === "model" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {models.map((m) => (
            <button
              key={m.name}
              type="button"
              onClick={() => chooseModel(m.name)}
              className="flex flex-col items-start gap-1 rounded-xl border border-wears-tan/30 p-4 text-left transition hover:border-wears-gold hover:bg-wears-gold/5"
            >
              <span className="text-sm font-medium text-wears-black">{m.name}</span>
              <span className="text-xs text-wears-espresso/60">
                {m.variants > 1 ? `${m.stock} disponibles en varias tallas` : `${m.stock} disponibles`}
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
                <th className="py-2 pr-4">Talla</th>
                <th className="py-2 pr-4">Disponible</th>
                <th className="py-2 pr-4">Origen</th>
                <th className="py-2 pr-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {variantsOfModel.map((v) => {
                const status = getStockStatus(v.quantity, v.minStock);
                return (
                  <tr key={v.id} className="border-b border-wears-tan/10">
                    <td className="py-2 pr-4 font-medium">
                      {v.size && v.size !== "Única" ? v.size : "Única"}
                    </td>
                    <td className="py-2 pr-4">{v.quantity}</td>
                    <td className="py-2 pr-4 text-wears-espresso/70">
                      {v.acquisitionType === "CONSIGNMENT" ? "Consignación" : "Compra"}
                    </td>
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
