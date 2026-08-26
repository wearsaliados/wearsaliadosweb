"use client";

import { useActionState, useRef, useEffect, useState, type FormEvent } from "react";
import { ChevronLeft } from "lucide-react";
import { registerSale, type FormState } from "./actions";
import { formatUSD } from "@/lib/inventory";

const initialState: FormState = {};

type SellableItem = {
  productId: string;
  name: string;
  size: string | null;
  quantity: number;
  price: number;
  barcode: string | null;
  collectionId: string;
  collectionName: string;
  collectionImageUrl: string | null;
};

type Step = "collection" | "model" | "size" | "confirm";

function modelNameOf(item: SellableItem) {
  if (item.size && item.size !== "Única") {
    return item.name.replace(` — Talla ${item.size}`, "");
  }
  return item.name;
}

export default function SaleForm({ items }: { items: SellableItem[] }) {
  const [state, formAction, pending] = useActionState(registerSale, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const sellable = items.filter((i) => i.quantity > 0);

  const [step, setStep] = useState<Step>("collection");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [modelName, setModelName] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [priceInput, setPriceInput] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeError, setBarcodeError] = useState<string | null>(null);

  const selected = sellable.find((i) => i.productId === productId) ?? null;

  const [handledSuccess, setHandledSuccess] = useState(state.success);
  if (state.success !== handledSuccess) {
    setHandledSuccess(state.success);
    if (state.success) {
      setStep("collection");
      setCollectionId(null);
      setModelName(null);
      setProductId(null);
      setQuantity(1);
      setPriceInput("");
      setBarcodeInput("");
      setBarcodeError(null);
    }
  }

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  // Paso 1: colecciones con productos disponibles
  const collections = Array.from(
    sellable.reduce((map, i) => {
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

  // Paso 2: modelos dentro de la colección elegida
  const itemsInCollection = sellable.filter((i) => i.collectionId === collectionId);
  const models = Array.from(
    itemsInCollection.reduce((map, i) => {
      const key = modelNameOf(i);
      if (!map.has(key)) {
        map.set(key, { name: key, price: i.price, variants: 0, stock: 0 });
      }
      const m = map.get(key)!;
      m.variants += 1;
      m.stock += i.quantity;
      return map;
    }, new Map<string, { name: string; price: number; variants: number; stock: number }>())
  ).map(([, v]) => v);

  // Paso 3: tallas del modelo elegido
  const variantsOfModel = itemsInCollection.filter((i) => modelNameOf(i) === modelName);

  function chooseCollection(id: string) {
    setCollectionId(id);
    setStep("model");
  }

  function chooseModel(name: string) {
    const variants = itemsInCollection.filter((i) => modelNameOf(i) === name);
    setModelName(name);
    if (variants.length === 1) {
      setProductId(variants[0].productId);
      setQuantity(1);
      setPriceInput(String(variants[0].price));
      setStep("confirm");
    } else {
      setStep("size");
    }
  }

  function chooseSize(id: string) {
    const item = itemsInCollection.find((i) => i.productId === id);
    setProductId(id);
    setQuantity(1);
    setPriceInput(String(item?.price ?? ""));
    setStep("confirm");
  }

  function goBack() {
    if (step === "confirm") {
      setProductId(null);
      setStep(variantsOfModel.length > 1 ? "size" : "model");
    } else if (step === "size") {
      setModelName(null);
      setStep("model");
    } else if (step === "model") {
      setCollectionId(null);
      setStep("collection");
    }
  }

  function handleBarcodeSubmit(e: FormEvent) {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;
    const match = sellable.find((i) => i.barcode === code);
    if (!match) {
      setBarcodeError("No encontramos ese código en tu inventario disponible.");
      return;
    }
    setBarcodeError(null);
    setCollectionId(match.collectionId);
    setModelName(modelNameOf(match));
    setProductId(match.productId);
    setQuantity(1);
    setPriceInput(String(match.price));
    setStep("confirm");
    setBarcodeInput("");
  }

  const collectionName = collections.find((c) => c.id === collectionId)?.name;

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="productId" value={productId ?? ""} />
      <input type="hidden" name="quantity" value={quantity} />

      {step === "collection" && sellable.length > 0 && (
        <div className="flex flex-col gap-1 rounded-xl border border-dashed border-wears-gold/50 bg-wears-gold/5 p-3">
          <label className="text-xs font-medium text-wears-espresso/70">
            Escanea o escribe el código de barras del modelo
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => {
                setBarcodeInput(e.target.value);
                setBarcodeError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleBarcodeSubmit(e);
              }}
              placeholder="Código de barras"
              className="flex-1 rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleBarcodeSubmit}
              className="rounded-lg border border-wears-gold px-4 py-2 text-sm font-medium text-wears-black hover:bg-wears-gold/10"
            >
              Buscar
            </button>
          </div>
          {barcodeError && <p className="text-xs text-red-600">{barcodeError}</p>}
        </div>
      )}

      {/* Migas de pan */}
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
        {selected?.size && selected.size !== "Única" && (
          <>
            <span>›</span>
            <span className="font-medium text-wears-black">Talla {selected.size}</span>
          </>
        )}
      </div>

      {step === "collection" && (
        <div>
          <p className="mb-2 text-sm text-wears-espresso/60">
            Paso 1 de 3 — Toca la colección que vendiste
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {collections.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => chooseCollection(c.id)}
                className="flex flex-col items-start gap-1 overflow-hidden rounded-xl border border-wears-tan/30 text-left transition hover:border-wears-gold hover:bg-wears-gold/5"
              >
                {c.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrl} alt="" className="h-20 w-full object-cover" />
                )}
                <span className="flex flex-col gap-1 p-3">
                  <span className="text-sm font-medium text-wears-black">{c.name}</span>
                  <span className="text-xs text-wears-espresso/60">{c.count} disponibles</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "model" && (
        <div>
          <p className="mb-2 text-sm text-wears-espresso/60">
            Paso 2 de 3 — Toca el modelo
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                <span className="text-sm font-semibold text-wears-gold">{formatUSD(m.price)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "size" && (
        <div>
          <p className="mb-2 text-sm text-wears-espresso/60">
            Paso 3 de 3 — Toca la talla
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {variantsOfModel.map((v) => (
              <button
                key={v.productId}
                type="button"
                onClick={() => chooseSize(v.productId)}
                className="flex flex-col items-center gap-1 rounded-xl border border-wears-tan/30 p-3 text-center transition hover:border-wears-gold hover:bg-wears-gold/5"
              >
                <span className="text-base font-semibold text-wears-black">{v.size}</span>
                <span className="text-[11px] text-wears-espresso/60">{v.quantity} disp.</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "confirm" && selected && (
        <div className="flex flex-col gap-4">
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
          </div>

          <div className="flex flex-wrap items-end gap-4 rounded-xl border border-wears-tan/30 p-4">
            <div>
              <label className="mb-1 block text-xs text-wears-espresso/60">
                ¿A qué precio lo vendiste? (por unidad)
              </label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-wears-espresso/60">$</span>
                <input
                  type="number"
                  name="unitPrice"
                  min={0}
                  step="0.01"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="w-28 rounded-lg border border-wears-tan/30 px-3 py-2 text-sm font-medium text-wears-black"
                />
              </div>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-wears-espresso/60">Total</p>
              <p className="text-lg font-semibold text-wears-black">
                {formatUSD(quantity * (Number(priceInput) || 0))}
              </p>
            </div>
          </div>

          <input
            name="note"
            placeholder="Nota (opcional)"
            className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
          />

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-wears-gold px-6 py-2.5 text-sm font-medium text-wears-black hover:bg-wears-tan disabled:opacity-50"
            >
              {pending ? "Registrando..." : "Registrar venta"}
            </button>
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            {state.success && <p className="text-sm text-emerald-600">{state.success}</p>}
          </div>
        </div>
      )}

      {sellable.length === 0 && (
        <p className="text-sm text-wears-espresso/50">
          No tienes unidades disponibles para vender en este momento.
        </p>
      )}
    </form>
  );
}
