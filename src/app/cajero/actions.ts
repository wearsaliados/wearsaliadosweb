"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCashier } from "@/lib/auth";
import { formatUSD, formatDate, formatDateTime } from "@/lib/inventory";
import { notifyAdmin } from "@/lib/notifications";

export type FormState = { error?: string; success?: string };

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  BOLIVARES: "Bolívares",
  USDT: "USDT",
  BANESCO_PANAMA: "Banesco Panamá",
};

const saleSchema = z.object({
  locationId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
  unitPrice: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(0).optional()
  ),
  paymentMethod: z.enum(["EFECTIVO", "BOLIVARES", "USDT", "BANESCO_PANAMA"]),
  commissionEligible: z.coerce.boolean().optional(),
  note: z.string().optional(),
});

/** Registra una venta directa hecha por el cajero (tienda en línea o punto físico). */
export async function registerCashierSale(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireCashier();
  const parsed = saleSchema.safeParse({
    ...Object.fromEntries(formData),
    commissionEligible: formData.get("commissionEligible") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { locationId, productId, quantity, unitPrice, paymentMethod, commissionEligible, note } =
    parsed.data;

  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location || (location.type !== "WEB" && location.type !== "STORE")) {
    return { error: "Elige la tienda en línea o un punto físico" };
  }

  const [item, cashier] = await Promise.all([
    prisma.inventoryItem.findUnique({
      where: { productId_locationId: { productId, locationId } },
      include: { product: true },
    }),
    prisma.cashier.findUnique({ where: { id: session.cashierId } }),
  ]);
  if (!item || item.quantity < quantity) {
    return { error: `Solo hay ${item?.quantity ?? 0} unidades disponibles en ${location.name}` };
  }
  if (!cashier) {
    return { error: "Cajero no encontrado" };
  }

  const finalUnitPrice = unitPrice ?? item.product.price;
  const commissionAmount = commissionEligible ? cashier.commissionPerSale : 0;

  await prisma.$transaction(async (tx) => {
    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: { decrement: quantity } },
    });
    const sale = await tx.sale.create({
      data: {
        allyId: null,
        locationId,
        productId,
        quantity,
        unitPrice: finalUnitPrice,
        unitCost: item.unitCost,
        paymentMethod,
        commissionEligible: commissionEligible ?? false,
        commissionAmount,
        createdByUserId: session.userId,
        note: note || null,
      },
    });
    await tx.inventoryMovement.create({
      data: {
        inventoryItemId: item.id,
        type: "SALE",
        quantityDelta: -quantity,
        note: note || "Venta directa",
        saleId: sale.id,
        createdByUserId: session.userId,
      },
    });
  });

  revalidatePath("/cajero");
  revalidatePath("/cajero/caja");
  revalidatePath("/cajero/inventario");
  revalidatePath("/admin");
  revalidatePath("/admin/movimientos");
  revalidatePath("/admin/inventario");
  revalidatePath("/admin/ventas");
  return {
    success: `Venta registrada: ${quantity} x ${item.product.name} en ${location.name}.`,
  };
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
