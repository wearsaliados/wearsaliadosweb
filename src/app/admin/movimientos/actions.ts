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
