"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export type FormState = { error?: string; success?: string };

const movementSchema = z.object({
  locationId: z.string().min(1),
  productId: z.string().min(1),
  quantityDelta: z.coerce.number().int().refine((v) => v !== 0, "La cantidad no puede ser 0"),
  note: z.string().optional(),
});

export async function adjustInventory(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdmin();
  const parsed = movementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { locationId, productId, quantityDelta, note } = parsed.data;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { error: "Producto no encontrado" };

  const existing = await prisma.inventoryItem.findUnique({
    where: { productId_locationId: { productId, locationId } },
  });

  if (!existing && quantityDelta < 0) {
    return { error: "No hay existencias de este producto en esa ubicación" };
  }
  if (existing && existing.quantity + quantityDelta < 0) {
    return { error: "La cantidad resultante no puede ser negativa" };
  }

  const item = await prisma.inventoryItem.upsert({
    where: { productId_locationId: { productId, locationId } },
    update: { quantity: { increment: quantityDelta } },
    create: { productId, locationId, quantity: quantityDelta, unitCost: product.cost },
  });

  await prisma.inventoryMovement.create({
    data: {
      inventoryItemId: item.id,
      type: "ADJUSTMENT",
      quantityDelta,
      note: note || null,
      createdByUserId: session.userId,
    },
  });

  revalidatePath("/admin/inventario");
  return { success: "Movimiento de inventario registrado" };
}

const locationSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  type: z.enum(["STORE", "FACTORY", "WEB"]),
  address: z.string().optional(),
});

export async function createLocation(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();
  const parsed = locationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  await prisma.location.create({
    data: { name: data.name.trim(), type: data.type, address: data.address || null },
  });

  revalidatePath("/admin/inventario");
  return { success: "Ubicación creada" };
}
