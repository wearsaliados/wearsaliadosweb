"use client";

import { useActionState, useState } from "react";
import { formatUSD, formatDateTime } from "@/lib/inventory";
import { sendReceiptEmailAction, type Receipt, type FormState } from "./actions";
import WearsAnchorLogo from "@/components/wears-logo";

const emailInitialState: FormState = {};

function talla(size: string | null) {
  return size && size !== "Única" ? `Talla ${size}` : null;
}

export default function ReceiptModal({
  receipt,
  onClose,
}: {
  receipt: Receipt;
  onClose: () => void;
}) {
  const [panel, setPanel] = useState<"none" | "email" | "whatsapp">("none");
  const [phone, setPhone] = useState("");
  const [emailState, emailAction, emailPending] = useActionState(
    sendReceiptEmailAction.bind(null, JSON.stringify(receipt)),
    emailInitialState
  );

  const whatsappText = [
    "Gracias por tu compra en Wears — Cueroswears.com",
    "",
    ...receipt.lines.map(
      (l) =>
        `${l.productName}${talla(l.size) ? ` — ${talla(l.size)}` : ""} x${l.quantity} — ${formatUSD(
          l.unitPrice * l.quantity
        )}`
    ),
    "",
    `Total: ${formatUSD(receipt.total)}`,
    `Método de pago: ${receipt.paymentMethod}`,
  ].join("\n");

  function openWhatsApp() {
    const digits = phone.replace(/[^0-9]/g, "");
    if (!digits) return;
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(whatsappText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:static print:bg-white print:p-0">
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl print:max-w-full print:rounded-none print:shadow-none">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-wears-espresso/50 hover:bg-wears-sand hover:text-wears-black print:hidden"
        >
          ✕
        </button>

        <div className="flex flex-col items-center gap-1 rounded-t-2xl bg-wears-black px-6 py-6 text-center text-wears-cream">
          <WearsAnchorLogo className="h-10 w-10" />
          <p className="text-xs tracking-[0.35em] uppercase text-wears-tan">Cueroswears.com</p>
          <p className="text-lg font-semibold">Comprobante de compra</p>
        </div>

        <div className="px-6 py-5">
          <div className="mb-4 flex justify-between text-xs text-wears-espresso/60">
            <span>{formatDateTime(new Date(receipt.date))}</span>
            <span>{receipt.locationName}</span>
          </div>

          <div className="flex flex-col divide-y divide-dashed divide-wears-tan/30">
            {receipt.lines.map((l, i) => (
              <div key={i} className="flex flex-col gap-0.5 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-wears-black">
                    {l.productName}
                    {talla(l.size) && (
                      <span className="ml-1 text-xs font-normal text-wears-espresso/60">
                        — {talla(l.size)}
                      </span>
                    )}
                  </p>
                  <p className="whitespace-nowrap text-sm font-semibold text-wears-black">
                    {formatUSD(l.unitPrice * l.quantity)}
                  </p>
                </div>
                {l.description && (
                  <p className="text-xs text-wears-espresso/50">{l.description}</p>
                )}
                <p className="text-xs text-wears-espresso/50">
                  {l.quantity} x {formatUSD(l.unitPrice)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between border-t-2 border-wears-black pt-3">
            <p className="font-semibold text-wears-black">Total</p>
            <p className="text-xl font-semibold text-wears-black">{formatUSD(receipt.total)}</p>
          </div>
          <div className="mt-1 flex justify-between text-xs text-wears-espresso/60">
            <span>Método de pago</span>
            <span>{receipt.paymentMethod}</span>
          </div>
          <p className="mt-3 text-center text-xs text-wears-espresso/50">
            Atendido por {receipt.cashierName} · ¡Gracias por tu compra!
          </p>
        </div>

        <div className="flex flex-col gap-3 border-t border-wears-tan/20 px-6 py-4 print:hidden">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 rounded-full border border-wears-tan/40 px-4 py-2 text-sm font-medium text-wears-black hover:border-wears-gold"
            >
              Imprimir
            </button>
            <button
              type="button"
              onClick={() => setPanel(panel === "email" ? "none" : "email")}
              className="flex-1 rounded-full border border-wears-tan/40 px-4 py-2 text-sm font-medium text-wears-black hover:border-wears-gold"
            >
              Enviar correo
            </button>
            <button
              type="button"
              onClick={() => setPanel(panel === "whatsapp" ? "none" : "whatsapp")}
              className="flex-1 rounded-full border border-wears-tan/40 px-4 py-2 text-sm font-medium text-wears-black hover:border-wears-gold"
            >
              WhatsApp
            </button>
          </div>

          {panel === "email" && (
            <form action={emailAction} className="flex gap-2">
              <input
                name="to"
                type="email"
                required
                placeholder="Correo del cliente"
                className="flex-1 rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={emailPending}
                className="rounded-full bg-wears-gold px-4 py-2 text-sm font-medium text-wears-black hover:bg-wears-tan disabled:opacity-60"
              >
                {emailPending ? "Enviando..." : "Enviar"}
              </button>
            </form>
          )}
          {panel === "email" && emailState.error && (
            <p className="text-xs text-red-600">{emailState.error}</p>
          )}
          {panel === "email" && emailState.success && (
            <p className="text-xs text-emerald-600">{emailState.success}</p>
          )}

          {panel === "whatsapp" && (
            <div className="flex gap-2">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="WhatsApp del cliente (+58...)"
                className="flex-1 rounded-lg border border-wears-tan/30 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={openWhatsApp}
                className="rounded-full bg-wears-gold px-4 py-2 text-sm font-medium text-wears-black hover:bg-wears-tan"
              >
                Abrir chat
              </button>
            </div>
          )}
          {panel === "whatsapp" && (
            <p className="text-xs text-wears-espresso/50">
              Se abre WhatsApp con el comprobante ya escrito — solo falta que le des enviar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
