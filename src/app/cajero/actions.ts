"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCashier } from "@/lib/auth";
import { formatUSD, formatDate, formatDateTime } from "@/lib/inventory";
import { notifyAdmin, sendCustomerEmail } from "@/lib/notifications";

export type FormState = { error?: string; success?: string; receipt?: Receipt };

export type ReceiptLine = {
  productName: string;
  size: string | null;
  description: string | null;
  unitPrice: number;
  quantity: number;
};

export type Receipt = {
  cashierName: string;
  locationName: string;
  paymentMethod: string;
  date: string;
  lines: ReceiptLine[];
  total: number;
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  BOLIVARES: "Bolívares",
  USDT: "USDT",
  BANESCO_PANAMA: "Banesco Panamá",
};

const cartLineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().min(0),
  commissionEligible: z.enum(["true", "false"]).transform((v) => v === "true"),
});

const cartSaleSchema = z.object({
  locationId: z.string().min(1),
  paymentMethod: z.enum(["EFECTIVO", "BOLIVARES", "USDT", "BANESCO_PANAMA"]),
  lines: z.array(cartLineSchema).min(1, "Agrega al menos un producto"),
});

/**
 * Registra una venta directa hecha por el cajero, con uno o varios
 * productos en un mismo ticket (tienda en línea o punto físico).
 */
export async function registerCashierSale(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireCashier();

  const productIds = formData.getAll("productId").map(String);
  const quantities = formData.getAll("quantity").map(String);
  const unitPrices = formData.getAll("unitPrice").map(String);
  const commissionFlags = formData.getAll("commissionEligible").map(String);
  const lines = productIds.map((productId, i) => ({
    productId,
    quantity: quantities[i],
    unitPrice: unitPrices[i],
    commissionEligible: commissionFlags[i],
  }));

  const parsed = cartSaleSchema.safeParse({
    locationId: formData.get("locationId"),
    paymentMethod: formData.get("paymentMethod"),
    lines,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { locationId, paymentMethod, lines: cartLines } = parsed.data;

  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location || (location.type !== "WEB" && location.type !== "STORE")) {
    return { error: "Elige la tienda en línea o un punto físico" };
  }

  const [items, cashier] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { locationId, productId: { in: cartLines.map((l) => l.productId) } },
      include: { product: true },
    }),
    prisma.cashier.findUnique({ where: { id: session.cashierId } }),
  ]);
  if (!cashier) return { error: "Cajero no encontrado" };

  const itemByProduct = new Map(items.map((i) => [i.productId, i]));

  // Junta líneas del mismo producto (por si se agregó dos veces) antes de validar stock.
  const merged = new Map<
    string,
    { quantity: number; unitPrice: number; commissionEligible: boolean }
  >();
  for (const line of cartLines) {
    const current = merged.get(line.productId);
    if (current) {
      current.quantity += line.quantity;
      current.commissionEligible = current.commissionEligible || line.commissionEligible;
    } else {
      merged.set(line.productId, { ...line });
    }
  }

  for (const [productId, line] of merged) {
    const item = itemByProduct.get(productId);
    if (!item || item.quantity < line.quantity) {
      return {
        error: `Solo hay ${item?.quantity ?? 0} unidades disponibles de ${
          item?.product.name ?? "ese producto"
        } en ${location.name}`,
      };
    }
  }

  const receiptLines: ReceiptLine[] = [];
  let total = 0;

  await prisma.$transaction(async (tx) => {
    for (const [productId, line] of merged) {
      const item = itemByProduct.get(productId)!;
      const commissionAmount = line.commissionEligible ? cashier.commissionPerSale : 0;

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { quantity: { decrement: line.quantity } },
      });
      const sale = await tx.sale.create({
        data: {
          allyId: null,
          locationId,
          productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          unitCost: item.unitCost,
          paymentMethod,
          commissionEligible: line.commissionEligible,
          commissionAmount,
          createdByUserId: session.userId,
        },
      });
      await tx.inventoryMovement.create({
        data: {
          inventoryItemId: item.id,
          type: "SALE",
          quantityDelta: -line.quantity,
          note: "Venta directa",
          saleId: sale.id,
          createdByUserId: session.userId,
        },
      });

      receiptLines.push({
        productName: item.product.name,
        size: item.product.size,
        description: item.product.description,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
      });
      total += line.unitPrice * line.quantity;
    }
  });

  revalidatePath("/cajero");
  revalidatePath("/cajero/caja");
  revalidatePath("/cajero/inventario");
  revalidatePath("/admin");
  revalidatePath("/admin/movimientos");
  revalidatePath("/admin/inventario");
  revalidatePath("/admin/ventas");

  return {
    success: `Venta registrada por ${formatUSD(total)}.`,
    receipt: {
      cashierName: cashier.name,
      locationName: location.name,
      paymentMethod: PAYMENT_METHOD_LABEL[paymentMethod] ?? paymentMethod,
      date: new Date().toISOString(),
      lines: receiptLines,
      total,
    },
  };
}

const allyTransferSchema = z.object({
  allyId: z.string().min(1, "Elige el aliado comercial"),
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
});

/**
 * En vez de una venta, entrega mercancía del punto físico principal a un
 * aliado comercial (a consignación) — lo hace el cajero, pero queda
 * registrado con su nombre igual que cualquier otra transferencia.
 */
export async function transferToAllyByCashier(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireCashier();
  const parsed = allyTransferSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { allyId, productId, quantity } = parsed.data;

  const [fromLocation, ally, cashier, product] = await Promise.all([
    prisma.location.findFirst({ where: { type: "STORE" }, orderBy: { name: "asc" } }),
    prisma.ally.findUnique({ where: { id: allyId }, include: { location: true } }),
    prisma.cashier.findUnique({ where: { id: session.cashierId } }),
    prisma.product.findUnique({ where: { id: productId } }),
  ]);
  if (!fromLocation) return { error: "No se encontró el punto físico principal" };
  if (!ally || !ally.location) return { error: "Aliado no encontrado o sin ubicación asignada" };
  if (!cashier) return { error: "Cajero no encontrado" };
  if (!product) return { error: "Producto no encontrado" };

  const fromItem = await prisma.inventoryItem.findUnique({
    where: { productId_locationId: { productId, locationId: fromLocation.id } },
  });
  if (!fromItem || fromItem.quantity < quantity) {
    return {
      error: `Solo hay ${fromItem?.quantity ?? 0} unidades disponibles en ${fromLocation.name}`,
    };
  }

  const unitCost = product.cost;
  const allyLocationId = ally.location.id;

  await prisma.$transaction(async (tx) => {
    await tx.inventoryItem.update({
      where: { id: fromItem.id },
      data: { quantity: { decrement: quantity } },
    });
    await tx.inventoryMovement.create({
      data: {
        inventoryItemId: fromItem.id,
        type: "TRANSFER_OUT",
        quantityDelta: -quantity,
        note: `Entregado a aliado: ${ally.businessName} — registrado por el cajero ${cashier.name}`,
        createdByUserId: session.userId,
      },
    });

    const toItem = await tx.inventoryItem.upsert({
      where: { productId_locationId: { productId, locationId: allyLocationId } },
      update: { quantity: { increment: quantity } },
      create: {
        productId,
        locationId: allyLocationId,
        quantity,
        acquisitionType: "CONSIGNMENT",
        unitCost,
      },
    });
    await tx.inventoryMovement.create({
      data: {
        inventoryItemId: toItem.id,
        type: "TRANSFER_IN",
        quantityDelta: quantity,
        note: `Recibido de ${fromLocation.name} — registrado por el cajero ${cashier.name}`,
        createdByUserId: session.userId,
      },
    });
    await tx.ledgerEntry.create({
      data: {
        allyId: ally.id,
        type: "CONSIGNMENT_CHARGE",
        amount: quantity * unitCost,
        description: `Mercancía a consignación (registrado por el cajero ${cashier.name}): ${product.name} x${quantity}`,
      },
    });
  });

  revalidatePath("/cajero");
  revalidatePath("/cajero/inventario");
  revalidatePath("/admin");
  revalidatePath("/admin/movimientos");
  revalidatePath("/admin/inventario");
  revalidatePath("/admin/aliados");
  revalidatePath(`/admin/aliados/${ally.id}`);
  return {
    success: `Transferidas ${quantity} unidades de ${product.name} a ${ally.businessName}.`,
  };
}

const receiptEmailSchema = z.object({
  to: z.string().email("Correo inválido"),
});

/** Envía el comprobante de una venta recién registrada al correo del cliente. */
export async function sendReceiptEmailAction(
  receiptJson: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireCashier();
  const parsed = receiptEmailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Correo inválido" };
  }

  let receipt: Receipt;
  try {
    receipt = JSON.parse(receiptJson);
  } catch {
    return { error: "No se pudo leer el comprobante" };
  }

  const lines = receipt.lines.map(
    (l) =>
      `${l.productName}${l.size && l.size !== "Única" ? ` — Talla ${l.size}` : ""} x${l.quantity} — ${formatUSD(
        l.unitPrice * l.quantity
      )}`
  );
  const text = [
    "Gracias por tu compra en Wears — Cueroswears.com",
    "",
    `Fecha: ${formatDateTime(new Date(receipt.date))}`,
    `Atendido por: ${receipt.cashierName}`,
    `Ubicación: ${receipt.locationName}`,
    "",
    ...lines,
    "",
    `Total: ${formatUSD(receipt.total)}`,
    `Método de pago: ${receipt.paymentMethod}`,
  ].join("\n");

  const sent = await sendCustomerEmail({
    to: parsed.data.to,
    subject: "Tu comprobante de compra — Wears",
    text,
  });
  if (!sent.ok) {
    return { error: sent.error ?? "No se pudo enviar el correo" };
  }
  return { success: `Comprobante enviado a ${parsed.data.to}` };
}

const reverseSchema = z.object({
  newProductId: z.string().min(1, "Elige el modelo y la talla por el que se hizo el cambio"),
  note: z.string().optional(),
});

/**
 * Reversa una venta por cambio de talla o modelo: devuelve la unidad
 * original al inventario y descuenta el producto nuevo entregado, sin
 * afectar los ingresos (es el mismo pago, solo cambió el producto). El
 * cajero solo puede reversar ventas que él mismo registró.
 */
export async function reverseCashierSaleMovement(
  movementId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireCashier();
  const parsed = reverseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { newProductId, note } = parsed.data;

  const movement = await prisma.inventoryMovement.findUnique({
    where: { id: movementId },
    include: { inventoryItem: { include: { product: true, location: true } } },
  });
  if (!movement || movement.type !== "SALE" || movement.inventoryItem.location.type === "ALLY") {
    return { error: "Ese movimiento no se puede reversar" };
  }
  if (movement.createdByUserId !== session.userId) {
    return { error: "Solo puedes reversar una venta que tú registraste" };
  }
  if (movement.reversedAt) {
    return { error: "Ese movimiento ya fue reversado" };
  }

  const quantity = Math.abs(movement.quantityDelta);
  const locationId = movement.inventoryItem.locationId;

  const newItem = await prisma.inventoryItem.findUnique({
    where: { productId_locationId: { productId: newProductId, locationId } },
    include: { product: true },
  });
  if (!newItem) {
    return { error: "Ese producto no tiene inventario en esta ubicación" };
  }
  if (newItem.quantity < quantity) {
    return {
      error: `Solo hay ${newItem.quantity} unidades disponibles de ${newItem.product.name}`,
    };
  }

  const detail = note ? `: ${note}` : "";

  await prisma.$transaction([
    prisma.inventoryItem.update({
      where: { id: movement.inventoryItemId },
      data: { quantity: { increment: quantity } },
    }),
    prisma.inventoryMovement.create({
      data: {
        inventoryItemId: movement.inventoryItemId,
        type: "ADJUSTMENT",
        quantityDelta: quantity,
        note: `Cambio de talla — regresa ${movement.inventoryItem.product.name}${detail}`,
        createdByUserId: session.userId,
      },
    }),
    prisma.inventoryItem.update({
      where: { id: newItem.id },
      data: { quantity: { decrement: quantity } },
    }),
    prisma.inventoryMovement.create({
      data: {
        inventoryItemId: newItem.id,
        type: "ADJUSTMENT",
        quantityDelta: -quantity,
        note: `Cambio de talla — entrega ${newItem.product.name} (reemplaza ${movement.inventoryItem.product.name})${detail}`,
        createdByUserId: session.userId,
      },
    }),
    prisma.inventoryMovement.update({
      where: { id: movementId },
      data: { reversedAt: new Date() },
    }),
  ]);

  revalidatePath("/cajero");
  revalidatePath("/cajero/inventario");
  revalidatePath("/admin");
  revalidatePath("/admin/movimientos");
  revalidatePath("/admin/inventario");
  return {
    success: `Cambio registrado: ${movement.inventoryItem.product.name} → ${newItem.product.name}.`,
  };
}

/**
 * Cierra caja: junta todas las ventas del cajero que aún no se han
 * reportado, calcula los totales y envía el reporte al correo y WhatsApp
 * del administrador. Se puede repetir en el día — cada cierre solo incluye
 * lo vendido desde el cierre anterior.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- firma requerida por useActionState
export async function closeCashRegister(_prev: FormState): Promise<FormState> {
  const session = await requireCashier();

  const [cashier, pendingSales] = await Promise.all([
    prisma.cashier.findUnique({ where: { id: session.cashierId } }),
    prisma.sale.findMany({
      where: { createdByUserId: session.userId, cashClosingId: null },
      include: { product: true, location: true },
      orderBy: { saleDate: "asc" },
    }),
  ]);
  if (!cashier) return { error: "Cajero no encontrado" };
  if (pendingSales.length === 0) {
    return { error: "No hay ventas nuevas para cerrar." };
  }

  const totalUSD = pendingSales.reduce((s, sale) => s + sale.quantity * sale.unitPrice, 0);
  const commissionTotal = pendingSales.reduce((s, sale) => s + sale.commissionAmount, 0);
  const totalByMethod: Record<string, { total: number; count: number }> = {};
  for (const sale of pendingSales) {
    const key = sale.paymentMethod ?? "EFECTIVO";
    const current = totalByMethod[key] ?? { total: 0, count: 0 };
    current.total += sale.quantity * sale.unitPrice;
    current.count += 1;
    totalByMethod[key] = current;
  }

  const closing = await prisma.$transaction(async (tx) => {
    const created = await tx.cashClosing.create({
      data: {
        cashierUserId: session.userId,
        saleCount: pendingSales.length,
        totalUSD,
        totalByMethod,
        commissionTotal,
      },
    });
    await tx.sale.updateMany({
      where: { id: { in: pendingSales.map((s) => s.id) } },
      data: { cashClosingId: created.id },
    });
    return created;
  });

  const methodLines = Object.entries(totalByMethod).map(
    ([method, v]) =>
      `- ${PAYMENT_METHOD_LABEL[method] ?? method}: ${formatUSD(v.total)} (${v.count} venta${v.count === 1 ? "" : "s"})`
  );
  const detailLines = pendingSales.map(
    (s, i) =>
      `${i + 1}. ${s.product.name} x${s.quantity} — ${formatUSD(s.quantity * s.unitPrice)} — ${
        PAYMENT_METHOD_LABEL[s.paymentMethod ?? "EFECTIVO"]
      } (${s.location.name})`
  );

  const emailMessage = [
    `Cajero: ${cashier.name}`,
    `Cierre: ${formatDateTime(closing.closedAt)}`,
    `Ventas incluidas: ${pendingSales.length}`,
    `Total vendido: ${formatUSD(totalUSD)}`,
    "",
    "Por método de pago:",
    ...methodLines,
    "",
    `Comisión de esta caja: ${formatUSD(commissionTotal)}`,
    "",
    "Detalle:",
    ...detailLines,
  ].join("\n");

  const methodSummary = Object.entries(totalByMethod)
    .map(([method, v]) => `${PAYMENT_METHOD_LABEL[method] ?? method} ${formatUSD(v.total)}`)
    .join(", ");
  const whatsappMessage = `${pendingSales.length} ventas, total ${formatUSD(totalUSD)}, comisión ${formatUSD(
    commissionTotal
  )}. ${methodSummary}`;

  await notifyAdmin({
    event: "cash_closing",
    subject: `Cierre de caja — ${cashier.name} — ${formatDate(closing.closedAt)}`,
    message: emailMessage,
    whatsappMessage,
  });

  revalidatePath("/cajero/caja");
  return {
    success: `Caja cerrada: ${pendingSales.length} ventas por ${formatUSD(totalUSD)}. Se envió el reporte.`,
  };
}
