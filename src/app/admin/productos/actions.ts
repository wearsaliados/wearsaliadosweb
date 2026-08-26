"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const NEW_COLLECTION_VALUE = "__new__";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Sube la imagen de portada de una colección a Vercel Blob si el admin
 * adjuntó un archivo nuevo. Devuelve undefined si no se adjuntó nada
 * (para no tocar la imagen existente), o la URL pública subida.
 */
async function uploadCollectionImage(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const file = formData.get("imageFile");
  if (!(file instanceof File) || file.size === 0) return {};
  if (!file.type.startsWith("image/")) {
    return { error: "El archivo debe ser una imagen" };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "La imagen no puede pesar más de 5 MB" };
  }
  const blob = await put(`collections/${Date.now()}-${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });
  return { url: blob.url };
}

const productSchema = z.object({
  sku: z.string().min(2, "El SKU es obligatorio"),
  barcode: z.string().optional(),
  name: z.string().min(2, "El nombre es obligatorio"),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  cost: z.coerce.number().min(0),
  manufacturingCost: z.coerce.number().min(0).optional(),
  minStock: z.coerce.number().int().min(0),
  imageUrl: z.string().optional(),
  collectionId: z.string().optional(),
  newCollectionName: z.string().optional(),
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

  let collectionId = data.collectionId || null;
  if (collectionId === NEW_COLLECTION_VALUE) {
    const newName = data.newCollectionName?.trim();
    if (!newName) {
      return { error: "Escribe el nombre de la nueva colección" };
    }
    const collection = await prisma.collection.upsert({
      where: { name: newName },
      update: {},
      create: { name: newName },
    });
    collectionId = collection.id;
  }

  try {
    await prisma.product.create({
      data: {
        sku: data.sku.trim(),
        barcode: data.barcode?.trim() || null,
        name: data.name.trim(),
        description: data.description || null,
        price: data.price,
        cost: data.cost,
        manufacturingCost: data.manufacturingCost ?? 0,
        minStock: data.minStock,
        imageUrl: data.imageUrl || null,
        collectionId,
      },
    });
  } catch {
    return { error: "Ya existe un producto con ese SKU o código de barras" };
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
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  const uploaded = await uploadCollectionImage(formData);
  if (uploaded.error) return { error: uploaded.error };

  try {
    await prisma.collection.create({
      data: {
        name: data.name.trim(),
        upcoming: data.upcoming ?? false,
        launchNote: data.launchNote || null,
        imageUrl: uploaded.url ?? null,
      },
    });
  } catch {
    return { error: "Ya existe una colección con ese nombre" };
  }

  revalidatePath("/admin/productos");
  return { success: "Colección creada" };
}

const updateCollectionSchema = z.object({
  upcoming: z.coerce.boolean().optional(),
  visibleToAllies: z.coerce.boolean().optional(),
  removeImage: z.coerce.boolean().optional(),
});

export async function updateCollectionFlags(
  collectionId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();
  const parsed = updateCollectionSchema.safeParse({
    upcoming: formData.get("upcoming") === "on",
    visibleToAllies: formData.get("visibleToAllies") === "on",
    removeImage: formData.get("removeImage") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  const uploaded = await uploadCollectionImage(formData);
  if (uploaded.error) return { error: uploaded.error };

  await prisma.collection.update({
    where: { id: collectionId },
    data: {
      upcoming: data.upcoming ?? false,
      visibleToAllies: data.visibleToAllies ?? false,
      ...(uploaded.url ? { imageUrl: uploaded.url } : data.removeImage ? { imageUrl: null } : {}),
    },
  });

  revalidatePath("/admin/productos");
  revalidatePath("/aliado");
  revalidatePath("/aliado/colecciones");
  revalidatePath("/aliado/ventas");
  return { success: "Colección actualizada" };
}

const barcodeSchema = z.object({
  barcode: z.string().optional(),
});

export async function updateProductBarcode(
  productId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();
  const parsed = barcodeSchema.safeParse({ barcode: formData.get("barcode") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const barcode = parsed.data.barcode?.trim() || null;

  try {
    await prisma.product.update({ where: { id: productId }, data: { barcode } });
  } catch {
    return { error: "Ese código de barras ya está en uso por otro producto" };
  }

  revalidatePath("/admin/productos");
  return { success: "Código de barras actualizado" };
}
