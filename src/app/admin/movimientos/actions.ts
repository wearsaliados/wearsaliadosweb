"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export type FormState = { error?: string; success?: string };

const directSaleSchema = z.object({
  locationId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
  unitPrice: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(0).optional()
  ),
  note: z.string().optional(),
});

/** Registra una venta directa de Wears (tienda en línea o punto físico), sin pasar por un aliado. */
export async function registerDirectSale(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();
  const parsed = directSaleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { locationId, productId, quantity, unitPrice, note } = parsed.data;

  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location || (location.type !== "WEB" && location.type !== "STORE")) {
    return { error: "Elige la tienda en línea o un punto físico" };
  }

  const item = await prisma.inventoryItem.findUnique({
    where: { productId_locationId: { productId, locationId } },
    include: { product: true },
  });
  if (!item || item.quantity < quantity) {
    return { error: `Solo hay ${item?.quantity ?? 0} unidades disponibles en ${location.name}` };
  }

  const finalUnitPrice = unitPrice ?? item.product.price;

  await prisma.$transaction([
    prisma.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: { decrement: quantity } },
    }),
    prisma.inventoryMovement.create({
      data: {
        inventoryItemId: item.id,
        type: "SALE",
        quantityDelta: -quantity,
        note: note || "Venta directa",
      },
    }),
    prisma.sale.create({
      data: {
        allyId: null,
        locationId,
        productId,
        quantity,
        unitPrice: finalUnitPrice,
        unitCost: item.unitCost,
        note: note || null,
      },
    }),
  ]);

  revalidatePath("/admin/movimientos");
  revalidatePath("/admin");
  revalidatePath("/admin/inventario");
  revalidatePath("/admin/ventas");
  return {
    success: `Venta registrada: ${quantity} x ${item.product.name} en ${location.name}.`,
  };
}

const GIVEAWAY_REASON_LABEL: Record<string, string> = {
  PUBLICIDAD: "Inversión de publicidad",
  EMBAJADOR: "Entrega a embajador de marca",
};

const giveawaySchema = z.object({
  locationId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
  reason: z.enum(["PUBLICIDAD", "EMBAJADOR"]),
  note: z.string().optional(),
});

/**
 * Registra productos entregados sin venta: inversión de publicidad o
 * regalos a embajadores de marca. Solo descuenta inventario, no genera
 * ingreso ni registro de venta.
 */
export async function registerGiveaway(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();
  const parsed = giveawaySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { locationId, productId, quantity, reason, note } = parsed.data;

  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location || location.type === "ALLY") {
    return { error: "Elige una ubicación propia de Wears" };
  }

  const item = await prisma.inventoryItem.findUnique({
    where: { productId_locationId: { productId, locationId } },
    include: { product: true },
  });
  if (!item || item.quantity < quantity) {
    return { error: `Solo hay ${item?.quantity ?? 0} unidades disponibles en ${location.name}` };
  }

  const reasonLabel = GIVEAWAY_REASON_LABEL[reason];
  const fullNote = note ? `${reasonLabel} — ${note}` : reasonLabel;

  await prisma.$transaction([
    prisma.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: { decrement: quantity } },
    }),
    prisma.inventoryMovement.create({
      data: {
        inventoryItemId: item.id,
        type: "ADJUSTMENT",
        quantityDelta: -quantity,
        note: fullNote,
      },
    }),
  ]);

  revalidatePath("/admin/movimientos");
  revalidatePath("/admin");
  revalidatePath("/admin/inventario");
  return {
    success: `Registrado: ${quantity} x ${item.product.name} — ${reasonLabel}.`,
  };
}

const REVERSE_REASON_LABEL: Record<string, string> = {
  CAMBIO: "Cambio de talla",
  DISGUSTO: "Disgusto del cliente",
  ERROR_FABRICACION: "Error de fabricación",
};

const reverseSaleSchema = z.object({
  reason: z.enum(["CAMBIO", "DISGUSTO", "ERROR_FABRICACION"]),
  note: z.string().optional(),
});

/**
 * Reversa una venta directa registrada por error o devuelta (cambio de
 * talla, disgusto del cliente, error de fabricación): devuelve la unidad
 * al inventario y deja un nuevo movimiento visible en el historial. La
 * venta original no se borra, solo queda marcada como reversada.
 */
export async function reverseSaleMovement(
  movementId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();
  const parsed = reverseSaleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { reason, note } = parsed.data;

  const movement = await prisma.inventoryMovement.findUnique({
    where: { id: movementId },
    include: { inventoryItem: { include: { product: true, location: true } } },
  });
  if (!movement || movement.type !== "SALE" || movement.inventoryItem.location.type === "ALLY") {
    return { error: "Ese movimiento no se puede reversar" };
  }
  if (movement.reversedAt) {
    return { error: "Ese movimiento ya fue reversado" };
  }

  const quantity = Math.abs(movement.quantityDelta);
  const reasonLabel = REVERSE_REASON_LABEL[reason];
  const fullNote = note
    ? `Reversa de venta — ${reasonLabel}: ${note}`
    : `Reversa de venta — ${reasonLabel}`;

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
        note: fullNote,
      },
    }),
    prisma.inventoryMovement.update({
      where: { id: movementId },
      data: { reversedAt: new Date() },
    }),
  ]);

  revalidatePath("/admin/movimientos");
  revalidatePath("/admin");
  revalidatePath("/admin/inventario");
  return {
    success: `Reversado: ${quantity} x ${movement.inventoryItem.product.name} — ${reasonLabel}.`,
  };
}
