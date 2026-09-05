"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword, generateTempPassword } from "@/lib/auth";

export type FormState = { error?: string; success?: string };

const allySchema = z.object({
  email: z.string().trim().min(3, "El correo o usuario es obligatorio"),
  password: z.string().trim().optional(),
  businessName: z.string().min(2, "El nombre del negocio es obligatorio"),
  contactName: z.string().min(2, "El nombre de contacto es obligatorio"),
  phone: z.string().optional(),
  city: z.string().optional(),
});

export async function createAlly(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();
  const parsed = allySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;
  const email = data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Ya existe un usuario con ese correo o usuario" };
  }

  const usingCustomPassword = Boolean(data.password);
  const finalPassword = data.password || generateTempPassword();

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(finalPassword),
      role: "ALLY",
      name: data.contactName,
      mustChangePw: !usingCustomPassword,
    },
  });
  const ally = await prisma.ally.create({
    data: {
      userId: user.id,
      businessName: data.businessName,
      contactName: data.contactName,
      phone: data.phone || null,
      city: data.city || null,
    },
  });
  await prisma.location.create({
    data: { name: data.businessName, type: "ALLY", allyId: ally.id },
  });

  revalidatePath("/admin/aliados");
  return {
    success: usingCustomPassword
      ? `Aliado creado. Usuario: ${email} con la contraseña que definiste.`
      : `Aliado creado. Usuario: ${email} · Contraseña temporal: ${finalPassword} (compártela de forma segura, se le pedirá cambiarla).`,
  };
}

const allyDetailsSchema = z.object({
  allyId: z.string().min(1),
  businessName: z.string().min(2, "El nombre del negocio es obligatorio"),
  contactName: z.string().min(2, "El nombre de contacto es obligatorio"),
  phone: z.string().optional(),
  city: z.string().optional(),
});

export async function updateAllyDetails(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();
  const parsed = allyDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { allyId, businessName, contactName, phone, city } = parsed.data;

  await prisma.ally.update({
    where: { id: allyId },
    data: { businessName, contactName, phone: phone || null, city: city || null },
  });
  await prisma.location.updateMany({ where: { allyId }, data: { name: businessName } });

  revalidatePath(`/admin/aliados/${allyId}`);
  revalidatePath("/admin/aliados");
  return { success: "Datos del aliado actualizados" };
}

export async function toggleAllyActive(allyId: string, active: boolean) {
  await requireAdmin();
  await prisma.ally.update({
    where: { id: allyId },
    data: { active, user: { update: { active } } },
  });
  revalidatePath("/admin/aliados");
  revalidatePath(`/admin/aliados/${allyId}`);
}

export async function deleteAlly(allyId: string) {
  await requireAdmin();

  const ally = await prisma.ally.findUnique({
    where: { id: allyId },
    include: { location: true },
  });
  if (!ally) return;

  await prisma.$transaction(async (tx) => {
    if (ally.location) {
      const itemIds = (
        await tx.inventoryItem.findMany({
          where: { locationId: ally.location.id },
          select: { id: true },
        })
      ).map((i) => i.id);
      await tx.inventoryMovement.deleteMany({ where: { inventoryItemId: { in: itemIds } } });
      await tx.inventoryItem.deleteMany({ where: { locationId: ally.location.id } });
    }
    await tx.sale.deleteMany({ where: { allyId } });
    await tx.ledgerEntry.deleteMany({ where: { allyId } });
    await tx.supportRequest.deleteMany({ where: { allyId } });
    if (ally.location) {
      await tx.location.delete({ where: { id: ally.location.id } });
    }
    await tx.ally.delete({ where: { id: allyId } });
    await tx.user.delete({ where: { id: ally.userId } });
  });

  revalidatePath("/admin/aliados");
  redirect("/admin/aliados");
}

const stockBatchSchema = z.object({
  allyId: z.string().min(1),
  acquisitionType: z.enum(["PURCHASE", "CONSIGNMENT"]),
  unitCost: z.coerce.number().min(0),
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
 * Asigna mercancía a un aliado, en un solo envío para varias tallas del
 * mismo modelo a la vez (mismo tipo de adquisición y costo unitario).
 */
export async function assignStockToAlly(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdmin();

  const productIds = formData.getAll("productId").map(String);
  const rawQuantities = formData.getAll("quantity").map(String);
  const items = productIds
    .map((productId, i) => ({ productId, quantity: rawQuantities[i] ?? "" }))
    .filter((it) => it.quantity.trim() !== "" && Number(it.quantity) > 0);

  const parsed = stockBatchSchema.safeParse({
    allyId: formData.get("allyId"),
    acquisitionType: formData.get("acquisitionType"),
    unitCost: formData.get("unitCost"),
    items,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { allyId, acquisitionType, unitCost, items: parsedItems } = parsed.data;

  const location = await prisma.location.findUnique({ where: { allyId } });
  if (!location) return { error: "El aliado no tiene ubicación asignada" };

  const [products, ally] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: parsedItems.map((i) => i.productId) } } }),
    prisma.ally.findUnique({ where: { id: allyId } }),
  ]);
  if (!ally) return { error: "Aliado no encontrado" };
  const productById = new Map(products.map((p) => [p.id, p]));

  await prisma.$transaction(async (tx) => {
    for (const { productId, quantity } of parsedItems) {
      const product = productById.get(productId);
      if (!product) continue;

      const item = await tx.inventoryItem.upsert({
        where: { productId_locationId: { productId, locationId: location.id } },
        update: { quantity: { increment: quantity }, acquisitionType, unitCost },
        create: { productId, locationId: location.id, quantity, acquisitionType, unitCost },
      });

      await tx.inventoryMovement.create({
        data: {
          inventoryItemId: item.id,
          type: "RECEIVE",
          quantityDelta: quantity,
          note:
            acquisitionType === "CONSIGNMENT"
              ? "Recepción a consignación"
              : "Recepción por compra",
          createdByUserId: session.userId,
        },
      });

      if (acquisitionType === "CONSIGNMENT") {
        await tx.ledgerEntry.create({
          data: {
            allyId,
            type: "CONSIGNMENT_CHARGE",
            amount: quantity * unitCost,
            description: `Mercancía a consignación: ${product.name} x${quantity}`,
          },
        });
      }
    }
  });

  const totalUnits = parsedItems.reduce((s, i) => s + i.quantity, 0);
  revalidatePath(`/admin/aliados/${allyId}`);
  revalidatePath("/admin/inventario");
  return {
    success: `Se asignaron ${totalUnits} unidades en ${parsedItems.length} talla${
      parsedItems.length === 1 ? "" : "s"
    } a ${ally.businessName}.`,
  };
}

const ledgerSchema = z.object({
  allyId: z.string().min(1),
  type: z.enum(["PAYMENT", "ADJUSTMENT"]),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  description: z.string().optional(),
});

export async function addLedgerEntry(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();
  const parsed = ledgerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { allyId, type, amount, description } = parsed.data;

  await prisma.ledgerEntry.create({
    data: { allyId, type, amount, description: description || null },
  });

  revalidatePath(`/admin/aliados/${allyId}`);
  return { success: "Movimiento registrado" };
}

export async function resolveSupportRequest(id: string, status: "EN_PROCESO" | "RESUELTO") {
  await requireAdmin();
  await prisma.supportRequest.update({ where: { id }, data: { status } });
  revalidatePath("/admin/soporte");
}
