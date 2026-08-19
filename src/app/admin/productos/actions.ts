"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const productSchema = z.object({
  sku: z.string().min(2, "El SKU es obligatorio"),
  name: z.string().min(2, "El nombre es obligatorio"),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  cost: z.coerce.number().min(0),
  minStock: z.coerce.number().int().min(0),
  imageUrl: z.string().optional(),
  collectionId: z.string().optional(),
});

export type FormState = { error?: string; success?: string };

export async function createProduct(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  try {
    await prisma.product.create({
      data: {
        sku: data.sku.trim(),
        name: data.name.trim(),
        description: data.description || null,
        price: data.price,
        cost: data.cost,
        minStock: data.minStock,
        imageUrl: data.imageUrl || null,
        collectionId: data.collectionId || null,
      },
    });
  } catch {
    return { error: "Ya existe un producto con ese SKU" };
  }

  revalidatePath("/admin/productos");
  return { success: "Producto creado" };
}

export async function toggleProductActive(productId: string, active: boolean) {
  await requireAdmin();
  await prisma.product.update({ where: { id: productId }, data: { active } });
  revalidatePath("/admin/productos");
}

const collectionSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  upcoming: z.coerce.boolean().optional(),
  launchNote: z.string().optional(),
  imageUrl: z.string().optional(),
});

export async function createCollection(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();
  const parsed = collectionSchema.safeParse({
    name: formData.get("name"),
    upcoming: formData.get("upcoming") === "on",
    launchNote: formData.get("launchNote"),
    imageUrl: formData.get("imageUrl"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  try {
    await prisma.collection.create({
      data: {
        name: data.name.trim(),
        upcoming: data.upcoming ?? false,
        launchNote: data.launchNote || null,
        imageUrl: data.imageUrl || null,
      },
    });
  } catch {
    return { error: "Ya existe una colección con ese nombre" };
  }

  revalidatePath("/admin/productos");
  return { success: "Colección creada" };
}
