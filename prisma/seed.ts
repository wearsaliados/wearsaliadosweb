import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const rawUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url: rawUrl.replace(/^file:/, "") });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@cueroswears.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Wears2026!";

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: "ADMIN",
      name: "Administrador Wears",
      mustChangePw: false,
    },
  });
  console.log(`Admin listo: ${adminUser.email} / contraseña: ${adminPassword}`);

  const web = await prisma.location.upsert({
    where: { id: "loc-web" },
    update: {},
    create: { id: "loc-web", name: "Tienda en línea (Cueroswears.com)", type: "WEB" },
  });
  const store = await prisma.location.upsert({
    where: { id: "loc-store-1" },
    update: {},
    create: { id: "loc-store-1", name: "Punto físico principal", type: "STORE", address: "Sede principal" },
  });
  const factory = await prisma.location.upsert({
    where: { id: "loc-factory" },
    update: {},
    create: { id: "loc-factory", name: "Fábrica (lista para reposición)", type: "FACTORY" },
  });

  const clasica = await prisma.collection.upsert({
    where: { name: "Clásica Cuero" },
    update: {},
    create: { name: "Clásica Cuero" },
  });
  const urbana = await prisma.collection.upsert({
    where: { name: "Urbana Wears" },
    update: {},
    create: { name: "Urbana Wears" },
  });
  const proxColeccion = await prisma.collection.upsert({
    where: { name: "El Barco Wears — Próxima Colección" },
    update: {},
    create: {
      name: "El Barco Wears — Próxima Colección",
      upcoming: true,
      launchNote: "Lanzamiento próximamente. ¡Prepara tu vitrina!",
    },
  });

  const products = await Promise.all(
    [
      { sku: "WR-BOT-001", name: "Botín cuero clásico", price: 320000, cost: 160000, minStock: 3, collectionId: clasica.id },
      { sku: "WR-BOT-002", name: "Bota alta urbana", price: 380000, cost: 190000, minStock: 3, collectionId: urbana.id },
      { sku: "WR-BOL-001", name: "Bolso cuero mediano", price: 260000, cost: 120000, minStock: 4, collectionId: clasica.id },
      { sku: "WR-CIN-001", name: "Cinturón cuero premium", price: 120000, cost: 55000, minStock: 5, collectionId: clasica.id },
      { sku: "WR-MOR-001", name: "Morral urbano", price: 340000, cost: 170000, minStock: 3, collectionId: urbana.id },
      {
        sku: "WR-PROX-001",
        name: "Chaqueta cuero edición limitada",
        price: 480000,
        cost: 230000,
        minStock: 2,
        collectionId: proxColeccion.id,
      },
    ].map((p) =>
      prisma.product.upsert({ where: { sku: p.sku }, update: {}, create: p })
    )
  );

  await Promise.all(
    products.map((p, i) =>
      prisma.inventoryItem.upsert({
        where: { productId_locationId: { productId: p.id, locationId: web.id } },
        update: {},
        create: { productId: p.id, locationId: web.id, quantity: 8 + i, unitCost: p.cost },
      })
    )
  );
  await Promise.all(
    products.map((p, i) =>
      prisma.inventoryItem.upsert({
        where: { productId_locationId: { productId: p.id, locationId: store.id } },
        update: {},
        create: { productId: p.id, locationId: store.id, quantity: 5 + i, unitCost: p.cost },
      })
    )
  );
  await Promise.all(
    products.map((p, i) =>
      prisma.inventoryItem.upsert({
        where: { productId_locationId: { productId: p.id, locationId: factory.id } },
        update: {},
        create: { productId: p.id, locationId: factory.id, quantity: 25 + i * 3, unitCost: p.cost },
      })
    )
  );

  async function ensureAlly(opts: {
    email: string;
    password: string;
    businessName: string;
    contactName: string;
    phone: string;
    city: string;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: opts.email } });
    if (existing) return prisma.ally.findUniqueOrThrow({ where: { userId: existing.id } });

    const user = await prisma.user.create({
      data: {
        email: opts.email,
        passwordHash: await bcrypt.hash(opts.password, 10),
        role: "ALLY",
        name: opts.contactName,
      },
    });
    const ally = await prisma.ally.create({
      data: {
        userId: user.id,
        businessName: opts.businessName,
        contactName: opts.contactName,
        phone: opts.phone,
        city: opts.city,
      },
    });
    await prisma.location.create({
      data: { name: opts.businessName, type: "ALLY", allyId: ally.id },
    });
    console.log(`Aliado creado: ${opts.email} / contraseña: ${opts.password}`);
    return ally;
  }

  const ally1 = await ensureAlly({
    email: "aliado1@cueroswears.com",
    password: "Aliado2026!",
    businessName: "Boutique El Puerto",
    contactName: "María Gómez",
    phone: "3001234567",
    city: "Cartagena",
  });
  const ally2 = await ensureAlly({
    email: "aliado2@cueroswears.com",
    password: "Aliado2026!",
    businessName: "Estilo Urbano Store",
    contactName: "Carlos Pérez",
    phone: "3007654321",
    city: "Bogotá",
  });

  const loc1 = await prisma.location.findUniqueOrThrow({ where: { allyId: ally1.id } });
  const loc2 = await prisma.location.findUniqueOrThrow({ where: { allyId: ally2.id } });

  // Aliado 1: mercancía comprada
  for (const [i, p] of products.slice(0, 3).entries()) {
    await prisma.inventoryItem.upsert({
      where: { productId_locationId: { productId: p.id, locationId: loc1.id } },
      update: {},
      create: {
        productId: p.id,
        locationId: loc1.id,
        quantity: i === 0 ? 1 : 4,
        acquisitionType: "PURCHASE",
        unitCost: p.cost,
      },
    });
  }

  // Aliado 2: mercancía a consignación (genera deuda)
  for (const p of products.slice(2, 5)) {
    await prisma.inventoryItem.upsert({
      where: { productId_locationId: { productId: p.id, locationId: loc2.id } },
      update: {},
      create: {
        productId: p.id,
        locationId: loc2.id,
        quantity: 3,
        acquisitionType: "CONSIGNMENT",
        unitCost: p.cost,
      },
    });
    await prisma.ledgerEntry.create({
      data: {
        allyId: ally2.id,
        type: "CONSIGNMENT_CHARGE",
        amount: p.cost * 3,
        description: `Mercancía a consignación: ${p.name} x3`,
      },
    });
  }

  console.log("Seed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
