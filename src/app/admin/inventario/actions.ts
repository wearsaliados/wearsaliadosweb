"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export type FormState = { error?: string; success?: string };

const receiveBatchSchema = z.object({
  locationId: z.string().min(1),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
      })
    )
    .min(1, "Agrega la cantidad de al menos una talla"),
});

/**
 * Registra mercancía nueva que entra a un canal de Wears (p. ej. fábrica),
 * en un solo envío para varias tallas del mismo modelo a la vez.
 */
export async function adjustInventory(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdmin();

  const productIds = formData.getAll("productId").map(String);
  const rawQuantities = formData.getAll("quantity").map(String);
  const items = productIds
    .map((productId, i) => ({ productId, quantity: rawQuantities[i] ?? "" }))
    .filter((it) => it.quantity.trim() !== "" && Number(it.quantity) > 0);

  const parsed = receiveBatchSchema.safeParse({
    locationId: formData.get("locationId"),
    note: formData.get("note"),
    items,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { locationId, note, items: parsedItems } = parsed.data;

  const products = await prisma.product.findMany({
    where: { id: { in: parsedItems.map((i) => i.productId) } },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  await prisma.$transaction(async (tx) => {
    for (const { productId, quantity } of parsedItems) {
      const product = productById.get(productId);
      if (!product) continue;

      const item = await tx.inventoryItem.upsert({
        where: { productId_locationId: { productId, locationId } },
        update: { quantity: { increment: quantity } },
        create: { productId, locationId, quantity, unitCost: product.cost },
      });

      await tx.inventoryMovement.create({
        data: {
          inventoryItemId: item.id,
          type: "RECEIVE",
          quantityDelta: quantity,
          note: note || null,
          createdByUserId: session.userId,
        },
      });
    }
  });

  const totalUnits = parsedItems.reduce((s, i) => s + i.quantity, 0);
  revalidatePath("/admin/inventario");
  return {
    success: `${totalUnits} unidades registradas en ${parsedItems.length} talla${
      parsedItems.length === 1 ? "" : "s"
    }.`,
  };
}

/** Corrige directamente la cantidad de un producto en una ubicación (incluye dejarlo en 0). */
export async function setInventoryQuantity(inventoryItemId: string, formData: FormData) {
  const session = await requireAdmin();
  const quantity = Number(formData.get("quantity"));
  if (!Number.isInteger(quantity) || quantity < 0) return;

  const item = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
  if (!item) return;

  const delta = quantity - item.quantity;
  if (delta === 0) return;

  await prisma.inventoryItem.update({ where: { id: item.id }, data: { quantity } });
  await prisma.inventoryMovement.create({
    data: {
      inventoryItemId: item.id,
      type: "ADJUSTMENT",
      quantityDelta: delta,
      note: "Corrección manual de cantidad",
      createdByUserId: session.userId,
    },
  });

  revalidatePath("/admin/inventario");
}

/** Quita un producto por completo del inventario de una ubicación. */
export async function deleteInventoryItem(inventoryItemId: string) {
  await requireAdmin();
  await prisma.inventoryMovement.deleteMany({ where: { inventoryItemId } });
  await prisma.inventoryItem.delete({ where: { id: inventoryItemId } });
  revalidatePath("/admin/inventario");
}

const transferSchema = z.object({
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
  acquisitionType: z.enum(["PURCHASE", "CONSIGNMENT"]).optional(),
  unitCost: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(0).optional()
  ),
});

/**
 * Transfiere stock de un canal de Wears (normalmente fábrica) a otro canal
 * o a un aliado comercial, dejando registro de origen, destino y motivo.
 */
export async function transferStock(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdmin();
  const parsed = transferSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { fromLocationId, toLocationId, productId, quantity, acquisitionType, unitCost } =
    parsed.data;

  if (fromLocationId === toLocationId) {
    return { error: "El origen y el destino no pueden ser el mismo" };
  }

  const [product, fromLocation, toLocation] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.location.findUnique({ where: { id: fromLocationId } }),
    prisma.location.findUnique({ where: { id: toLocationId }, include: { ally: true } }),
  ]);
  if (!product || !fromLocation || !toLocation) {
    return { error: "Producto o ubicación no encontrados" };
  }

  const fromItem = await prisma.inventoryItem.findUnique({
    where: { productId_locationId: { productId, locationId: fromLocationId } },
  });
  if (!fromItem || fromItem.quantity < quantity) {
    return {
      error: `Solo hay ${fromItem?.quantity ?? 0} unidades disponibles en ${fromLocation.name}`,
    };
  }

  const isAllyDestination = toLocation.type === "ALLY" && toLocation.allyId;
  const destAcquisitionType = isAllyDestination ? acquisitionType ?? "PURCHASE" : "PURCHASE";
  const destUnitCost = unitCost ?? product.cost;

  await prisma.inventoryItem.update({
    where: { id: fromItem.id },
    data: { quantity: { decrement: quantity } },
  });
  await prisma.inventoryMovement.create({
    data: {
      inventoryItemId: fromItem.id,
      type: "TRANSFER_OUT",
      quantityDelta: -quantity,
      note: `Entregado a ${toLocation.ally?.businessName ?? toLocation.name}`,
      createdByUserId: session.userId,
    },
  });

  const toItem = await prisma.inventoryItem.upsert({
    where: { productId_locationId: { productId, locationId: toLocationId } },
    update: {
      quantity: { increment: quantity },
      ...(isAllyDestination ? { acquisitionType: destAcquisitionType, unitCost: destUnitCost } : {}),
    },
    create: {
      productId,
      locationId: toLocationId,
      quantity,
      acquisitionType: destAcquisitionType,
      unitCost: destUnitCost,
    },
  });
  await prisma.inventoryMovement.create({
    data: {
      inventoryItemId: toItem.id,
      type: "TRANSFER_IN",
      quantityDelta: quantity,
      note: `Recibido de ${fromLocation.name}`,
      createdByUserId: session.userId,
    },
  });

  if (isAllyDestination && destAcquisitionType === "CONSIGNMENT" && toLocation.allyId) {
    await prisma.ledgerEntry.create({
      data: {
        allyId: toLocation.allyId,
        type: "CONSIGNMENT_CHARGE",
        amount: quantity * destUnitCost,
        description: `Mercancía a consignación: ${product.name} x${quantity}`,
      },
    });
    revalidatePath(`/admin/aliados/${toLocation.allyId}`);
  }

  revalidatePath("/admin/inventario");
  revalidatePath("/admin/aliados");
  return {
    success: `${quantity} unidades de ${product.name} transferidas de ${fromLocation.name} a ${
      toLocation.ally?.businessName ?? toLocation.name
    }.`,
  };
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
