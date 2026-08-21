"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAlly } from "@/lib/auth";
import { notifyAdmin } from "@/lib/notifications";
import { formatUSD, getStockStatus } from "@/lib/inventory";

export type FormState = { error?: string; success?: string };

const saleSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
  unitPrice: z.coerce.number().min(0).optional(),
  note: z.string().optional(),
});

export async function registerSale(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAlly();
  const parsed = saleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { productId, quantity, note } = parsed.data;

  const location = await prisma.location.findUnique({ where: { allyId: session.allyId } });
  if (!location) return { error: "No se encontró tu ubicación de inventario" };

  const item = await prisma.inventoryItem.findUnique({
    where: { productId_locationId: { productId, locationId: location.id } },
    include: { product: true },
  });
  if (!item) return { error: "No tienes ese producto en tu inventario" };
  if (item.quantity < quantity) {
    return { error: `Solo tienes ${item.quantity} unidades disponibles` };
  }

  const unitPrice = parsed.data.unitPrice ?? item.product.price;

  const [ally] = await prisma.$transaction([
    prisma.ally.findUniqueOrThrow({ where: { id: session.allyId } }),
    prisma.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: { decrement: quantity } },
    }),
    prisma.inventoryMovement.create({
      data: {
        inventoryItemId: item.id,
        type: "SALE",
        quantityDelta: -quantity,
        note: note || null,
        createdByUserId: session.userId,
      },
    }),
    prisma.sale.create({
      data: {
        allyId: session.allyId,
        locationId: location.id,
        productId,
        quantity,
        unitPrice,
        note: note || null,
      },
    }),
  ]);

  const remaining = item.quantity - quantity;
  const status = getStockStatus(remaining, item.product.minStock);

  await notifyAdmin({
    event: "sale_registered",
    subject: `Venta registrada — ${ally.businessName}`,
    message: `${ally.businessName} vendió ${quantity} x ${item.product.name} por ${formatUSD(
      quantity * unitPrice
    )}. Disponible restante: ${remaining} (${status === "AGOTADO" ? "¡AGOTADO, requiere reposición!" : status === "BAJO" ? "stock bajo" : "disponible"}).`,
  });

  revalidatePath("/aliado");
  revalidatePath("/aliado/ventas");
  return { success: `Venta registrada: ${quantity} x ${item.product.name}` };
}
