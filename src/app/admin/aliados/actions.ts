"use server";

import { revalidatePath } from "next/cache";
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

const stockSchema = z.object({
  allyId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
  acquisitionType: z.enum(["PURCHASE", "CONSIGNMENT"]),
  unitCost: z.coerce.number().min(0),
});

export async function assignStockToAlly(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdmin();
  const parsed = stockSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { allyId, productId, quantity, acquisitionType, unitCost } = parsed.data;

  const location = await prisma.location.findUnique({ where: { allyId } });
  if (!location) return { error: "El aliado no tiene ubicación asignada" };

  const [product, ally] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.ally.findUnique({ where: { id: allyId } }),
  ]);
  if (!product || !ally) return { error: "Producto o aliado no encontrado" };

  const item = await prisma.inventoryItem.upsert({
    where: { productId_locationId: { productId, locationId: location.id } },
    update: { quantity: { increment: quantity }, acquisitionType, unitCost },
    create: { productId, locationId: location.id, quantity, acquisitionType, unitCost },
  });

  await prisma.inventoryMovement.create({
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
    await prisma.ledgerEntry.create({
      data: {
        allyId,
        type: "CONSIGNMENT_CHARGE",
        amount: quantity * unitCost,
        description: `Mercancía a consignación: ${product.name} x${quantity}`,
      },
    });
  }

  revalidatePath(`/admin/aliados/${allyId}`);
  revalidatePath("/admin/inventario");
  return { success: `Se asignaron ${quantity} unidades de ${product.name} a ${ally.businessName}.` };
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
