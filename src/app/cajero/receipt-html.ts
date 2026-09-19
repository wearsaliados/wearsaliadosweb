import { formatUSD, formatDateTime } from "@/lib/inventory";
import type { Receipt } from "./actions";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tallaLabel(size: string | null) {
  return size && size !== "Única" ? `Talla ${size}` : null;
}

/**
 * Genera el comprobante como un documento HTML completo y autocontenido
 * (estilos en línea) — se usa tanto para el correo al cliente como para la
 * ventana de impresión, así ambos se ven igual que el ticket en pantalla.
 */
export function buildReceiptHtml(receipt: Receipt): string {
  const rows = receipt.lines
    .map((l) => {
      const talla = tallaLabel(l.size);
      return `
        <div style="border-top:1px dashed #c9a24a80;padding:10px 0;">
          <div style="display:flex;justify-content:space-between;gap:12px;">
            <div style="font-size:14px;font-weight:600;color:#0a1830;">
              ${escapeHtml(l.productName)}${
                talla
                  ? ` <span style="font-weight:400;color:#6b5f52;font-size:12px;">— ${escapeHtml(talla)}</span>`
                  : ""
              }
            </div>
            <div style="font-size:14px;font-weight:600;color:#0a1830;white-space:nowrap;">
              ${formatUSD(l.unitPrice * l.quantity)}
            </div>
          </div>
          ${
            l.description
              ? `<div style="font-size:12px;color:#8a7f70;margin-top:2px;">${escapeHtml(l.description)}</div>`
              : ""
          }
          <div style="font-size:12px;color:#8a7f70;margin-top:2px;">
            ${l.quantity} x ${formatUSD(l.unitPrice)}
          </div>
        </div>`;
    })
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Comprobante de compra</title>
</head>
<body style="margin:0;padding:24px;background:#f2e9da;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:420px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(10,24,48,0.15);">
    <div style="background:#0a1830;color:#f2e9da;text-align:center;padding:28px 24px;">
      <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#c9a24a;">Cueroswears.com</div>
      <div style="font-size:18px;font-weight:600;margin-top:8px;color:#ffffff;">Comprobante de compra</div>
    </div>
    <div style="padding:20px 24px 24px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b5f52;margin-bottom:12px;">
        <span>${escapeHtml(formatDateTime(new Date(receipt.date)))}</span>
        <span>${escapeHtml(receipt.locationName)}</span>
      </div>
      ${rows}
      <div style="display:flex;justify-content:space-between;border-top:2px solid #0a1830;padding-top:12px;margin-top:4px;">
        <div style="font-weight:600;color:#0a1830;">Total</div>
        <div style="font-size:20px;font-weight:700;color:#0a1830;">${formatUSD(receipt.total)}</div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b5f52;margin-top:4px;">
        <span>Método de pago</span>
        <span>${escapeHtml(receipt.paymentMethod)}</span>
      </div>
      <div style="text-align:center;font-size:12px;color:#8a7f70;margin-top:18px;">
        Atendido por ${escapeHtml(receipt.cashierName)} · ¡Gracias por tu compra!
      </div>
    </div>
  </div>
</body>
</html>`;
}
