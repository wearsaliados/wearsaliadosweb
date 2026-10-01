"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { registerCashierSale, transferToAllyByCashier, type FormState } from "./actions";
import ModelSizeSelect, { type SizedProduct } from "@/components/model-size-select";
import { formatUSD } from "@/lib/inventory";
import ReceiptModal from "./receipt-modal";

const initialState: FormState = {};

type CartLine = {
  productId: string;
  name: string;
  size: string | null;
  description: string | null;
  unitPrice: number;
  quantity: number;
  commissionEligible: boolean;
};

export default function SaleForm({
  locations,
  defaultLocationId,
  products,
  allies,
}: {
  locations: { id: string; name: string }[];
  defaultLocationId: string;
  products: SizedProduct[];
  allies: { id: string; businessName: string }[];
}) {
  const [mode, setMode] = useState<"sale" | "ally">("sale");

  const [saleState, saleAction, salePending] = useActionState(registerCashierSale, initialState);
  const [allyState, allyAction, allyPending] = useActionState(
    transferToAllyByCashier,
    initialState
  );

  const saleFormRef = useRef<HTMLFormElement>(null);
  const allyFormRef = useRef<HTMLFormElement>(null);

  const [pickerVersion, setPickerVersion] = useState(0);
  const [staged, setStaged] = useState<SizedProduct | undefined>();
  const [stagedPrice, setStagedPrice] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<typeof saleState.receipt>(undefined);

  // Cada resultado de la acción es un objeto nuevo (aunque el mensaje se
  // repita entre dos ventas seguidas), así que comparamos su identidad en
  // vez del texto para no perdernos un envío exitoso.
  const [prevSaleState, setPrevSaleState] = useState(saleState);
  if (prevSaleState !== saleState) {
    setPrevSaleState(saleState);
    if (saleState.success && saleState.receipt) {
      setCart([]);
      setStaged(undefined);
      setStagedPrice("");
      setPickerVersion((v) => v + 1);
      setReceipt(saleState.receipt);
    }
  }

  const [prevAllyState, setPrevAllyState] = useState(allyState);
  if (prevAllyState !== allyState) {
    setPrevAllyState(allyState);
    if (allyState.success) setPickerVersion((v) => v + 1);
  }

  useEffect(() => {
    if (allyState.success) allyFormRef.current?.reset();
  }, [allyState.success]);

  function addToCart(product: SizedProduct, unitPrice: number) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          size: product.size,
          description: product.description ?? null,
          unitPrice,
          quantity: 1,
          commissionEligible: false,
        },
      ];
    });
  }

  function handleAddStaged() {
    if (!staged) return;
    addToCart(staged, Number(stagedPrice) || staged.price || 0);
    setStaged(undefined);
    setStagedPrice("");
    setPickerVersion((v) => v + 1);
  }

  function handleBarcodeSubmit() {
    const code = barcodeInput.trim();
    if (!code) return;
    const match = products.find((p) => p.barcode === code);
    if (!match) {
      setBarcodeError("No encontramos ningún producto con ese código de barras.");
      return;
    }
    setBarcodeError(null);
    addToCart(match, match.price ?? 0);
    setBarcodeInput("");
  }

  function updateLine(productId: string, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  const total = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setMode(mode === "ally" ? "sale" : "ally")}
          aria-pressed={mode === "ally"}
          className={`w-fit rounded-full px-5 py-2 text-sm font-medium transition ${
            mode === "ally"
              ? "bg-wears-black text-white shadow-sm hover:bg-wears-espresso"
              : "border border-wears-black/40 text-wears-black hover:bg-wears-black/5"
          }`}
        >
          {mode === "ally" ? "✓ Entrega aliado comercial" : "Entrega aliado comercial"}
        </button>

        {mode === "sale" && (
          <div className="flex flex-col gap-1 rounded-xl border border-dashed border-wears-gold/50 bg-wears-gold/5 p-3">
            <label className="text-xs font-medium text-wears-espresso/70">
              Escanea o escribe el código de barras del producto
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
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleBarcodeSubmit();
                  }
                }}
                placeholder="Código de barras"
                className="flex-1 rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleBarcodeSubmit}
                className="rounded-lg border border-wears-gold px-4 py-2 text-sm font-medium text-wears-black hover:bg-wears-gold/10"
              >
                Agregar
              </button>
            </div>
            {barcodeError && <p className="text-xs text-red-600">{barcodeError}</p>}
          </div>
        )}
      </div>

      {mode === "sale" ? (
        <form ref={saleFormRef} action={saleAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              key={pickerVersion}
              products={products}
              onProductChange={(p) => {
                setStaged(p);
                setStagedPrice(p?.price !== undefined ? String(p.price) : "");
              }}
              className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
            />

            <div className="flex items-center gap-1">
              <span className="text-sm text-wears-espresso/60">$</span>
              <input
                type="number"
                step="0.01"
                min={0}
                value={stagedPrice}
                onChange={(e) => setStagedPrice(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddStaged();
                  }
                }}
                placeholder="Precio"
                className="w-full rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
              />
            </div>

            <button
              type="button"
              onClick={handleAddStaged}
              disabled={!staged}
              className="rounded-lg border border-wears-gold px-4 py-2 text-sm font-medium text-wears-black hover:bg-wears-gold/10 disabled:opacity-40"
            >
              Agregar producto
            </button>
          </div>

          {cart.length > 0 && (
            <div className="rounded-lg border border-wears-tan/30 p-3">
              <div className="flex flex-col divide-y divide-wears-tan/10">
                {cart.map((l) => (
                  <div
                    key={l.productId}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <div className="min-w-[10rem]">
                      <p className="text-sm font-medium text-wears-black">
                        {l.name}
                        {l.size && l.size !== "Única" && (
                          <span className="ml-1 text-xs font-normal text-wears-espresso/60">
                            Talla {l.size}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateLine(l.productId, { quantity: Math.max(1, l.quantity - 1) })
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-wears-tan/40 text-sm hover:border-wears-gold"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm">{l.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateLine(l.productId, { quantity: l.quantity + 1 })}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-wears-tan/40 text-sm hover:border-wears-gold"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-xs text-wears-espresso/60">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={l.unitPrice}
                        onChange={(e) =>
                          updateLine(l.productId, { unitPrice: Number(e.target.value) || 0 })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.preventDefault();
                        }}
                        className="w-20 rounded-lg border border-wears-tan/30 px-2 py-1 text-sm"
                      />
                    </div>

                    <label className="flex items-center gap-1 text-xs text-wears-espresso/60">
                      <input
                        type="checkbox"
                        checked={l.commissionEligible}
                        onChange={(e) =>
                          updateLine(l.productId, { commissionEligible: e.target.checked })
                        }
                        className="h-3.5 w-3.5"
                      />
                      Comisión
                    </label>

                    <p className="w-20 text-right text-sm font-semibold text-wears-black">
                      {formatUSD(l.unitPrice * l.quantity)}
                    </p>

                    <button
                      type="button"
                      onClick={() => removeLine(l.productId)}
                      aria-label="Quitar"
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>

                    <input type="hidden" name="productId" value={l.productId} />
                    <input type="hidden" name="quantity" value={l.quantity} />
                    <input type="hidden" name="unitPrice" value={l.unitPrice} />
                    <input
                      type="hidden"
                      name="commissionEligible"
                      value={l.commissionEligible ? "true" : "false"}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-wears-tan/20 pt-2">
                <p className="font-medium text-wears-black">Total a cobrar</p>
                <p className="text-lg font-semibold text-emerald-600">{formatUSD(total)}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={salePending || cart.length === 0}
              className="rounded-full bg-wears-gold px-5 py-2 text-sm font-medium text-wears-black hover:bg-wears-tan disabled:opacity-50"
            >
              {salePending ? "Registrando..." : "Registrar venta"}
            </button>
            {saleState.error && <p className="text-sm text-red-600">{saleState.error}</p>}
          </div>
        </form>
      ) : (
        <form ref={allyFormRef} action={allyAction} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select
              name="allyId"
              required
              defaultValue=""
              className="rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Aliado comercial
              </option>
              {allies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.businessName}
                </option>
              ))}
            </select>

            <ModelSizeSelect
              key={`ally-${pickerVersion}`}
              name="productId"
              products={products}
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

            <button
              type="submit"
              disabled={allyPending}
              className="rounded-full bg-wears-black px-5 py-2 text-sm font-medium text-white hover:bg-wears-espresso disabled:opacity-50"
            >
              {allyPending ? "Transfiriendo..." : "Transferir a aliado"}
            </button>
          </div>
          {allyState.error && <p className="text-sm text-red-600">{allyState.error}</p>}
          {allyState.success && <p className="text-sm text-emerald-600">{allyState.success}</p>}
        </form>
      )}

      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(undefined)} />}
    </>
  );
}
